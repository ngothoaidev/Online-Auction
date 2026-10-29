import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.ts";
import type { TestApp, TestUser } from "../helpers/app.ts";

let t: TestApp, seller: TestUser, buyer: TestUser, other: TestUser, tokens: Record<string, string>, categoryId: number, payments: typeof import("../../services/payments.ts"), mock: typeof import("../../adapters/payments/mock.ts"), orderCmd: typeof import("../../services/orderCommands.ts");

before(async () => {
  t = await startApp();
  payments = await import("../../services/payments.ts");
  mock = await import("../../adapters/payments/mock.ts");
  orderCmd = await import("../../services/orderCommands.ts");
  seller = await t.createUser("pseller", { role: "seller" });
  buyer = await t.createUser("pbuyer");
  other = await t.createUser("pother");
  tokens = { seller: await t.tokenFor(seller), buyer: await t.tokenFor(buyer), other: await t.tokenFor(other) };
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('pc') RETURNING category_id AS id`;
});
after(() => t.stop());

const makeOrder = async ({ status = "pending_payment", due = "48 hours" } = {}) => {
  const [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id, settled_at)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 5000, 100, now() - interval '1 hour', 'ended', ${buyer.id}, now()) RETURNING auction_id AS id`;
  const [{ id }] = await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price, status, payment_due_at)
    VALUES (${auctionId}, ${buyer.id}, ${seller.id}, 5000, ${status}, now() + ${due}::interval) RETURNING order_id AS id`;
  return { id, auctionId };
};
const order = async (id: number) => (await t.sql`SELECT * FROM orders WHERE order_id = ${id}`)[0];
const attemptOf = async (reference: string) => (await t.sql`SELECT * FROM payment_attempts WHERE reference = ${reference}`)[0];
const shipTo = { shippingAddress: "1 Main St", buyerPhone: "0123456789" };
const start = (id: number, who = "buyer", headers: Record<string, string> = {}) => fetch(`${t.base}/order/${id}/payment-attempts`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens[who]}`, ...headers }, body: JSON.stringify(shipTo),
}).then(async (r) => ({ status: r.status, body: await r.json(), replayed: r.headers.get("idempotent-replayed") }));
const simulate = (reference: string, outcome: string, who = "buyer", deliver = true) => t.call("POST", `/payments/mock/${reference}/simulate`, { token: tokens[who], body: { outcome, deliver } });
const webhook = (body: unknown, signature?: string) => {
  const raw = Buffer.from(JSON.stringify(body));
  return fetch(`${t.base}/payments/webhook/mock`, { method: "POST", headers: { "Content-Type": "application/json", "X-Mock-Signature": signature ?? mock.sign(raw) }, body: raw })
    .then(async (r) => ({ status: r.status, body: await r.json() }));
};
const event = (reference: string, over: Record<string, unknown> = {}) => ({ eventId: `evt_${Math.random().toString(36).slice(2)}`, reference, type: "payment.succeeded", amount: "5000", currency: "VND", ...over });

