import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";
import { recompute, rank } from "../../domain/bidding.ts";

let t, seller, sellerToken, admin, adminToken, categoryId, users, tokens;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000" });
  seller = await t.createUser("seller", { role: "seller" });
  sellerToken = await t.tokenFor(seller);
  admin = await t.createUser("admin", { role: "admin" });
  adminToken = await t.tokenFor(admin);
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
  users = []; tokens = [];
  for (let i = 0; i < 8; i++) { const u = await t.createUser(`bidder${i}`); users.push(u); tokens.push(await t.tokenFor(u)); }
});
after(() => t.stop());

const newAuction = async ({ buyNow = null } = {}) => {
  const [{ id }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, buy_now_price, end_time)
    VALUES (${seller.id}, ${categoryId}, 'lot', '<p>first</p>', 1000, 1000, 100, ${buyNow}, now() + interval '1 hour') RETURNING auction_id AS id`;
  return id;
};
const bid = (a, i, amount) => t.call("POST", `/auction/${a}/bid`, { token: tokens[i], body: { amount } });
const reject = (a, bidId, token = sellerToken, reason) => t.call("DELETE", `/auction/reject?auctionId=${a}&bidId=${bidId}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`, { token });
const state = async (a) => (await t.sql`SELECT * FROM auctions WHERE auction_id = ${a}`)[0];
const bidIdOf = async (a, bidder) => (await t.sql`SELECT bid_id AS id FROM bids WHERE auction_id = ${a} AND bidder_id = ${users[bidder].id} ORDER BY bid_id LIMIT 1`)[0].id;

test("recomputed price after a reject follows the proxy formula and may go down (audited correction)", async () => {
  const a = await newAuction();
  await bid(a, 0, 5000); await bid(a, 1, 3000); await bid(a, 2, 4000);
  assert.equal((await state(a)).current_price, "4100");
  assert.equal((await reject(a, await bidIdOf(a, 0))).status, 200);
  const after = await state(a);
  const eligible = (await t.sql`SELECT bidder_id, max_amount, priority_sequence FROM bidder_maxima WHERE auction_id = ${a} AND disqualified_at IS NULL`)
    .map((m) => ({ bidderId: m.bidder_id, max: BigInt(m.max_amount), priority: Number(m.priority_sequence) }));
  const expected = recompute({ startingPrice: 1000n, step: 100n, maxima: eligible });
  assert.equal(after.winner_id, expected.leaderId);
  assert.equal(after.current_price, expected.currentPrice.toString());
  assert.equal(after.current_price, "3100");
  assert.equal(after.winner_id, users[2].id);

  // history is preserved and flagged; count is not decremented
  const history = (await t.call("GET", `/auction/bids/${a}`)).body;
  assert.ok(history.some((h) => h.bidderId === users[0].id && h.invalidated === true));
  assert.equal(after.bid_count, 3);
  // public top bid on cards ignores invalidated rows
  const top = (await t.call("GET", "/auction/top")).body.find((x) => x.id === a);
  assert.equal(top.bids.bidder.username, "bidder2");
  assert.equal(top.bids.amount, "3100");
  // audit trail has the private details, public DTO does not
  const [aud] = await t.sql`SELECT kind, private_payload FROM auction_command_audit WHERE auction_id = ${a} AND kind = 'disqualify'`;
  assert.equal(aud.private_payload.bidderId, users[0].id);
  assert.ok(!JSON.stringify(history).includes("5000"));
  assert.ok(Number(after.version) > 0);
});

test("the disqualified bidder can no longer bid or Buy Now on that lot, but can on others", async () => {
  const a = await newAuction({ buyNow: 90000 });
  await bid(a, 0, 5000); await bid(a, 1, 3000);
  assert.equal((await reject(a, await bidIdOf(a, 0))).status, 200);
  const again = await bid(a, 0, 8000);
  assert.equal(again.status, 403);
  assert.equal(again.body.code, "BIDDER_DISQUALIFIED");
  assert.equal((await t.call("POST", `/auction/${a}/buy-now`, { token: tokens[0] })).body.code, "BIDDER_DISQUALIFIED");
  const caps = (await t.call("GET", `/auction/${a}`, { token: tokens[0] })).body.capabilities;
  assert.deepEqual([caps.canBid, caps.canBuyNow, caps.reasons.bid], [false, false, "BIDDER_DISQUALIFIED"]);
  const other = await newAuction();
  assert.equal((await bid(other, 0, 2000)).status, 200);
});

test("retrying a reject is a no-op: no second decrement, no second audit row, same version", async () => {
  const a = await newAuction();
  await bid(a, 0, 5000); await bid(a, 1, 3000);
  const id = await bidIdOf(a, 0);
  const first = await reject(a, id);
  const mid = await state(a);
  const second = await reject(a, id);
  assert.equal(first.body.alreadyRejected, false);
  assert.equal(second.body.alreadyRejected, true);
  const end = await state(a);
  assert.deepEqual([end.version, end.bid_count, end.current_price, end.winner_id], [mid.version, mid.bid_count, mid.current_price, mid.winner_id]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM auction_command_audit WHERE auction_id = ${a} AND kind = 'disqualify'`)[0].n, 1);
});

test("rejecting every bidder leaves no winner and the starting price", async () => {
  const a = await newAuction();
  await bid(a, 0, 5000); await bid(a, 1, 3000);
  await reject(a, await bidIdOf(a, 0)); await reject(a, await bidIdOf(a, 1));
  const s = await state(a);
  assert.deepEqual([s.winner_id, s.current_price], [null, "1000"]);
  // and the lot is open again for fresh bidders
  assert.equal((await bid(a, 2, 1000)).body.outcome, "success");
});

