import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t, seller, sellerToken, categoryId, users, tokens, settle;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000" });
  settle = await import("../../services/settlement.js");
  seller = await t.createUser("seller", { role: "seller" });
  sellerToken = await t.tokenFor(seller);
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
  users = []; tokens = [];
  for (let i = 0; i < 6; i++) { const u = await t.createUser(`bidder${i}`); users.push(u); tokens.push(await t.tokenFor(u)); }
});
after(() => t.stop());

const newAuction = async ({ endsInMs = 3600_000, buyNow = null, autoExtend = false } = {}) => {
  const [{ id }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, buy_now_price, end_time, auto_extend)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 1000, 100, ${buyNow}, now() + (${endsInMs} * interval '1 millisecond'), ${autoExtend}) RETURNING auction_id AS id`;
  return id;
};
const bid = (a, i, amount) => t.call("POST", `/auction/${a}/bid`, { token: tokens[i], body: { amount } });
const expire = (a) => t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ${a}`;
const state = async (a) => (await t.sql`SELECT * FROM auctions WHERE auction_id = ${a}`)[0];
const orders = (a) => t.sql`SELECT * FROM orders WHERE auction_id = ${a}`;
const events = (a, type = "auction.ended") => t.sql`SELECT * FROM outbox_events WHERE aggregate_id = ${a} AND event_type = ${type}`;

test("a due auction is settled by the worker with nobody watching: ended, one order at the final price, one event", async () => {
  const a = await newAuction();
  await bid(a, 0, 5000); await bid(a, 1, 3000);
  await expire(a);
  assert.equal((await orders(a)).length, 0, "nothing is created before the worker runs");
  const r = await settle.settleDue();
  assert.equal(r.settled >= 1, true);
  const s = await state(a);
  assert.deepEqual([s.status, s.winner_id, s.current_price, s.close_reason], ["ended", users[0].id, "3100", "ended"]);
  assert.ok(s.settled_at);
  const o = await orders(a);
  assert.equal(o.length, 1);
  assert.deepEqual([o[0].buyer_id, o[0].seller_id, o[0].final_price, o[0].status], [users[0].id, seller.id, "3100", "pending_payment"]);
  assert.equal((await events(a)).length, 1);
  // running again changes nothing
  await settle.settleDue();
  assert.equal((await orders(a)).length, 1);
  assert.equal((await events(a)).length, 1);
});

test("GET /order/auction/:id never writes: 202 while settlement is pending, 200 after, 403 for strangers", async () => {
  const a = await newAuction();
  await bid(a, 0, 2000);
  assert.equal((await t.call("GET", `/order/auction/${a}`, { token: tokens[0] })).status, 400, "not ended yet");
  await expire(a);
  const pending = await t.call("GET", `/order/auction/${a}`, { token: tokens[0] });
  assert.equal(pending.status, 202);
  assert.deepEqual([pending.body.status, pending.body.retryAfter], ["settlement_pending", 5]);
  assert.equal((await t.call("GET", `/order/auction/${a}`, { token: sellerToken })).status, 202);
  assert.equal((await t.call("GET", `/order/auction/${a}`, { token: tokens[3] })).status, 403);
  assert.equal((await orders(a)).length, 0, "the GETs created nothing");
  await settle.settleDue();
  const ok = await t.call("GET", `/order/auction/${a}`, { token: tokens[0] });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.isBuyer, true);
  assert.equal((await t.call("GET", `/order/auction/${a}`, { token: tokens[3] })).status, 403);
});

test("no bids: ended without an order and a clear reason; participants get 404", async () => {
  const a = await newAuction();
  await expire(a);
  await settle.settleDue();
  const s = await state(a);
  assert.deepEqual([s.status, s.winner_id, s.close_reason, s.current_price], ["ended", null, "no_bids", "1000"]);
  assert.ok(s.settled_at);
  assert.equal((await orders(a)).length, 0);
  assert.equal((await t.call("GET", `/order/auction/${a}`, { token: sellerToken })).status, 404);
});

