// Auction write commands. Every command: (optional) idempotency claim -> lock the auction row -> decide on the DB clock
// -> write state/history/audit/outbox -> commit. Nothing external is called inside the transaction.
import { and, eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { auctions, bids, bidderMaxima, orders, users, auctionCommandAudit, descriptionLogs } from "../db/schema.js";
import { AppError } from "../utils/errors.js";
import { fromDb, toStr, formatVnd, parseMoney, MoneyError } from "../domain/money.js";
import { decideBid, recompute, BidRejection, minimumNextBid, extendedEndTime } from "../domain/bidding.js";
import { checkBidderEligibility, buyNowAvailable } from "../domain/eligibility.js";
import { runIdempotent } from "./idempotency.js";
import { enqueue } from "./outbox.js";
import { recordAdminAction } from "./adminAudit.js";
import { paymentDueAt, need } from "../domain/orderTransitions.js";
import { sanitizeRichText } from "../utils/sanitize.js";

// Decision time comes from the DB clock AFTER the lock was acquired. "ended" is evaluated in SQL on the same instant,
// so sub-millisecond precision is never lost to JS Date rounding.
async function dbClock(tx, auctionId) {
  const [row] = await tx.execute(sql`WITH c AS (SELECT clock_timestamp() AS now)
    SELECT c.now AS now, c.now >= a.end_time AS ended FROM c, auctions a WHERE a.auction_id = ${auctionId}`);
  return { now: new Date(row.now), ended: row.ended };
}

/** The auction row, locked for the rest of the transaction (all bid/Buy Now/moderation/settlement commands share this lock). */
async function lockAuction(tx, auctionId) {
  const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId)).for("update");
  if (!auction) throw new AppError(404, "NOT_FOUND", "Auction not found");
  return auction;
}

const requireOpen = (auction, clock) => {
  if (auction.status !== "active") throw new AppError(409, "AUCTION_NOT_ACTIVE", "Auction is not active");
  if (clock.ended) throw new AppError(409, "AUCTION_ENDED", "Auction has ended");
};

async function loadActor(tx, userId) {
  const [user] = await tx.select().from(users).where(eq(users.id, userId));
  return user;
}

const audit = (tx, row) => tx.insert(auctionCommandAudit).values(row);

/** Public event payload (D9.1). Who leads/won goes in the private payload for internal consumers only. */
const snapshot = (a, now) => ({
  auctionId: a.id, version: a.version, status: a.status, currentPrice: toStr(fromDb(a.currentPrice)), bidCount: a.bidCount,
  endTime: a.endTime, serverTime: now,
});

