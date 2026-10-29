// Payment adapter flow (D9.3, T20). Mock mode only: no real money moves.
// - A buyer opens an attempt for their own unpaid order; the order's payment mode is fixed to the adapter from then on
//   (manual proof is refused), and amount/currency are copied from the order (never from the client).
// - Provider events are verified, stored once per provider event id (duplicates acknowledged, never re-applied) and
//   applied in ONE transaction with the order transition. A success that arrives too late (expired/cancelled/already
//   paid) or with the wrong amount becomes an `exception` for a human: the order is never reopened.
// - Reconciliation polls the provider for attempts still open, so a lost webhook or a crash is recovered.
import { and, desc, eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { auctions, orders, paymentAttempts, paymentEvents } from "../db/schema.js";
import { AppError } from "../utils/errors.js";
import { need } from "../domain/orderTransitions.js";
import * as mock from "../adapters/payments/mock.js";
import { applyTransition } from "./orderCommands.js";
import { runIdempotent } from "./idempotency.js";

const ADAPTERS = { mock };

/** Configured adapter or null (manual proof only). Mock is the default outside production. Read per call. */
export const activeAdapter = () => ADAPTERS[process.env.PAYMENT_ADAPTER ?? (process.env.NODE_ENV === "production" ? "" : "mock")] ?? null;

const attemptDto = (a) => ({
  id: a.id, provider: a.provider, reference: a.reference, amount: String(a.amount), currency: a.currency,
  status: a.status, exceptionReason: a.exceptionReason ?? null, createdAt: a.createdAt,
});

const dbNow = async (tx) => new Date((await tx.execute(sql`SELECT clock_timestamp() AS now`))[0].now);

/** Same lock order as every order command: auction -> order. */
async function lockOrder(tx, orderId) {
  const [head] = await tx.select({ auctionId: orders.auctionId }).from(orders).where(eq(orders.id, orderId));
  if (!head) throw new AppError(404, "NOT_FOUND", "Order not found");
  await tx.select({ id: auctions.id }).from(auctions).where(eq(auctions.id, head.auctionId)).for("update");
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  return order;
}

export async function createAttempt({ orderId, actor, payload = {}, key }) {
  const adapter = activeAdapter();
  if (!adapter) throw new AppError(409, "PAYMENT_MODE", "Online payment is not enabled; use manual payment");
  return db.transaction((tx) => runIdempotent(tx, { actorId: actor.id, operation: `payment-attempt:${orderId}`, key, payload }, async () => {
    const order = await lockOrder(tx, orderId);
    if (order.buyerId !== actor.id) throw new AppError(403, "FORBIDDEN", "Only the buyer can pay for this order");
    if (order.status !== "pending_payment") throw new AppError(409, "INVALID_TRANSITION", `The order is ${order.status.replace(/_/g, " ")}`);
    if (order.paymentDueAt && (await dbNow(tx)) >= new Date(order.paymentDueAt)) throw new AppError(409, "PAYMENT_WINDOW_CLOSED", "The payment window for this order has closed");
    if (order.paymentMode !== "manual" && order.paymentMode !== adapter.name) throw new AppError(409, "PAYMENT_MODE", `This order is paid through ${order.paymentMode}`);
    const shippingAddress = need(payload.shippingAddress, "shippingAddress");
    const buyerPhone = need(payload.buyerPhone, "buyerPhone");

    // one open attempt per order: starting again returns it instead of opening a second checkout
    let [attempt] = await tx.select().from(paymentAttempts)
      .where(and(eq(paymentAttempts.orderId, orderId), eq(paymentAttempts.status, "created"), eq(paymentAttempts.provider, adapter.name)));
    if (!attempt) {
      [attempt] = await tx.insert(paymentAttempts).values({
        orderId, buyerId: actor.id, provider: adapter.name, reference: adapter.createAttempt(order).reference, amount: order.finalPrice, currency: "VND",
      }).returning();
    }
    const [updated] = await tx.update(orders)
      .set({ paymentMode: adapter.name, shippingAddress, buyerPhone, version: order.version + 1, updatedAt: new Date() })
      .where(eq(orders.id, orderId)).returning();
    return { status: 201, resourceId: attempt.id, body: { attempt: attemptDto(attempt), order: updated } };
  }));
}

async function markException(tx, attempt, reason) {
  await tx.update(paymentAttempts).set({ status: "exception", exceptionReason: reason, updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
  return `exception:${reason}`;
}

/** Apply one verified provider event inside `tx`. Returns the outcome label stored on the event row. */
async function applyEvent(tx, provider, e) {
  const [ref] = await tx.select({ orderId: paymentAttempts.orderId }).from(paymentAttempts)
    .where(and(eq(paymentAttempts.provider, provider), eq(paymentAttempts.reference, e.reference)));
  if (!ref) return "exception:unknown_reference";
  const order = await lockOrder(tx, ref.orderId);
  const [attempt] = await tx.select().from(paymentAttempts)
    .where(and(eq(paymentAttempts.provider, provider), eq(paymentAttempts.reference, e.reference))).for("update");
  const reported = e.type === "payment.succeeded" ? "succeeded" : "failed";

  if (attempt.status !== "created") {
    // money reported after we closed the attempt as failed: someone has to look at it
    if (reported === "succeeded" && attempt.status === "failed") return markException(tx, attempt, "success_after_failure");
    return `ignored:attempt_${attempt.status}`;
  }
  if (BigInt(e.amount) !== BigInt(attempt.amount) || e.currency !== attempt.currency || BigInt(attempt.amount) !== BigInt(order.finalPrice)) {
    return markException(tx, attempt, "amount_mismatch");
  }
  if (reported === "failed") {
    await tx.update(paymentAttempts).set({ status: "failed", updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
    return "failed_recorded";
  }
  if (order.paymentMode !== provider) return markException(tx, attempt, "mode_mismatch");
  try {
    await applyTransition(tx, { orderId: order.id, command: "payment_succeeded", actor: { type: "adapter", id: null }, key: `payment:${provider}:${e.eventId}`.slice(0, 100) });
  } catch (error) {
    // late: the order expired, was cancelled or was already paid. It is NOT reopened.
    if (error.code === "PAYMENT_WINDOW_CLOSED") return markException(tx, attempt, "late_payment_window_closed");
    if (error.code === "INVALID_TRANSITION") return markException(tx, attempt, `late_payment_order_${order.status}`);
    throw error;
  }
  await tx.update(paymentAttempts).set({ status: "succeeded", updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
  return "applied";
}

/** Store the event once (dedupe on provider event id) and apply it in the same transaction. */
async function processEvent(provider, e) {
  return db.transaction(async (tx) => {
    const [fresh] = await tx.insert(paymentEvents)
      .values({ provider, eventId: e.eventId, reference: e.reference, type: e.type, amount: e.amount, currency: e.currency })
      .onConflictDoNothing().returning({ id: paymentEvents.id });
    if (!fresh) return { duplicate: true, outcome: "duplicate" };
    const outcome = await applyEvent(tx, provider, e);
    await tx.update(paymentEvents).set({ outcome }).where(eq(paymentEvents.id, fresh.id));
    return { duplicate: false, outcome };
  });
}

/** Webhook entry: only the active adapter is accepted; the signature is verified on the raw body first. */
export async function handleWebhook(providerName, rawBody, headers) {
  const adapter = activeAdapter();
  if (!adapter || adapter.name !== providerName) throw new AppError(404, "NOT_FOUND", "Unknown payment provider");
  return processEvent(adapter.name, adapter.verifyEvent(rawBody, headers));
}

/**
 * Mock-only demo control for the buyer: make the "provider" report an outcome. `deliver:false` simulates a lost
 * webhook (only reconciliation will notice). Unavailable whenever the mock adapter is not the active one.
 */
export async function simulate({ reference, actor, outcome, deliver = true }) {
  if (activeAdapter() !== mock) throw new AppError(404, "NOT_FOUND", "Not available");
  if (!["succeeded", "failed"].includes(outcome)) throw new AppError(400, "VALIDATION_ERROR", "outcome must be succeeded or failed");
  const [attempt] = await db.select().from(paymentAttempts).where(and(eq(paymentAttempts.provider, "mock"), eq(paymentAttempts.reference, String(reference))));
  if (!attempt || attempt.buyerId !== actor.id) throw new AppError(404, "NOT_FOUND", "Payment attempt not found");
  if (attempt.providerStatus !== "pending") throw new AppError(409, "ALREADY_SETTLED", "The provider already settled this attempt");
  const { rawBody, headers } = await mock.settle(attempt.reference, outcome);
  if (!deliver) return { delivered: false };
  return { delivered: true, ...(await handleWebhook("mock", rawBody, headers)) };
}

/** Worker job: ask the provider about attempts still open for a while; apply what it reports (idempotently). */
export async function reconcile({ limit = 50, olderThanMs = Number(process.env.PAYMENT_RECONCILE_AFTER_MS || 60_000) } = {}) {
  const adapter = activeAdapter();
  const report = { checked: 0, applied: 0, exceptions: [], failed: [] };
  if (!adapter) return report;
  const open = await db.execute(sql`
    SELECT reference FROM payment_attempts
    WHERE status = 'created' AND provider = ${adapter.name}
      AND updated_at <= clock_timestamp() - ${olderThanMs} * interval '1 millisecond'
      AND created_at > clock_timestamp() - interval '7 days'
    ORDER BY updated_at LIMIT ${limit}`);
  for (const { reference } of open) {
    report.checked += 1;
    try {
      const s = await adapter.getAttemptStatus(reference);
      if (!s || s.status === "pending") {
        await db.execute(sql`UPDATE payment_attempts SET updated_at = clock_timestamp() WHERE provider = ${adapter.name} AND reference = ${reference}`);
        continue;
      }
      const r = await processEvent(adapter.name, { eventId: `reconcile:${reference}:${s.status}`, reference, type: `payment.${s.status}`, amount: s.amount, currency: s.currency });
      if (r.outcome === "applied") report.applied += 1;
      if (r.outcome.startsWith("exception:")) report.exceptions.push({ reference, outcome: r.outcome });
    } catch (error) {
      report.failed.push({ reference, code: error.code ?? "ERROR", message: error.message });
    }
  }
  return report;
}

/** What participants see about payment on the order page. */
export async function summary(order) {
  const adapter = activeAdapter();
  const attempts = await db.select().from(paymentAttempts).where(eq(paymentAttempts.orderId, order.id)).orderBy(desc(paymentAttempts.createdAt)).limit(5);
  return {
    mode: order.paymentMode,
    available: adapter ? ["manual", adapter.name] : ["manual"],
    attempts: attempts.map(attemptDto),
  };
}
