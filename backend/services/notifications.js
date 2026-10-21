// Notifications (D9.4, T21). An outbox consumer turns committed domain events into in-app rows and emails.
// - Idempotent: rows are unique per (recipient, channel, `<eventId>:<kind>`), so a redelivered event adds nothing.
// - Email failures throw, so the OUTBOX retries the event with backoff and finally dead-letters it; rows already sent are
//   skipped on retry. The domain transaction that produced the event has long committed: delivery can never undo it.
// - At least once for email: a crash after the provider accepted a message but before it is marked `sent` resends it
//   (the provider has no idempotent send). In-app rows are exactly once per logical notification.
// - Content is built from public data plus the recipient's own role: never a bidder's maximum, never a proof URL.
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import db from "../db/index.js";
import { auctions, notifications, orders, users } from "../db/schema.js";
import { formatVnd } from "../domain/money.js";
import { sendEmail } from "../utils/email.js";
import { enqueue } from "./outbox.js";
import { AppError } from "../utils/errors.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const vnd = (v) => `${formatVnd(v)} ₫`;
const when = (d) => new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

const lotOf = async (auctionId) => (await db.select({ id: auctions.id, title: auctions.title }).from(auctions).where(eq(auctions.id, auctionId)))[0];
const orderOf = async (orderId) => (await db.select().from(orders).where(eq(orders.id, orderId)))[0];

/** event -> [{ recipientId, kind, title, body, link, email }] (pure-ish: reads titles/amounts, never writes). */
export async function plan(event) {
  const p = event.publicPayload ?? {};
  const x = event.privatePayload ?? {};
  const n = (recipientId, kind, title, body, link, email = false) => (recipientId ? [{ recipientId, kind, title, body, link, email }] : []);

  switch (event.eventType) {
    case "auction.bid_placed": {
      if (!x.previousLeaderId || x.previousLeaderId === x.leaderId) return [];
      const lot = await lotOf(event.aggregateId);
      return n(x.previousLeaderId, "outbid", `You were outbid on "${lot.title}"`,
        `Another bidder's maximum is higher than yours. The current price is ${vnd(p.currentPrice)}. Bid again before ${when(p.endTime)} if you still want it.`, `/auction/${lot.id}`, true);
    }
    case "auction.ended": {
      const lot = await lotOf(event.aggregateId);
      if (!x.winnerId) {
        return n(x.sellerId, "auction_unsold", `"${lot.title}" ended without a sale`, p.closeReason === "no_bids" ? "Nobody placed a bid." : "No eligible bidder remained.", `/auction/${lot.id}`, true);
      }
      const order = x.orderId ? await orderOf(x.orderId) : null;
      const due = order?.paymentDueAt ? ` Pay before ${when(order.paymentDueAt)}; unpaid orders expire.` : "";
      return [
        ...n(x.winnerId, "auction_won", `You won "${lot.title}"`, `Final price: ${vnd(p.currentPrice)}.${due}`, `/order/${lot.id}`, true),
        ...n(x.sellerId, "auction_sold", `"${lot.title}" sold`, `Final price: ${vnd(p.currentPrice)}. Wait for the buyer's payment before shipping.`, `/order/${lot.id}`, true),
      ];
    }
    case "auction.bid_rejected": {
      const lot = await lotOf(event.aggregateId);
      return n(x.bidderId, "bid_removed", `Your bids on "${lot.title}" were removed`, "The seller removed you from this lot. You cannot bid on it again.", `/auction/${lot.id}`, false);
    }
    case "auction.cancelled": {
      const lot = await lotOf(event.aggregateId);
      return n(x.leaderId, "auction_cancelled", `"${lot.title}" was cancelled`, "The listing was withdrawn. No order was created.", `/auction/${lot.id}`, false);
    }
    case "order.payment_reminder": {
      const lot = await lotOf(p.auctionId);
      return n(x.buyerId, "payment_reminder", `Payment due soon for "${lot.title}"`, `Please pay before ${when(p.dueAt)}. Unpaid orders expire automatically.`, `/order/${lot.id}`, true);
    }
  }

  if (event.aggregateType === "order") {
    const lot = await lotOf(p.auctionId);
    const link = `/order/${lot.id}`;
    const buyer = x.buyerId, seller = x.sellerId;
    switch (event.eventType) {
      case "order.pending_confirmation":
        return n(seller, "payment_submitted", `Payment submitted for "${lot.title}"`, "The buyer uploaded a payment receipt. Check it, then confirm and ship.", link, true);
      case "order.pending_delivery":
        return [
          ...n(seller, "payment_received", `Payment recorded for "${lot.title}"`, "The payment gateway confirmed the payment. Ship the item and add tracking.", link, true),
          ...n(buyer, "payment_confirmed", `Payment confirmed for "${lot.title}"`, "Your payment was recorded. The seller will ship next.", link, false),
        ];
      case "order.pending_receipt":
        return n(buyer, "shipped", `"${lot.title}" has shipped`, "The seller sent the item. Confirm receipt once it arrives.", link, true);
      case "order.pending_review":
        return n(seller, "received", `The buyer received "${lot.title}"`, "Leave a review for the buyer to complete the order.", link, false);
      case "order.completed":
        return [
          ...n(buyer, "completed", `Order complete: "${lot.title}"`, "Both reviews are in. Thank you!", link, true),
          ...n(seller, "completed", `Order complete: "${lot.title}"`, "Both reviews are in. Thank you!", link, true),
        ];
      case "order.cancelled": {
        const other = x.actorId === seller ? [buyer] : x.actorId === buyer ? [seller] : [buyer, seller];
        return other.flatMap((id) => n(id, "order_cancelled", `Order cancelled: "${lot.title}"`, "The order was cancelled. Open it to see the reason.", link, true));
      }
      case "order.payment_expired":
        return [
          ...n(buyer, "payment_expired", `Payment window closed: "${lot.title}"`, "No payment was recorded before the deadline, so the order expired.", link, true),
          ...n(seller, "payment_expired", `Payment window closed: "${lot.title}"`, "The buyer did not pay in time. The order expired and the lot is not reopened.", link, false),
        ];
    }
  }
  return [];
}