test("mock success: attempt at the server amount, mode locked to mock, one transition to pending_delivery, lot sold, seller ships", async () => {
  const o = await makeOrder();
  const res = await start(o.id);
  assert.equal(res.status, 201);
  assert.equal(res.body.attempt.amount, "5000");
  assert.equal(res.body.attempt.currency, "VND");
  assert.equal(res.body.attempt.status, "created");
  assert.equal((await order(o.id)).payment_mode, "mock");
  assert.equal((await order(o.id)).shipping_address, "1 Main St");

  // the same order cannot also be paid by manual proof
  const manual = await t.call("POST", `/order/${o.id}/payment`, { token: tokens.buyer, body: { paymentProofAssetId: "00000000-0000-0000-0000-000000000000", ...shipTo } });
  assert.equal(manual.status, 409);
  assert.equal(manual.body.code, "PAYMENT_MODE");

  // starting again resumes the open attempt instead of opening a second checkout
  assert.equal((await start(o.id)).body.attempt.reference, res.body.attempt.reference);

  const sim = await simulate(res.body.attempt.reference, "succeeded");
  assert.equal(sim.status, 200);
  assert.equal(sim.body.outcome, "applied");
  const paid = await order(o.id);
  assert.equal(paid.status, "pending_delivery");
  assert.ok(paid.payment_confirmed_at);
  assert.equal((await t.sql`SELECT status FROM auctions WHERE auction_id = ${o.auctionId}`)[0].status, "sold");
  assert.equal((await attemptOf(res.body.attempt.reference)).status, "succeeded");
  const tr = await t.sql`SELECT command, actor_type FROM order_transitions WHERE order_id = ${o.id}`;
  assert.deepEqual(tr.map((r) => [r.command, r.actor_type]), [["payment_succeeded", "adapter"]]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM outbox_events WHERE aggregate_type = 'order' AND aggregate_id = ${o.id} AND event_type = 'order.pending_delivery'`)[0].n, 1);

  const ship = await t.call("POST", `/order/${o.id}/shipping`, { token: tokens.seller, body: { trackingNumber: "VN123" } });
  assert.equal(ship.status, 200);
  assert.equal((await order(o.id)).status, "pending_receipt");

  // participants see the payment block; amounts come from the server
  const view = await t.call("GET", `/order/auction/${o.auctionId}`, { token: tokens.seller });
  assert.equal(view.body.payment.mode, "mock");
  assert.deepEqual(view.body.payment.available, ["manual", "mock"]);
  assert.equal(view.body.payment.attempts[0].status, "succeeded");
});

test("only the buyer may pay; only the attempt's buyer may drive the mock; manual orders in progress cannot switch", async () => {
  const o = await makeOrder();
  assert.equal((await start(o.id, "seller")).status, 403);
  assert.equal((await start(o.id, "other")).status, 403);
  assert.equal((await fetch(`${t.base}/order/${o.id}/payment-attempts`, { method: "POST" })).status, 401);
  const missing = await fetch(`${t.base}/order/${o.id}/payment-attempts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.buyer}` }, body: "{}" });
  assert.equal(missing.status, 400);

  const { body } = await start(o.id);
  for (const who of ["seller", "other"]) assert.equal((await simulate(body.attempt.reference, "succeeded", who)).status, 404);
  assert.equal((await order(o.id)).status, "pending_payment");

  const manual = await makeOrder({ status: "pending_confirmation" });
  assert.equal((await start(manual.id)).body.code, "INVALID_TRANSITION");
  const closed = await makeOrder({ due: "-1 minute" });
  assert.equal((await start(closed.id)).body.code, "PAYMENT_WINDOW_CLOSED");
});

test("Idempotency-Key on starting a payment replays the same attempt", async () => {
  const o = await makeOrder();
  const [a, b] = await Promise.all([start(o.id, "buyer", { "Idempotency-Key": "pay-key-0001" }), start(o.id, "buyer", { "Idempotency-Key": "pay-key-0001" })]);
  assert.equal(a.body.attempt.id, b.body.attempt.id);
  assert.deepEqual([a.replayed, b.replayed].sort(), ["false", "true"]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM payment_attempts WHERE order_id = ${o.id}`)[0].n, 1);
});

test("the same webhook delivered 8 times at once advances the order exactly once", async () => {
  const o = await makeOrder();
  const { body } = await start(o.id);
  const e = event(body.attempt.reference);
  const results = await Promise.all(Array.from({ length: 8 }, () => webhook(e)));
  assert.ok(results.every((r) => r.status === 200));
  assert.deepEqual(results.map((r) => r.body.outcome).sort(), ["applied", ...Array(7).fill("duplicate")]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM order_transitions WHERE order_id = ${o.id}`)[0].n, 1);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM payment_events WHERE event_id = ${e.eventId}`)[0].n, 1);
  // a different event id for an attempt already settled is recorded but changes nothing
  assert.equal((await webhook(event(body.attempt.reference))).body.outcome, "ignored:attempt_succeeded");
});