export const commands = {
  /**
   * Place a proxy bid. `amount` is the bidder's private maximum.
   * Returns { status, body, replayed }, ready to be sent as the HTTP response.
   */
  async placeBid({ auctionId, actor, amount, key }) {
    let money;
    try { money = parseMoney(amount); } catch (e) { if (e instanceof MoneyError) throw new AppError(400, "VALIDATION_ERROR", e.message); throw e; }

    return db.transaction((tx) => runIdempotent(tx, { actorId: actor.id, operation: `bid:${auctionId}`, key, payload: { amount: money.toString() } }, async () => {
      const auction = await lockAuction(tx, auctionId);
      const clock = await dbClock(tx, auctionId);
      const now = clock.now;
      requireOpen(auction, clock);

      const user = await loadActor(tx, actor.id);
      const maximaRows = await tx.select().from(bidderMaxima).where(eq(bidderMaxima.auctionId, auctionId));
      const disqualified = maximaRows.some((m) => m.bidderId === actor.id && m.disqualifiedAt);
      const denied = checkBidderEligibility(user, auction, { disqualified });
      if (denied) throw new AppError(denied.status, denied.code, denied.message);

      // Legacy auction with bids that has not been converted to maxima: refuse until the backfill report is resolved.
      if (auction.commandSequence === 0 && auction.bidCount > 0) {
        throw new AppError(409, "LEGACY_UNVERIFIED", "This auction's bid history is awaiting migration; bidding is temporarily unavailable");
      }

      const state = {
        startingPrice: fromDb(auction.startingPrice), step: fromDb(auction.stepPrice), currentPrice: fromDb(auction.currentPrice),
        maxima: maximaRows.filter((m) => !m.disqualifiedAt).map((m) => ({ bidderId: m.bidderId, max: fromDb(m.maxAmount), priority: m.prioritySequence })),
      };
      const sequence = auction.commandSequence + 1;
      let result;
      try {
        result = decideBid(state, { bidderId: actor.id, amount: money, sequence });
      } catch (e) {
        if (e instanceof BidRejection) {
          const status = e.code === "INVARIANT_VIOLATION" ? 409 : 400;
          throw new AppError(status, e.code, e.minimum !== undefined ? `${e.message} (${formatVnd(e.minimum)})` : e.message, e.minimum !== undefined ? { minimumNextBid: toStr(e.minimum) } : undefined);
        }
        throw e;
      }

      // write: ceiling (private), public history, auction state, audit, outbox
      await tx.insert(bidderMaxima)
        .values({ auctionId, bidderId: actor.id, maxAmount: toStr(result.ownMax), prioritySequence: sequence })
        .onConflictDoUpdate({ target: [bidderMaxima.auctionId, bidderMaxima.bidderId], set: { maxAmount: toStr(result.ownMax), prioritySequence: sequence, updatedAt: now } });

      const publicChange = result.events.length > 0;
      let bidCount = auction.bidCount;
      for (const ev of result.events) {
        bidCount += 1;
        await tx.insert(bids).values({ auctionId, bidderId: ev.bidderId, amount: toStr(ev.amount), bidTime: now, auctionSequence: sequence, type: ev.type });
      }
      const endTime = extendedEndTime({ endTime: auction.endTime, autoExtend: auction.autoExtend, now, producedPublicEvent: publicChange });
      const version = publicChange ? auction.version + 1 : auction.version;
      const [updated] = await tx.update(auctions).set({
        currentPrice: toStr(result.currentPrice), winnerId: result.leaderId, bidCount, endTime, version, commandSequence: sequence,
      }).where(eq(auctions.id, auctionId)).returning();

      await audit(tx, {
        commandId: key || `bid-${auctionId}-${sequence}`, auctionId, actorId: actor.id, sequence,
        kind: result.outcome === "updated" ? "raise_max" : "bid", decision: result.outcome,
        privatePayload: { maximum: money.toString() }, versionBefore: auction.version, versionAfter: version,
      });
      if (publicChange) {
        await enqueue(tx, { aggregateType: "auction", aggregateId: auctionId, aggregateVersion: version, eventType: "auction.bid_placed", publicPayload: snapshot(updated, now),
          privatePayload: { sellerId: auction.sellerId, leaderId: result.leaderId, previousLeaderId: auction.winnerId ?? null } });
      }

      const messages = { success: "You are the highest bidder!", updated: "Your maximum bid has been updated.", outbid: "A higher maximum was already in place: you have been outbid." };
      const next = minimumNextBid({ startingPrice: state.startingPrice, currentPrice: result.currentPrice, step: state.step }, true);
      return {
        status: 200,
        resourceId: String(auctionId),
        body: {
          status: result.outcome, outcome: result.outcome, message: messages[result.outcome],
          isLeading: result.leaderId === actor.id, yourMaximum: toStr(result.ownMax),
          currentPrice: toStr(result.currentPrice), minimumNextBid: toStr(next),
          version, endTime, bidCount, serverTime: now,
        },
      };
    }));
  },

  /** Buy Now: end the auction at buyNowPrice and create the single order, atomically. */
  async buyNow({ auctionId, actor, key }) {
    return db.transaction((tx) => runIdempotent(tx, { actorId: actor.id, operation: `buy-now:${auctionId}`, key, payload: {} }, async () => {
      const auction = await lockAuction(tx, auctionId);
      const clock = await dbClock(tx, auctionId);
      const now = clock.now;
      requireOpen(auction, clock);

      const user = await loadActor(tx, actor.id);
      const [mine] = await tx.select().from(bidderMaxima).where(and(eq(bidderMaxima.auctionId, auctionId), eq(bidderMaxima.bidderId, actor.id)));
      const denied = checkBidderEligibility(user, auction, { disqualified: Boolean(mine?.disqualifiedAt) });
      if (denied) throw new AppError(denied.status, denied.code, denied.message);

      if (auction.buyNowPrice === null) throw new AppError(409, "BUY_NOW_UNAVAILABLE", "This auction does not have a Buy Now option");
      if (!buyNowAvailable(auction, now)) throw new AppError(409, "BUY_NOW_UNAVAILABLE", "Buy Now is no longer available: the current price has reached the Buy Now price");

      const sequence = auction.commandSequence + 1;
      const version = auction.version + 1;
      const price = auction.buyNowPrice;

      await tx.insert(bids).values({ auctionId, bidderId: actor.id, amount: price, bidTime: now, auctionSequence: sequence, type: "buy_now" });
      const [updated] = await tx.update(auctions).set({
        status: "ended", currentPrice: price, winnerId: actor.id, endTime: now, settledAt: now, closeReason: "buy_now",
        bidCount: auction.bidCount + 1, version, commandSequence: sequence,
      }).where(eq(auctions.id, auctionId)).returning();

      // UNIQUE(auction_id) on orders is the last line of defence; a conflict here aborts the whole command.
      const [order] = await tx.insert(orders).values({
        auctionId, buyerId: actor.id, sellerId: auction.sellerId, finalPrice: price, status: "pending_payment", paymentDueAt: paymentDueAt(now), createdAt: now, updatedAt: now,
      }).returning({ id: orders.id });

      await audit(tx, {
        commandId: key || `buy-now-${auctionId}-${sequence}`, auctionId, actorId: actor.id, sequence, kind: "buy_now", decision: "success",
        privatePayload: { orderId: order.id }, versionBefore: auction.version, versionAfter: version,
      });
      await enqueue(tx, { aggregateType: "auction", aggregateId: auctionId, aggregateVersion: version, eventType: "auction.ended", publicPayload: { ...snapshot(updated, now), closeReason: "buy_now" },
        privatePayload: { sellerId: auction.sellerId, winnerId: actor.id, orderId: order.id } });

      return {
        status: 200,
        resourceId: String(order.id),
        body: {
          status: "success", outcome: "success", message: "Purchase successful! Redirecting to payment...",
          orderId: order.id, auctionId, finalPrice: toStr(fromDb(price)), version, serverTime: now,
        },
      };
    }));
  },
  /**
   * Seller disqualifies the bidder behind `bidId` (B11): the history is kept (their rows are flagged), their ceiling stops
   * counting, leader and price are recomputed from the remaining ceilings under the same lock, and they cannot bid again.
   * Retrying is a no-op: nothing is decremented twice.
   */
  async rejectBidder({ auctionId, bidId, actor, reason }) {
    return db.transaction(async (tx) => {
      const auction = await lockAuction(tx, auctionId);
      if (auction.sellerId !== actor.id) throw new AppError(403, "FORBIDDEN", "Only the seller can reject bids");
      if (auction.status !== "active") throw new AppError(409, "AUCTION_NOT_ACTIVE", "Cannot reject bids on finished auctions");
      if (auction.commandSequence === 0 && auction.bidCount > 0) {
        throw new AppError(409, "LEGACY_UNVERIFIED", "This auction's bid history is awaiting migration");
      }
      const [bid] = await tx.select().from(bids).where(and(eq(bids.id, bidId), eq(bids.auctionId, auctionId)));
      if (!bid) throw new AppError(404, "NOT_FOUND", "Bid not found");

      const clock = await dbClock(tx, auctionId);
      const maximaRows = await tx.select().from(bidderMaxima).where(eq(bidderMaxima.auctionId, auctionId));
      const target = maximaRows.find((m) => m.bidderId === bid.bidderId);
      const current = { currentPrice: toStr(fromDb(auction.currentPrice)), winnerId: auction.winnerId ?? null, version: auction.version };
      if (!target || target.disqualifiedAt) {
        return { message: "Bid rejected successfully", bidId, alreadyRejected: true, ...current };
      }

      const sequence = auction.commandSequence + 1;
      await tx.update(bidderMaxima).set({ disqualifiedAt: clock.now, disqualifiedReason: reason ?? null })
        .where(and(eq(bidderMaxima.auctionId, auctionId), eq(bidderMaxima.bidderId, bid.bidderId)));
      await tx.update(bids).set({ invalidatedAt: clock.now })
        .where(and(eq(bids.auctionId, auctionId), eq(bids.bidderId, bid.bidderId), sql`${bids.invalidatedAt} IS NULL`));

      const remaining = maximaRows.filter((m) => m.bidderId !== bid.bidderId && !m.disqualifiedAt)
        .map((m) => ({ bidderId: m.bidderId, max: fromDb(m.maxAmount), priority: m.prioritySequence }));
      const next = recompute({ startingPrice: fromDb(auction.startingPrice), step: fromDb(auction.stepPrice), maxima: remaining });

      // A moderation correction (not a new bid): keeps the "latest public event" in step with the recomputed state.
      if (next.leaderId !== null) {
        await tx.insert(bids).values({ auctionId, bidderId: next.leaderId, amount: toStr(next.currentPrice), bidTime: clock.now, auctionSequence: sequence, type: "adjust" });
      }
      const version = auction.version + 1;
      await tx.update(auctions).set({ winnerId: next.leaderId, currentPrice: toStr(next.currentPrice), version, commandSequence: sequence })
        .where(eq(auctions.id, auctionId));

      await audit(tx, {
        commandId: `reject-${auctionId}-${sequence}`, auctionId, actorId: actor.id, sequence, kind: "disqualify", decision: "success",
        privatePayload: { bidId, bidderId: bid.bidderId, reason: reason ?? null, leaderBefore: auction.winnerId, leaderAfter: next.leaderId }, versionBefore: auction.version, versionAfter: version,
      });
      await enqueue(tx, { aggregateType: "auction", aggregateId: auctionId, aggregateVersion: version, eventType: "auction.bid_rejected",
        publicPayload: { auctionId, version, status: auction.status, currentPrice: toStr(next.currentPrice), bidCount: auction.bidCount, endTime: auction.endTime, serverTime: clock.now },
        privatePayload: { sellerId: auction.sellerId, bidderId: bid.bidderId, leaderId: next.leaderId, previousLeaderId: auction.winnerId ?? null } });

      return { message: "Bid rejected successfully", bidId, alreadyRejected: false, currentPrice: toStr(next.currentPrice), winnerId: next.leaderId, version };
    });
  },

  /** Seller edits that do not touch economics. Title/category only while nobody has bid; description is append-safe (history kept). */
  async updateListing({ auctionId, actor, fields }) {
    return db.transaction(async (tx) => {
      const auction = await lockAuction(tx, auctionId);
      if (auction.sellerId !== actor.id) throw new AppError(403, "FORBIDDEN", "Unauthorized to update this auction");
      if (auction.status !== "active") throw new AppError(409, "AUCTION_NOT_ACTIVE", "Only active auctions can be edited");
      if ((fields.title !== undefined || fields.categoryId !== undefined) && auction.bidCount > 0) {
        throw new AppError(409, "LISTING_LOCKED", "Title and category cannot change after bidding has started");
      }
      const set = {};
      if (fields.title !== undefined) set.title = fields.title;
      if (fields.categoryId !== undefined) set.categoryId = fields.categoryId;
      if (fields.description !== undefined) {
        if (auction.description) await tx.insert(descriptionLogs).values({ auctionId, contentSnapshot: auction.description });
        set.description = sanitizeRichText(fields.description);
      }
      await tx.update(auctions).set({ ...set, version: auction.version + 1 }).where(eq(auctions.id, auctionId));
      return { auctionId, version: auction.version + 1 };
    });
  },

  /** Cancel instead of delete: history, bids and any order are preserved; the lot stops being biddable. Seller (owner) or admin. */
  /** Cancel an active listing (owner or admin). Pass `outerTx` to join a larger transaction (report resolution). */
  async cancelListing({ auctionId, actor, reason }, outerTx = null) {
    const run = async (tx) => {
      const auction = await lockAuction(tx, auctionId);
      if (actor.role !== "admin" && auction.sellerId !== actor.id) throw new AppError(403, "FORBIDDEN", "Unauthorized");
      if (auction.status !== "active") throw new AppError(409, "AUCTION_NOT_ACTIVE", "Only active auctions can be cancelled");
      if (actor.role === "admin" && auction.sellerId !== actor.id) reason = need(reason, "reason"); // moderation is always explained
      const clock = await dbClock(tx, auctionId);
      const sequence = auction.commandSequence + 1;
      const version = auction.version + 1;
      await tx.update(auctions).set({ status: "cancelled", winnerId: null, closeReason: "cancelled", settledAt: clock.now, version, commandSequence: sequence })
        .where(eq(auctions.id, auctionId));
      await audit(tx, {
        commandId: `cancel-${auctionId}-${sequence}`, auctionId, actorId: actor.id, sequence, kind: "cancel", decision: "success",
        privatePayload: { reason: reason ?? null, bidCount: auction.bidCount }, versionBefore: auction.version, versionAfter: version,
      });
      await enqueue(tx, { aggregateType: "auction", aggregateId: auctionId, aggregateVersion: version, eventType: "auction.cancelled",
        publicPayload: { auctionId, version, status: "cancelled", currentPrice: toStr(fromDb(auction.currentPrice)), bidCount: auction.bidCount, endTime: auction.endTime, serverTime: clock.now },
        privatePayload: { sellerId: auction.sellerId, leaderId: auction.winnerId ?? null } });
      if (actor.role === "admin") {
        await recordAdminAction(tx, { actor, action: "listing.cancel", targetType: "listing", targetId: auctionId, reason, before: auction, after: { ...auction, status: "cancelled" } });
      }
      return { message: "Auction cancelled", auctionId, version };
    };
    return outerTx ? run(outerTx) : db.transaction(run);
  },
};