const emailHtml = (item) => `<h2 style="margin:0 0 12px">${esc(item.title)}</h2><p>${esc(item.body)}</p>`
  + (item.link ? `<p><a href="${esc(FRONTEND_URL() + item.link)}">Open it on the site</a></p>` : "");

/** Outbox consumer: write in-app + email rows idempotently, then send the emails still owed for this event. */
export async function handle(event) {
  const items = await plan(event);
  if (items.length === 0) return;
  const rows = items.flatMap((it) => {
    const base = { recipientId: it.recipientId, kind: it.kind, dedupeKey: `${event.eventId}:${it.kind}`, title: it.title.slice(0, 300), body: it.body, link: it.link };
    return [{ ...base, channel: "in_app", status: "delivered" }, ...(it.email ? [{ ...base, channel: "email", status: "pending" }] : [])];
  });
  await db.insert(notifications).values(rows).onConflictDoNothing();

  const owed = await db.select({ n: notifications, email: users.email, userStatus: users.status }).from(notifications)
    .innerJoin(users, eq(users.id, notifications.recipientId))
    .where(and(eq(notifications.channel, "email"), inArray(notifications.dedupeKey, [...new Set(rows.map((r) => r.dedupeKey))]), inArray(notifications.status, ["pending", "failed"])));
  const failures = [];
  for (const { n: row, email, userStatus } of owed) {
    if (!email || userStatus === "banned") {
      await db.update(notifications).set({ status: "skipped", lastError: email ? "recipient banned" : "no email address" }).where(eq(notifications.id, row.id));
      continue;
    }
    try {
      await sendEmail(email, row.title, emailHtml(row), { key: `notification-${row.id}` });
      await db.update(notifications).set({ status: "sent", sentAt: new Date(), attempts: sql`${notifications.attempts} + 1`, lastError: null }).where(eq(notifications.id, row.id));
    } catch (error) {
      await db.update(notifications).set({ status: "failed", attempts: sql`${notifications.attempts} + 1`, lastError: String(error.message).slice(0, 500) }).where(eq(notifications.id, row.id));
      failures.push(row.id);
    }
  }
  if (failures.length) throw new Error(`email delivery failed for notification(s) ${failures.join(",")}`); // outbox retries/dead-letters
}