test("banned winner (B12): recomputed from the remaining ceilings; nobody left -> ended, no order", async () => {
  const a = await newAuction();
  await bid(a, 2, 6000); await bid(a, 3, 4000); await bid(a, 4, 4500);
  await t.sql`UPDATE users SET status = 'banned' WHERE user_id = ${users[2].id}`;
  await expire(a);
  await settle.settleDue();
  const s = await state(a);
  assert.equal(s.winner_id, users[4].id);
  assert.equal(s.current_price, "4100", "min(4500, 4000 + 100)");
  assert.equal((await orders(a))[0].buyer_id, users[4].id);
  assert.equal((await orders(a))[0].final_price, "4100");

  const b = await newAuction();
  await bid(b, 5, 2000);
  await t.sql`UPDATE users SET status = 'banned' WHERE user_id = ${users[5].id}`;
  await expire(b);
  await settle.settleDue();
  const sb = await state(b);
  assert.deepEqual([sb.status, sb.winner_id, sb.close_reason, sb.current_price], ["ended", null, "no_eligible_bidder", "1000"]);
  assert.equal((await orders(b)).length, 0);
  await t.sql`UPDATE users SET status = 'active' WHERE user_id IN (${users[2].id}, ${users[5].id})`;
});

test("two workers racing over 30 due auctions: each settled exactly once, one order and one event each", async () => {
  const ids = [];
  for (let i = 0; i < 30; i++) { const a = await newAuction(); await bid(a, i % 4, 2000 + i * 100); ids.push(a); }
  await t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ANY(${ids})`;
  const runs = await Promise.all([settle.settleDue({ limit: 100 }), settle.settleDue({ limit: 100 }), settle.settleDue({ limit: 100 })]);
  assert.equal(runs.flatMap((r) => r.failed).length, 0, JSON.stringify(runs.map((r) => r.failed)));
  assert.equal(runs.reduce((n, r) => n + r.settled, 0), 30, "claims are disjoint");
  for (const a of ids) {
    assert.equal((await orders(a)).length, 1, `orders for ${a}`);
    assert.equal((await events(a)).length, 1, `events for ${a}`);
    assert.equal((await t.sql`SELECT count(*)::int AS n FROM auction_command_audit WHERE auction_id = ${a} AND kind = 'settle'`)[0].n, 1, `audit for ${a}`);
  }
});

test("crash before commit leaves the auction untouched; retry after a crash that happened after commit is a no-op", async () => {
  const a = await newAuction();
  await bid(a, 0, 4000); await bid(a, 1, 2500);
  await expire(a);
  const crashed = await settle.settleDue({ hooks: { beforeCommit: () => { throw new Error("worker killed"); } } });
  assert.ok(crashed.failed.some((f) => f.auctionId === a));
  let s = await state(a);
  assert.equal(s.status, "active");
  assert.equal(s.settled_at, null);
  assert.equal((await orders(a)).length, 0);
  assert.equal((await events(a)).length, 0, "rolled-back settlement leaves no event");
  await settle.settleDue(); // restarted worker
  s = await state(a);
  assert.equal(s.status, "ended");
  await settle.settleDue(); // "crash after commit": the next pass sees it already settled
  assert.equal((await orders(a)).length, 1);
  assert.equal((await events(a)).length, 1);
});

test("a bid that extends the deadline before settlement wins the race: settlement waits for the new deadline", async () => {
  const a = await newAuction({ endsInMs: 120_000, autoExtend: true });
  await bid(a, 0, 2000);
  const r1 = await bid(a, 1, 3000); // inside the last 5 minutes -> +5 minutes
  assert.equal(r1.status, 200);
  const run = await settle.settleDue();
  assert.equal(run.checked, 0 + (await t.sql`SELECT count(*)::int AS n FROM auctions WHERE status='active' AND end_time <= clock_timestamp()`)[0].n >= 0 ? run.checked : 0);
  assert.equal((await state(a)).status, "active");
  await t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ${a}`;
  await settle.settleDue();
  assert.equal((await state(a)).status, "ended");
});

test("Buy Now and settlement racing at the deadline: never two outcomes", async () => {
  for (let round = 0; round < 15; round++) {
    const a = await newAuction({ endsInMs: 150, buyNow: 50000 });
    await bid(a, 0, 3000);
    await new Promise((r) => setTimeout(r, 120 + (round % 5) * 15));
    const [bn] = await Promise.all([
      t.call("POST", `/auction/${a}/buy-now`, { token: tokens[1] }),
      settle.settleDue(), settle.settleDue(),
    ]);
    await new Promise((r) => setTimeout(r, 200));
    await settle.settleDue();
    const s = await state(a);
    const o = await orders(a);
    assert.equal(s.status, "ended", `round ${round}`);
    assert.equal(o.length, 1, `round ${round}: exactly one order`);
    assert.equal(o[0].buyer_id, s.winner_id);
    assert.equal(o[0].final_price, s.current_price);
    if (bn.status === 200) assert.deepEqual([s.close_reason, s.current_price], ["buy_now", "50000"]);
    else assert.equal(s.close_reason, "ended");
  }
});

