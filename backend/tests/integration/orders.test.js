import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t, seller, buyer, other, admin, tokens, categoryId, orderSvc;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000" });
  orderSvc = await import("../../services/orderCommands.js");
  seller = await t.createUser("seller", { role: "seller" });
  buyer = await t.createUser("buyer");
  other = await t.createUser("other");
  admin = await t.createUser("admin", { role: "admin" });
  tokens = {};
  for (const [k, u] of Object.entries({ seller, buyer, other, admin })) tokens[k] = await t.tokenFor(u);
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
});
after(() => t.stop());

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
// body for commands that must be refused before any upload is looked at
const proof = { paymentProofAssetId: "00000000-0000-0000-0000-000000000000", shippingAddress: "1 Main St", buyerPhone: "0123456789" };
// a real private upload bound to this order, as the SPA does it
const withProof = async (orderId, extra = {}) => {
  const fd = new FormData();
  fd.append("file", new Blob([PNG], { type: "image/png" }), "p.png");
  const res = await fetch(`${t.base}/order/${orderId}/proofs?purpose=payment`, { method: "POST", headers: { Authorization: `Bearer ${tokens.buyer}` }, body: fd });
  assert.equal(res.status, 201);
  return { ...proof, paymentProofAssetId: (await res.json()).assetId, ...extra };
};

/** An ended lot with an order in the given status. */
const makeOrder = async (status = "pending_payment", { dueInHours = 48, auctionStatus = "ended" } = {}) => {
  const [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id, settled_at)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 5000, 100, now() - interval '1 hour', ${auctionStatus}, ${buyer.id}, now()) RETURNING auction_id AS id`;
  const [{ id }] = await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price, status, payment_due_at)
    VALUES (${auctionId}, ${buyer.id}, ${seller.id}, 5000, ${status}, now() + (${dueInHours} * interval '1 hour')) RETURNING order_id AS id`;
  return { id, auctionId };
};
const get = async (id) => (await t.sql`SELECT * FROM orders WHERE order_id = ${id}`)[0];
const auction = async (id) => (await t.sql`SELECT * FROM auctions WHERE auction_id = ${id}`)[0];
const transitions = (id) => t.sql`SELECT from_status, to_status, command, actor_type, actor_id FROM order_transitions WHERE order_id = ${id} ORDER BY id`;
const post = (id, action, who, body = {}) => t.call("POST", `/order/${id}/${action}`, { token: tokens[who], body });

test("manual happy path through the API: proof -> confirm+ship -> receipt, every step audited, lot becomes sold", async () => {
  const { id, auctionId } = await makeOrder();
  assert.equal((await post(id, "payment", "buyer", await withProof(id))).status, 200);
  assert.equal((await get(id)).status, "pending_confirmation");
  assert.equal((await auction(auctionId)).status, "ended", "proof alone does not make the lot sold");

  assert.equal((await post(id, "confirm", "seller", { trackingNumber: "TRK-1" })).status, 200);
  assert.equal((await auction(auctionId)).status, "sold", "payment recorded by the seller -> sold");
  assert.equal((await post(id, "receipt", "buyer")).status, 200);
  const o = await get(id);
  assert.equal(o.status, "pending_review");
  assert.equal(o.version, 3);
  assert.deepEqual((await transitions(id)).map((x) => [x.from_status, x.to_status, x.command, x.actor_id]), [
    ["pending_payment", "pending_confirmation", "submit_payment", buyer.id],
    ["pending_confirmation", "pending_receipt", "confirm_with_shipping", seller.id],
    ["pending_receipt", "pending_review", "confirm_receipt", buyer.id],
  ]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM outbox_events WHERE aggregate_type = 'order' AND aggregate_id = ${id}`)[0].n, 3);
});

test("wrong actor / wrong state is refused with a stable status and nothing changes", async () => {
  const { id } = await makeOrder();
  assert.equal((await post(id, "payment", "seller", proof)).status, 403);
  assert.equal((await post(id, "payment", "other", proof)).status, 403);
  assert.equal((await post(id, "payment", "buyer", { paymentProofUrl: "x" })).status, 400);
  assert.equal((await post(id, "confirm", "seller", { trackingNumber: "T" })).status, 409, "nothing to confirm yet");
  assert.equal((await post(id, "receipt", "buyer")).status, 409);
  assert.equal((await post(id, "shipping", "seller", { trackingNumber: "T" })).status, 409, "payment is not recorded");
  assert.equal((await get(id)).status, "pending_payment");
  assert.equal((await transitions(id)).length, 0);
});

test("duplicate commands: the second payment / receipt / cancel is a clean 409, never a second transition", async () => {
  const { id } = await makeOrder();
  const body = await withProof(id);
  const results = await Promise.all(Array.from({ length: 8 }, () => post(id, "payment", "buyer", body)));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.ok(results.filter((r) => r.status !== 200).every((r) => r.status === 409));
  assert.equal((await transitions(id)).length, 1);

  // same Idempotency-Key replays the stored response instead of 409
  const o2 = await makeOrder();
  const key1 = await withProof(o2.id);
  const call = () => fetch(`${t.base}/order/${o2.id}/payment`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.buyer}`, "Idempotency-Key": "pay-key-0001" }, body: JSON.stringify(key1) }).then((r) => r.status);
  assert.deepEqual(await Promise.all([call(), call(), call()]), [200, 200, 200]);
  assert.equal((await transitions(o2.id)).length, 1);
});