export const consumer = { name: "notifications", handle };

const REMINDER_WINDOWS_HOURS = [24, 2]; // B08: 48h window -> remind at 24h and 2h left

/**
 * Worker job: one reminder per order per window. The outbox row's unique (aggregate, version, type) is the dedupe key:
 * aggregate = ('payment_reminder', orderId), version = window hours. Only the tightest window that applies is sent.
 */
export async function enqueuePaymentReminders() {
  const due = await db.execute(sql`
    SELECT order_id, auction_id, buyer_id, payment_due_at, EXTRACT(EPOCH FROM payment_due_at - clock_timestamp()) / 3600 AS hours_left
    FROM orders WHERE status = 'pending_payment' AND payment_due_at > clock_timestamp()
      AND payment_due_at <= clock_timestamp() + ${Math.max(...REMINDER_WINDOWS_HOURS)} * interval '1 hour'`);
  let queued = 0;
  for (const o of due) {
    const window = Math.min(...REMINDER_WINDOWS_HOURS.filter((w) => Number(o.hours_left) <= w));
    const added = await enqueue(db, {
      aggregateType: "payment_reminder", aggregateId: o.order_id, aggregateVersion: window, eventType: "order.payment_reminder",
      publicPayload: { orderId: o.order_id, auctionId: o.auction_id, dueAt: o.payment_due_at, windowHours: window }, privatePayload: { buyerId: o.buyer_id },
    });
    if (added) queued += 1;
  }
  return { checked: due.length, queued };
}

// --- inbox (recipient only) ---
const dto = (r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, createdAt: r.createdAt, read: Boolean(r.readAt) });
const mine = (userId) => and(eq(notifications.recipientId, userId), eq(notifications.channel, "in_app"));

export async function list(userId, { limit = 30 } = {}) {
  const rows = await db.select().from(notifications).where(mine(userId)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(Math.min(Number(limit) || 30, 100));
  return { items: rows.map(dto), unread: await unreadCount(userId) };
}

export async function unreadCount(userId) {
  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(notifications).where(and(mine(userId), isNull(notifications.readAt)));
  return n;
}

export async function markRead(userId, id) {
  const [row] = await db.update(notifications).set({ readAt: sql`COALESCE(${notifications.readAt}, now())` })
    .where(and(mine(userId), eq(notifications.id, id))).returning({ id: notifications.id });
  if (!row) throw new AppError(404, "NOT_FOUND", "Notification not found"); // someone else's id looks exactly like a missing one
  return { id, unread: await unreadCount(userId) };
}

export async function markAllRead(userId) {
  await db.update(notifications).set({ readAt: sql`now()` }).where(and(mine(userId), isNull(notifications.readAt)));
  return { unread: 0 };
}

/** Admin: email delivery status, newest first (no message bodies). */
export async function deliveries({ status, limit = 50 } = {}) {
  const rows = await db.select({
    id: notifications.id, kind: notifications.kind, status: notifications.status, attempts: notifications.attempts, lastError: notifications.lastError,
    createdAt: notifications.createdAt, sentAt: notifications.sentAt, recipient: users.username,
  }).from(notifications).innerJoin(users, eq(users.id, notifications.recipientId))
    .where(and(eq(notifications.channel, "email"), status ? eq(notifications.status, status) : undefined))
    .orderBy(desc(notifications.createdAt)).limit(Math.min(Number(limit) || 50, 200));
  return { items: rows };
}
