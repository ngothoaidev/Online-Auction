// The ONLY place order state changes. Lock order: command key -> auction -> order (same as auction commands).
import { eq, sql } from "drizzle-orm";
import db from "../db/index.ts";
import { auctions, orders, orderTransitions } from "../db/schema.ts";
import { AppError } from "../utils/errors.ts";
import { planTransition } from "../domain/orderTransitions.ts";
import { runIdempotent } from "./idempotency.js";
import { enqueue } from "./outbox.js";
import { attachAsset } from "./media.js";

// Proof URLs are NEVER taken from the client: only a pending upload owned by the actor for this order can become a proof.
async function resolveProofs(tx, order, command, actor, payload) {
  const out = { ...payload, paymentProofUrl: undefined, shippingProofUrl: undefined };
  if (command === "submit_payment" && payload.paymentProofAssetId) {
    out.paymentProofUrl = await attachAsset(tx, { assetId: payload.paymentProofAssetId, orderId: order.id, ownerId: actor.id, purpose: "payment" });
  }
  if ((command === "confirm_with_shipping" || command === "submit_shipping") && payload.shippingProofAssetId) {
    out.shippingProofUrl = await attachAsset(tx, { assetId: payload.shippingProofAssetId, orderId: order.id, ownerId: actor.id, purpose: "shipping" });
  }
  return out;
}

const clock = async (tx) => new Date((await tx.execute(sql`SELECT clock_timestamp() AS now`))[0].now);

/**
 * Run `command` on an order. `actor` = { type:'user'|'system'|'adapter', id?, role? }.
 * `expectedVersion` (optional) rejects a stale client; `key` (optional) makes the call replay-safe.
 */
export async function transitionOrder({ orderId, command, actor, payload = {}, expectedVersion, key }) {
  return db.transaction((tx) => runIdempotent(tx, { actorId: actor.id ?? 0, operation: `order:${orderId}:${command}`, key, payload },
    () => applyTransition(tx, { orderId, command, actor, payload, expectedVersion, key })));
}

/** The locked read-plan-write body, reusable inside a larger transaction (e.g. the review command). Re-locking is a no-op. */
export async function applyTransition(tx, { orderId, command, actor, payload = {}, expectedVersion, key }) {
  {
    const [head] = await tx.select({ auctionId: orders.auctionId }).from(orders).where(eq(orders.id, orderId));
    if (!head) throw new AppError(404, "NOT_FOUND", "Order not found");

    await tx.select({ id: auctions.id }).from(auctions).where(eq(auctions.id, head.auctionId)).for("update"); // 1) auction
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");                 // 2) order
    const now = await clock(tx);

    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== order.version) {
      throw new AppError(409, "VERSION_CONFLICT", "The order changed; refresh and try again");
    }
    // authorise/validate first so a refused command never touches an upload
    planTransition(order, command, actor, now, { ...payload, paymentProofUrl: payload.paymentProofAssetId ? "pending" : undefined, shippingProofUrl: payload.shippingProofAssetId ? "pending" : undefined });
    const plan = planTransition(order, command, actor, now, await resolveProofs(tx, order, command, actor, payload));

    const [updated] = await tx.update(orders)
      .set({ ...plan.set, status: plan.to, version: order.version + 1, updatedAt: now })
      .where(eq(orders.id, orderId)).returning();

    await tx.insert(orderTransitions).values({
      orderId, fromStatus: order.status, toStatus: plan.to, command, actorType: actor.type, actorId: actor.id ?? null,
      reason: plan.reason ?? null, commandId: key ?? `${command}-${orderId}-${updated.version}`,
    });

    // Auction mapping: 'sold' once payment is recorded; a cancel after payment cancels the lot, otherwise it stays ended.
    if (plan.auction === "sold" || plan.auction === "cancel_if_sold") {
      const [a] = await tx.select().from(auctions).where(eq(auctions.id, head.auctionId));
      if (plan.auction === "sold" && a.status === "ended") {
        await tx.update(auctions).set({ status: "sold", version: a.version + 1 }).where(eq(auctions.id, a.id));
      } else if (plan.auction === "cancel_if_sold") {
        await tx.update(auctions).set(a.status === "sold" ? { status: "cancelled", closeReason: "cancelled_after_payment", version: a.version + 1 } : { closeReason: "order_cancelled", version: a.version + 1 })
          .where(eq(auctions.id, a.id));
      }
    }

    await enqueue(tx, {
      aggregateType: "order", aggregateId: orderId, aggregateVersion: updated.version, eventType: `order.${plan.to}`,
      publicPayload: { orderId, auctionId: head.auctionId, status: plan.to, version: updated.version, at: now },
      privatePayload: { buyerId: order.buyerId, sellerId: order.sellerId, actorType: actor.type, actorId: actor.id ?? null },
    });
    return { status: 200, resourceId: String(orderId), body: { order: updated } };
  }
}

/** Worker job: expire unpaid orders whose deadline passed. Each order is its own transaction; safe to run in parallel. */
export async function expireDuePayments({ limit = 50 } = {}) {
  const due = await db.execute(sql`
    SELECT order_id FROM orders WHERE status = 'pending_payment' AND payment_due_at <= clock_timestamp()
    ORDER BY payment_due_at, order_id LIMIT ${limit}`);
  const result = { checked: due.length, expired: 0, skipped: 0, failed: [] };
  for (const { order_id: orderId } of due) {
    try {
      await transitionOrder({ orderId, command: "expire", actor: { type: "system" } });
      result.expired += 1;
    } catch (error) {
      // Lost a race with a payment/cancel that committed first: that is a legitimate "not expired".
      if (["INVALID_TRANSITION", "NOT_DUE"].includes(error.code)) result.skipped += 1;
      else result.failed.push({ orderId, code: error.code ?? "ERROR", message: error.message });
    }
  }
  return result;
}