test("stale client: expectedVersion mismatch is rejected", async () => {
  const { id } = await makeOrder();
  const stale = await post(id, "payment", "buyer", await withProof(id, { expectedVersion: 5 }));
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "VERSION_CONFLICT");
  assert.equal((await post(id, "payment", "buyer", await withProof(id, { expectedVersion: 0 }))).status, 200);
});

test("cancel (B09): seller while unpaid, admin until shipping; reason mandatory; no review is created", async () => {
  const a = await makeOrder();
  assert.equal((await post(a.id, "cancel", "seller", {})).status, 400, "reason required");
  assert.equal((await post(a.id, "cancel", "buyer", { reason: "changed my mind" })).status, 403);
  assert.equal((await post(a.id, "cancel", "seller", { reason: "item damaged" })).status, 200);
  const o = await get(a.id);
  assert.deepEqual([o.status, o.cancelled_by, o.cancel_reason], ["cancelled", seller.id, "item damaged"]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM reviews WHERE auction_id = ${a.auctionId}`)[0].n, 0, "no automatic negative review");
  assert.equal((await t.sql`SELECT rating_count FROM users WHERE user_id = ${buyer.id}`)[0].rating_count, 0);
  // terminal: nothing moves any more
  for (const [action, who, body] of [["payment", "buyer", proof], ["confirm", "seller", { trackingNumber: "T" }], ["receipt", "buyer", {}], ["cancel", "seller", { reason: "again" }]]) {
    assert.equal((await post(a.id, action, who, body)).status, 409, action);
  }

  const paid = await makeOrder("pending_confirmation");
  assert.equal((await post(paid.id, "cancel", "seller", { reason: "x y z" })).status, 409, "seller cannot cancel after the buyer paid");
  assert.equal((await post(paid.id, "cancel", "admin", { reason: "fraud suspected" })).status, 200);
  assert.equal((await auction(paid.auctionId)).status, "ended", "unpaid-confirmed lot stays ended");

  const delivery = await makeOrder("pending_delivery", { auctionStatus: "sold" });
  assert.equal((await post(delivery.id, "cancel", "admin", { reason: "payment dispute" })).status, 200);
  const a2 = await auction(delivery.auctionId);
  assert.deepEqual([a2.status, a2.close_reason], ["cancelled", "cancelled_after_payment"]);

  const shipped = await makeOrder("pending_receipt");
  assert.equal((await post(shipped.id, "cancel", "admin", { reason: "too late" })).status, 409);
});

test("pending_delivery (adapter/legacy) uses the separate shipping endpoint", async () => {
  const { id, auctionId } = await makeOrder("pending_delivery", { auctionStatus: "sold" });
  assert.equal((await post(id, "shipping", "buyer", { trackingNumber: "T" })).status, 403);
  assert.equal((await post(id, "shipping", "seller", {})).status, 400);
  assert.equal((await post(id, "shipping", "seller", { trackingNumber: "TRK-9" })).status, 200);
  assert.equal((await get(id)).status, "pending_receipt");
  assert.equal((await auction(auctionId)).status, "sold");
});

test("payment expiry (B08): after the deadline the worker expires the order; proof submitted late is refused; the lot is not reopened", async () => {
  const { id, auctionId } = await makeOrder("pending_payment", { dueInHours: -1 });
  const late = await post(id, "payment", "buyer", proof);
  assert.equal(late.status, 409);
  assert.equal(late.body.code, "PAYMENT_WINDOW_CLOSED");
  const open = await makeOrder("pending_payment", { dueInHours: 1 });
  const r = await orderSvc.expireDuePayments();
  assert.ok(r.expired >= 1 && r.failed.length === 0);
  const o = await get(id);
  assert.deepEqual([o.status, o.close_reason], ["payment_expired", "payment_expired"]);
  assert.equal((await get(open.id)).status, "pending_payment", "orders still inside the window are untouched");
  assert.equal((await auction(auctionId)).status, "ended", "expiry never reopens the lot");
  assert.deepEqual((await transitions(id)).map((x) => [x.command, x.actor_type]), [["expire", "system"]]);
  for (const [action, who, body] of [["payment", "buyer", proof], ["confirm", "seller", { trackingNumber: "T" }], ["cancel", "seller", { reason: "late cancel" }]]) {
    assert.equal((await post(id, action, who, body)).status, 409, action);
  }
  await orderSvc.expireDuePayments();
  assert.equal((await transitions(id)).length, 1, "expiry runs once");
});

test("payment × expiry race (25 rounds): exactly one of them wins, the order never ends up inconsistent", async () => {
  for (let round = 0; round < 25; round++) {
    const { id } = await makeOrder("pending_payment", { dueInHours: 0 });
    const body = await withProof(id); // prepared before the clock starts so the race is about the deadline, not the upload
    await t.sql`UPDATE orders SET payment_due_at = now() + interval '${t.sql.unsafe(String(40 + (round % 5) * 10))} milliseconds' WHERE order_id = ${id}`;
    await new Promise((r) => setTimeout(r, 30 + (round % 5) * 10));
    const [pay] = await Promise.all([post(id, "payment", "buyer", body), orderSvc.expireDuePayments(), orderSvc.expireDuePayments()]);
    // an expiry pass that ran a hair before the deadline correctly skipped; the next pass (worker poll) settles it
    await new Promise((r) => setTimeout(r, 120));
    await orderSvc.expireDuePayments();
    const o = await get(id);
    const tr = await transitions(id);
    const why = `round ${round}: order=${o.status} v${o.version} transitions=${JSON.stringify(tr)} pay=${pay.status} ${JSON.stringify(pay.body)}`; // full context if this ever flakes again
    assert.ok(["pending_confirmation", "payment_expired"].includes(o.status), why);
    assert.equal(tr.length, 1, why);
    assert.equal(o.status === "pending_confirmation", pay.status === 200, why);
    assert.equal(o.version, 1, why);
  }
});

test("cancel × shipping race: either the cancel or the confirmation wins, never both", async () => {
  for (let round = 0; round < 15; round++) {
    const { id } = await makeOrder("pending_confirmation");
    const [cancel, confirm] = await Promise.all([post(id, "cancel", "admin", { reason: "dispute" }), post(id, "confirm", "seller", { trackingNumber: "T" })]);
    const o = await get(id);
    assert.equal([cancel.status, confirm.status].filter((s) => s === 200).length, 1, `round ${round}`);
    assert.equal(o.status, cancel.status === 200 ? "cancelled" : "pending_receipt");
    assert.equal((await transitions(id)).length, 1);
  }
});

test("two workers expire the same overdue orders without double transitions", async () => {
  const ids = [];
  for (let i = 0; i < 12; i++) ids.push((await makeOrder("pending_payment", { dueInHours: -2 })).id);
  const runs = await Promise.all([orderSvc.expireDuePayments({ limit: 100 }), orderSvc.expireDuePayments({ limit: 100 })]);
  assert.equal(runs.flatMap((r) => r.failed).length, 0);
  for (const id of ids) {
    assert.equal((await get(id)).status, "payment_expired");
    assert.equal((await transitions(id)).length, 1);
  }
});

test("review completion goes through the state machine and the order list shows the new statuses", async () => {
  const { id } = await makeOrder("pending_review");
  assert.equal((await post(id, "review", "buyer", { isGoodRating: true, comment: "great" })).status, 200);
  assert.equal((await get(id)).status, "pending_review", "needs both reviews");
  assert.equal((await post(id, "review", "seller", { isGoodRating: true, comment: "thanks" })).status, 200);
  assert.equal((await get(id)).status, "completed");
  assert.deepEqual((await transitions(id)).map((x) => x.command), ["complete"]);
  const mine = await t.call("GET", "/order/my", { token: tokens.buyer });
  assert.ok(mine.body.orders.some((o) => o.id === id && o.status === "completed"));
});

test("new orders carry a payment deadline (default 48h) for Buy Now and for settlement", async () => {
  const [{ id: aId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, buy_now_price, end_time)
    VALUES (${seller.id}, ${categoryId}, 'bn', 'd', 1000, 1000, 100, 9000, now() + interval '1 day') RETURNING auction_id AS id`;
  const bn = await t.call("POST", `/auction/${aId}/buy-now`, { token: tokens.buyer });
  assert.equal(bn.status, 200, JSON.stringify(bn.body));
  const o = (await t.sql`SELECT extract(epoch FROM (payment_due_at - created_at))/3600 AS hours, payment_mode FROM orders WHERE order_id = ${bn.body.orderId}`)[0];
  assert.ok(Math.abs(Number(o.hours) - 48) < 0.01);
  assert.equal(o.payment_mode, "manual");

  const settle = await import("../../services/settlement.js");
  const [{ id: bId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${categoryId}, 'st', 'd', 1000, 1000, 100, now() + interval '1 day') RETURNING auction_id AS id`;
  assert.equal((await t.call("POST", `/auction/${bId}/bid`, { token: tokens.other, body: { amount: 2000 } })).status, 200);
  await t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ${bId}`;
  await settle.settleDue();
  const so = (await t.sql`SELECT extract(epoch FROM (payment_due_at - created_at))/3600 AS hours FROM orders WHERE auction_id = ${bId}`)[0];
  assert.ok(Math.abs(Number(so.hours) - 48) < 0.01);
});
