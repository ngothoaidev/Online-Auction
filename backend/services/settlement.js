// Automatic settlement (B07/B12, design D5.1). Runs from the worker, never from a GET.
// Same lock + clock discipline as the interactive commands: one short transaction per auction.
import { and, eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { auctions, bids, bidderMaxima, orders, users, auctionCommandAudit } from "../db/schema.js";
import { fromDb, toStr } from "../domain/money.js";
import { recompute } from "../domain/bidding.js";
import { enqueue } from "./outbox.js";
import { paymentDueAt } from "../domain/orderTransitions.js";

/**
 * Settle one auction inside `tx` if (and only if) it is still active and its deadline has passed on the DB clock.
 * `lock` selects how the row is claimed: "wait" (normal) or "skip" (worker: leave rows other sessions hold to the next poll).
 * Returns { settled:false, reason } or { settled:true, outcome, orderId?, winnerId? }.
 */
export async function settleOne(tx, auctionId, { lock = "skip" } = {}) {
  const rows = await tx.execute(sql`
    SELECT auction_id FROM auctions
    WHERE auction_id = ${auctionId} AND status = 'active' AND end_time <= clock_timestamp()
    FOR UPDATE ${lock === "skip" ? sql`SKIP LOCKED` : sql``}`);
  if (rows.length === 0) return { settled: false, reason: "not_due_or_locked" };

  // Re-read under the lock: a bid may have extended the deadline or a Buy Now may have ended it before we got here.
  const [auction] = await tx.select().from(auctions).where(eq(auctions.id, auctionId));
  const [{ now }] = await tx.execute(sql`SELECT clock_timestamp() AS now`);
  const settledAt = new Date(now);

  const maximaRows = await tx.select({
    bidderId: bidderMaxima.bidderId, maxAmount: bidderMaxima.maxAmount, prioritySequence: bidderMaxima.prioritySequence,
    disqualifiedAt: bidderMaxima.disqualifiedAt, userStatus: users.status,
  }).from(bidderMaxima).innerJoin(users, eq(users.id, bidderMaxima.bidderId)).where(eq(bidderMaxima.auctionId, auctionId));

  // B12: banned (or disqualified) bidders cannot win; leader and price are recomputed from the remaining ceilings.
  const eligible = maximaRows.filter((m) => !m.disqualifiedAt && m.userStatus !== "banned")
    .map((m) => ({ bidderId: m.bidderId, max: fromDb(m.maxAmount), priority: m.prioritySequence }));
  const skippedBanned = maximaRows.filter((m) => !m.disqualifiedAt && m.userStatus === "banned").map((m) => m.bidderId);
  const { leaderId, currentPrice } = recompute({ startingPrice: fromDb(auction.startingPrice), step: fromDb(auction.stepPrice), maxima: eligible });

  const sequence = auction.commandSequence + 1;
  const version = auction.version + 1;
  const hadBids = auction.bidCount > 0 || maximaRows.length > 0;
  const closeReason = leaderId === null ? (hadBids ? "no_eligible_bidder" : "no_bids") : "ended";

  let orderId = null;
  if (leaderId !== null) {
    // Keep "latest public event" consistent when the banned-winner recomputation changed leader or price.
    if (leaderId !== auction.winnerId || toStr(currentPrice) !== toStr(fromDb(auction.currentPrice))) {
      await tx.insert(bids).values({ auctionId, bidderId: leaderId, amount: toStr(currentPrice), bidTime: settledAt, auctionSequence: sequence, type: "adjust" });
    }
    const [created] = await tx.insert(orders).values({
      auctionId, buyerId: leaderId, sellerId: auction.sellerId, finalPrice: toStr(currentPrice), status: "pending_payment", paymentDueAt: paymentDueAt(settledAt), createdAt: settledAt, updatedAt: settledAt,
    }).onConflictDoNothing({ target: orders.auctionId }).returning({ id: orders.id });
    if (created) orderId = created.id;
    else {
      // A legacy order already exists: it must agree with the settlement, otherwise this is an exception for a human, not something to overwrite.
      const [existing] = await tx.select().from(orders).where(eq(orders.auctionId, auctionId));
      if (existing.buyerId !== leaderId || toStr(fromDb(existing.finalPrice)) !== toStr(currentPrice)) {
        throw Object.assign(new Error(`Settlement conflict for auction ${auctionId}: existing order disagrees with computed winner/price`), { code: "SETTLEMENT_CONFLICT" });
      }
      orderId = existing.id;
    }
  }

  await tx.update(auctions).set({
    status: "ended", winnerId: leaderId, currentPrice: toStr(currentPrice), settledAt, closeReason, version, commandSequence: sequence,
  }).where(eq(auctions.id, auctionId));

  await tx.insert(auctionCommandAudit).values({
    commandId: `settle-${auctionId}`, auctionId, actorId: null, sequence, kind: "settle", decision: closeReason,
    privatePayload: { leaderId, skippedBanned, orderId }, versionBefore: auction.version, versionAfter: version,
  });
  await enqueue(tx, {
    aggregateType: "auction", aggregateId: auctionId, aggregateVersion: version, eventType: "auction.ended",
    publicPayload: { auctionId, version, status: "ended", currentPrice: toStr(currentPrice), bidCount: auction.bidCount, endTime: auction.endTime, winnerId: leaderId, closeReason, serverTime: settledAt },
  });
  return { settled: true, outcome: closeReason, orderId, winnerId: leaderId };
}

/**
 * One worker pass: claim up to `limit` due auctions and settle each in its own short transaction.
 * Concurrent workers are safe (SKIP LOCKED + status re-check); a crash before commit leaves the auction active.
 * `hooks.beforeCommit(id)` exists for fault-injection tests only.
 */
export async function settleDue({ limit = 50, hooks = {} } = {}) {
  const due = await db.execute(sql`
    SELECT auction_id FROM auctions WHERE status = 'active' AND end_time <= clock_timestamp()
    ORDER BY end_time, auction_id LIMIT ${limit}`);
  const result = { checked: due.length, settled: 0, skipped: 0, failed: [] };
  for (const { auction_id: id } of due) {
    try {
      const out = await db.transaction(async (tx) => {
        const r = await settleOne(tx, id, { lock: "skip" });
        if (r.settled && hooks.beforeCommit) await hooks.beforeCommit(id);
        return r;
      });
      if (out.settled) result.settled += 1; else result.skipped += 1;
    } catch (error) {
      result.failed.push({ auctionId: id, code: error.code ?? "ERROR", message: error.message });
    }
  }
  return result;
}

/**
 * Legacy reconciliation: lots marked `ended` by the old GET-driven flow that never got settled_at (and maybe no order).
 * Creates the missing order from the stored winner/price, or verifies the existing one; mismatches are reported, never overwritten.
 */
export async function reconcileLegacyEnded({ limit = 100 } = {}) {
  const rows = await db.execute(sql`
    SELECT auction_id FROM auctions WHERE status = 'ended' AND settled_at IS NULL ORDER BY auction_id LIMIT ${limit}`);
  const report = { checked: rows.length, settled: 0, ordersCreated: 0, conflicts: [] };
  for (const { auction_id: id } of rows) {
    await db.transaction(async (tx) => {
      const locked = await tx.execute(sql`SELECT auction_id FROM auctions WHERE auction_id = ${id} AND status = 'ended' AND settled_at IS NULL FOR UPDATE SKIP LOCKED`);
      if (locked.length === 0) return;
      const [a] = await tx.select().from(auctions).where(eq(auctions.id, id));
      const [{ now }] = await tx.execute(sql`SELECT clock_timestamp() AS now`);
      const [order] = await tx.select().from(orders).where(eq(orders.auctionId, id));
      let closeReason = a.winnerId === null ? "no_bids" : "ended";
      if (a.winnerId !== null && !order) {
        await tx.insert(orders).values({ auctionId: id, buyerId: a.winnerId, sellerId: a.sellerId, finalPrice: toStr(fromDb(a.currentPrice)), status: "pending_payment", paymentDueAt: paymentDueAt(new Date(now)), createdAt: new Date(now), updatedAt: new Date(now) });
        report.ordersCreated += 1;
      } else if (order && (order.buyerId !== a.winnerId || toStr(fromDb(order.finalPrice)) !== toStr(fromDb(a.currentPrice)))) {
        report.conflicts.push({ auctionId: id, reason: "order_disagrees_with_auction" });
        return; // leave unsettled: needs a human decision
      }
      if (order && a.winnerId !== null) closeReason = "ended";
      await tx.update(auctions).set({ settledAt: new Date(now), closeReason, version: a.version + 1 }).where(and(eq(auctions.id, id), sql`${auctions.settledAt} IS NULL`));
      report.settled += 1;
    });
  }
  return report;
}