test("forged or malformed webhooks are rejected before anything is stored; wrong amount becomes an exception", async () => {
  const o = await makeOrder();
  const { body } = await start(o.id);
  const before = (await t.sql`SELECT count(*)::int AS n FROM payment_events`)[0].n;
  assert.equal((await webhook(event(body.attempt.reference), "sha256=deadbeef")).status, 400);
  assert.equal((await webhook({ ...event(body.attempt.reference), amount: "5k" })).status, 400);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM payment_events`)[0].n, before);

  const wrong = await webhook(event(body.attempt.reference, { amount: "4999" }));
  assert.equal(wrong.body.outcome, "exception:amount_mismatch");
  assert.equal((await order(o.id)).status, "pending_payment");
  assert.equal((await attemptOf(body.attempt.reference)).exception_reason, "amount_mismatch");

  assert.equal((await webhook(event("mock_unknown"))).body.outcome, "exception:unknown_reference");
});

test("a failed attempt leaves the order payable; a new attempt can succeed; success after failure is an exception", async () => {
  const o = await makeOrder();
  const first = (await start(o.id)).body.attempt;
  assert.equal((await simulate(first.reference, "failed")).body.outcome, "failed_recorded");
  assert.equal((await order(o.id)).status, "pending_payment");
  assert.equal((await simulate(first.reference, "succeeded")).status, 409, "the provider already settled it");

  const late = await webhook(event(first.reference)); // provider later says the failed attempt was paid after all
  assert.equal(late.body.outcome, "exception:success_after_failure");
  assert.equal((await order(o.id)).status, "pending_payment");

  const second = (await start(o.id)).body.attempt;
  assert.notEqual(second.reference, first.reference);
  assert.equal((await simulate(second.reference, "succeeded")).body.outcome, "applied");
  assert.equal((await order(o.id)).status, "pending_delivery");
});

test("late success on an expired or cancelled order is an exception and never reopens the order", async () => {
  const expired = await makeOrder();
  const a = (await start(expired.id)).body.attempt;
  await t.sql`UPDATE orders SET payment_due_at = now() - interval '1 second' WHERE order_id = ${expired.id}`;
  await orderCmd.expireDuePayments();
  assert.equal((await order(expired.id)).status, "payment_expired");
  assert.equal((await simulate(a.reference, "succeeded")).body.outcome, "exception:late_payment_order_payment_expired");
  assert.equal((await order(expired.id)).status, "payment_expired");

  const cancelled = await makeOrder();
  const c = (await start(cancelled.id)).body.attempt;
  assert.equal((await t.call("POST", `/order/${cancelled.id}/cancel`, { token: tokens.seller, body: { reason: "buyer unreachable" } })).status, 200);
  assert.equal((await simulate(c.reference, "succeeded")).body.outcome, "exception:late_payment_order_cancelled");
  assert.equal((await order(cancelled.id)).status, "cancelled");

  const overdue = await makeOrder(); // deadline passed, expiry job not run yet
  const d = (await start(overdue.id)).body.attempt;
  await t.sql`UPDATE orders SET payment_due_at = now() - interval '1 second' WHERE order_id = ${overdue.id}`;
  assert.equal((await simulate(d.reference, "succeeded")).body.outcome, "exception:late_payment_window_closed");
  assert.equal((await order(overdue.id)).status, "pending_payment");
});

test("payment x expiry race (20 rounds): the order is either paid or expired, never both, and the attempt agrees", async () => {
  const seen = { paid: 0, refused: 0 };
  for (let i = 0; i < 20; i++) {
    const o = await makeOrder();
    const a = (await start(o.id)).body.attempt;
    // deadline well ahead / already passed / right at the boundary while both commands run concurrently
    const due = ["500 milliseconds", "-1 second", "15 milliseconds"][i % 3];
    await t.sql`UPDATE orders SET payment_due_at = now() + ${due}::interval WHERE order_id = ${o.id}`;
    if (i % 3 === 2) await new Promise((r) => setTimeout(r, 15));
    await Promise.all([webhook(event(a.reference)), orderCmd.expireDuePayments()]);
    const s = (await order(o.id)).status;
    const att = await attemptOf(a.reference);
    if (s === "pending_delivery") { seen.paid += 1; assert.equal(att.status, "succeeded"); }
    else { seen.refused += 1; assert.ok(att.status === "exception" && ["payment_expired", "pending_payment"].includes(s), `${s}/${att.status}`); }
    assert.ok((await t.sql`SELECT count(*)::int AS n FROM order_transitions WHERE order_id = ${o.id}`)[0].n <= 1);
  }
  console.log(JSON.stringify({ race: "payment_x_expiry", ...seen }));
  assert.ok(seen.paid > 0 && seen.refused > 0, "both outcomes must actually occur for the race to be exercised");
});

test("lost webhook: reconciliation asks the provider and applies the payment once (survives a restart; later webhook is ignored)", async () => {
  const o = await makeOrder();
  const a = (await start(o.id)).body.attempt;
  const sim = await simulate(a.reference, "succeeded", "buyer", false);
  assert.deepEqual(sim.body, { delivered: false });
  assert.equal((await order(o.id)).status, "pending_payment");

  // a fresh worker process: nothing in memory, only the DB and the provider
  const r1 = await payments.reconcile({ olderThanMs: 0 });
  assert.equal(r1.applied, 1);
  assert.equal((await order(o.id)).status, "pending_delivery");
  const r2 = await payments.reconcile({ olderThanMs: 0 });
  assert.equal(r2.applied, 0);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM order_transitions WHERE order_id = ${o.id}`)[0].n, 1);
  assert.equal((await webhook(event(a.reference))).body.outcome, "ignored:attempt_succeeded", "the webhook finally arriving changes nothing");

  // still-pending attempts are left alone
  const p = await makeOrder();
  await start(p.id);
  assert.equal((await payments.reconcile({ olderThanMs: 0 })).applied, 0);
  assert.equal((await order(p.id)).status, "pending_payment");
});

test("mock controls do not exist when the mock adapter is not active (no fake-mode escalation)", async () => {
  const o = await makeOrder();
  const a = (await start(o.id)).body.attempt;
  const saved = process.env.PAYMENT_ADAPTER;
  process.env.PAYMENT_ADAPTER = "";
  try {
    assert.equal((await simulate(a.reference, "succeeded")).status, 404);
    assert.equal((await webhook(event(a.reference))).status, 404);
    const res = await start((await makeOrder()).id);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "PAYMENT_MODE");
    assert.deepEqual((await t.call("GET", `/order/auction/${o.auctionId}`, { token: tokens.buyer })).body.payment.available, ["manual"]);
  } finally {
    if (saved === undefined) delete process.env.PAYMENT_ADAPTER; else process.env.PAYMENT_ADAPTER = saved;
  }
  assert.equal((await order(o.id)).status, "pending_payment");
});