test("only the owning seller can reject, only on active lots, only existing bids of that lot", async () => {
  const a = await newAuction();
  await bid(a, 0, 5000);
  const id = await bidIdOf(a, 0);
  const other = await newAuction();
  await bid(other, 1, 4000);
  const otherBid = await bidIdOf(other, 1);
  assert.equal((await reject(a, id, tokens[1])).status, 403);
  assert.equal((await reject(a, id, adminToken)).status, 403, "reject is a seller power");
  assert.equal((await reject(a, 999999)).status, 404);
  assert.equal((await reject(a, otherBid)).status, 404, "bid belongs to a different lot");
  assert.equal((await t.call("DELETE", `/auction/reject?auctionId=${a}`, { token: sellerToken })).status, 400);
  await t.sql`UPDATE auctions SET status = 'ended' WHERE auction_id = ${a}`;
  assert.equal((await reject(a, id)).status, 409);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM bidder_maxima WHERE auction_id = ${a} AND disqualified_at IS NOT NULL`)[0].n, 0);
});

test("reject × bid race (25 rounds): the disqualified bidder never leads and state matches the eligible ceilings", async () => {
  for (let round = 0; round < 25; round++) {
    const a = await newAuction();
    await bid(a, 0, 5000);
    await bid(a, 1, 3000);
    const id = await bidIdOf(a, 0);
    await Promise.all([reject(a, id), bid(a, 2, 4000 + round * 100), bid(a, 0, 6000 + round * 100), bid(a, 3, 2500)]);
    const s = await state(a);
    const maxima = await t.sql`SELECT bidder_id, max_amount, priority_sequence, disqualified_at FROM bidder_maxima WHERE auction_id = ${a}`;
    const eligible = maxima.filter((m) => !m.disqualified_at).map((m) => ({ bidderId: m.bidder_id, max: BigInt(m.max_amount), priority: Number(m.priority_sequence) }));
    assert.ok(maxima.find((m) => m.bidder_id === users[0].id).disqualified_at, "A is out whatever the interleaving");
    assert.equal(s.winner_id, rank(eligible)[0].bidderId, `round ${round}`);
    assert.notEqual(s.winner_id, users[0].id);
    assert.ok(BigInt(s.current_price) <= rank(eligible)[0].max);
  }
});

test("reject × Buy Now race: never an order for the disqualified buyer, never two orders", async () => {
  for (let round = 0; round < 15; round++) {
    const a = await newAuction({ buyNow: 90000 });
    await bid(a, 0, 5000);
    const id = await bidIdOf(a, 0);
    await Promise.all([reject(a, id), t.call("POST", `/auction/${a}/buy-now`, { token: tokens[0] })]);
    const orders = await t.sql`SELECT buyer_id FROM orders WHERE auction_id = ${a}`;
    assert.ok(orders.length <= 1);
    const s = await state(a);
    if (orders.length === 1) {
      // Buy Now committed first; the late reject must have been refused on the ended lot
      assert.equal(s.status, "ended");
      assert.equal((await t.sql`SELECT disqualified_at FROM bidder_maxima WHERE auction_id = ${a} AND bidder_id = ${users[0].id}`)[0].disqualified_at, null);
    } else {
      assert.equal(s.status, "active");
      assert.notEqual(s.winner_id, users[0].id);
    }
  }
});

test("cancelling a lot never deletes it: bids stay, bidding stops, owner or admin only", async () => {
  const a = await newAuction();
  await bid(a, 0, 5000); await bid(a, 1, 3000);
  assert.equal((await t.call("DELETE", `/auction/${a}`, { token: tokens[2] })).status, 403);
  const r = await t.call("DELETE", `/auction/${a}?reason=item%20damaged`, { token: sellerToken });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const s = await state(a);
  assert.deepEqual([s.status, s.winner_id, s.close_reason], ["cancelled", null, "cancelled"]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM bids WHERE auction_id = ${a}`)[0].n, 2, "history intact");
  assert.equal((await bid(a, 2, 9000)).body.code, "AUCTION_NOT_ACTIVE");
  assert.equal((await t.call("DELETE", `/auction/${a}`, { token: sellerToken })).status, 409, "already cancelled");
  const b = await newAuction();
  assert.equal((await t.call("DELETE", `/auction/${b}?reason=policy%20violation`, { token: adminToken })).status, 200, "admin moderation path");
});

test("a lot with a transaction cannot be cancelled or deleted", async () => {
  const a = await newAuction({ buyNow: 9000 });
  await t.call("POST", `/auction/${a}/buy-now`, { token: tokens[0] });
  assert.equal((await t.call("DELETE", `/auction/${a}`, { token: sellerToken })).status, 409);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM orders WHERE auction_id = ${a}`)[0].n, 1);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM auctions WHERE auction_id = ${a}`)[0].n, 1);
});

test("editing: title/category freeze after the first bid; description keeps its history", async () => {
  const a = await newAuction();
  assert.equal((await t.call("PUT", `/auction/${a}`, { token: sellerToken, body: { title: "New title" } })).status, 200);
  await bid(a, 0, 2000);
  const locked = await t.call("PUT", `/auction/${a}`, { token: sellerToken, body: { title: "Sneaky rename" } });
  assert.equal(locked.body.code, "LISTING_LOCKED");
  const d = await t.call("PUT", `/auction/${a}/description`, { token: sellerToken, body: { description: "<p>second</p>" } });
  assert.equal(d.status, 200);
  assert.match(d.body.description, /second/);
  const history = (await t.call("GET", `/auction/description/${a}`)).body.history;
  assert.ok(history.some((h) => /first/.test(h.contentSnapshot)));
  assert.equal((await t.call("PUT", `/auction/${a}/description`, { token: tokens[1], body: { description: "<p>x</p>" } })).status, 403);
});