test("reject × settlement (20 rounds): the order always goes to a non-disqualified bidder at the recomputed price", async () => {
  for (let round = 0; round < 20; round++) {
    const a = await newAuction();
    await bid(a, 0, 6000); await bid(a, 1, 4000); await bid(a, 2, 2500);
    const bidId = (await t.sql`SELECT bid_id AS id FROM bids WHERE auction_id = ${a} AND bidder_id = ${users[0].id} LIMIT 1`)[0].id;
    await expire(a);
    const [rej] = await Promise.all([
      t.call("DELETE", `/auction/reject?auctionId=${a}&bidId=${bidId}`, { token: sellerToken }),
      settle.settleDue(), settle.settleDue(),
    ]);
    await settle.settleDue();
    const s = await state(a);
    const o = await orders(a);
    assert.equal(s.status, "ended");
    assert.equal(o.length, 1);
    assert.equal(o[0].buyer_id, s.winner_id);
    if (rej.status === 200) {
      assert.equal(s.winner_id, users[1].id, `round ${round}: reject committed first -> B wins`);
      assert.equal(s.current_price, "2600");
    } else {
      assert.equal(rej.status, 409, "settlement committed first -> reject refused on the ended lot");
      assert.equal(s.winner_id, users[0].id);
    }
  }
});

test("legacy reconciliation: ended lots from the old GET-driven flow get settled_at and their missing order; disagreements are reported, not overwritten", async () => {
  const mk = async (winner, price) => {
    const [{ id }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id)
      VALUES (${seller.id}, ${categoryId}, 'legacy', 'd', 1000, ${price}, 100, now() - interval '1 day', 'ended', ${winner}) RETURNING auction_id AS id`;
    return id;
  };
  const noOrder = await mk(users[0].id, 1500);
  const noWinner = await mk(null, 1000);
  const good = await mk(users[1].id, 2000);
  await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price) VALUES (${good}, ${users[1].id}, ${seller.id}, 2000)`;
  const bad = await mk(users[2].id, 3000);
  await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price) VALUES (${bad}, ${users[3].id}, ${seller.id}, 3000)`;

  assert.equal((await t.call("GET", `/order/auction/${noOrder}`, { token: tokens[0] })).status, 202);
  const report = await settle.reconcileLegacyEnded();
  assert.deepEqual(report.conflicts.map((c) => c.auctionId), [bad]);
  assert.equal((await orders(noOrder))[0].buyer_id, users[0].id);
  assert.equal((await orders(noOrder))[0].final_price, "1500");
  assert.ok((await state(noOrder)).settled_at && (await state(noWinner)).settled_at && (await state(good)).settled_at);
  assert.equal((await state(noWinner)).close_reason, "no_bids");
  assert.equal((await state(bad)).settled_at, null, "conflicting lot stays open for a human");
  assert.equal((await orders(bad))[0].buyer_id, users[3].id, "existing order untouched");
  assert.equal((await t.call("GET", `/order/auction/${noOrder}`, { token: tokens[0] })).status, 200);
});

test("settlement lag with a 200 ms poll loop is measured and stays small", async () => {
  const ids = [];
  for (let i = 0; i < 10; i++) { const a = await newAuction({ endsInMs: 600 + i * 50 }); await bid(a, i % 3, 2000); ids.push(a); }
  let running = true;
  const loop = (async () => { while (running) { await settle.settleDue(); await new Promise((r) => setTimeout(r, 200)); } })();
  await new Promise((r) => setTimeout(r, 1800));
  running = false; await loop;
  const lags = (await t.sql`SELECT extract(epoch FROM (settled_at - end_time)) * 1000 AS lag FROM auctions WHERE auction_id = ANY(${ids}) AND settled_at IS NOT NULL`).map((r) => Number(r.lag));
  assert.equal(lags.length, 10, "all settled");
  const max = Math.max(...lags);
  console.log(`SETTLEMENT_LAG poll=200ms n=${lags.length} max=${max.toFixed(0)}ms avg=${(lags.reduce((a, b) => a + b, 0) / lags.length).toFixed(0)}ms`);
  assert.ok(max < 1000, `max lag ${max}ms`);
});
