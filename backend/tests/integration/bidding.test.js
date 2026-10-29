import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";
import { decideBid, rank } from "../../domain/bidding.ts";

let t, seller, categoryId, users, tokens;
const N_USERS = 60;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000" });
  seller = await t.createUser("seller", { role: "seller" });
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
  users = [];
  tokens = [];
  for (let i = 0; i < N_USERS; i++) {
    const u = await t.createUser(`bidder${i}`);
    users.push(u);
    tokens.push(await t.tokenFor(u));
  }
});
after(() => t.stop());

const newAuction = async ({ start = 1000, step = 100, buyNow = null, endsInSec = 3600, autoExtend = false, allowNewbies = true } = {}) => {
  const [{ id }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, buy_now_price, end_time, auto_extend, allow_newbies)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', ${start}, ${start}, ${step}, ${buy_now(buyNow)}, now() + (${endsInSec} * interval '1 second'), ${autoExtend}, ${allowNewbies}) RETURNING auction_id AS id`;
  return id;
};
const buy_now = (v) => v; // postgres.js binds null/number directly

const bid = (auction, i, amount, key) => t.call("POST", `/auction/${auction}/bid`, { token: tokens[i], body: { amount } , ...(key ? {} : {}) }).then((r) => r);
const bidWithKey = async (auction, i, amount, key) => {
  const res = await fetch(`${t.base}/auction/${auction}/bid`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens[i]}`, "Idempotency-Key": key }, body: JSON.stringify({ amount }) });
  return { status: res.status, body: await res.json(), replayed: res.headers.get("idempotent-replayed") };
};
// postgres-js timestamps are strings once drizzle shares its parsers; normalise the one column we do arithmetic on
const state = async (auction) => { const r = (await t.sql`SELECT * FROM auctions WHERE auction_id = ${auction}`)[0]; return { ...r, end_time: new Date(r.end_time) }; };
const historyAmounts = async (auction) => (await t.sql`SELECT amount FROM bids WHERE auction_id = ${auction} ORDER BY auction_sequence`).map((r) => r.amount);

test("worked example over HTTP: outcomes, public price, private ceilings stay private", async () => {
  const a = await newAuction();
  const steps = [[0, 2000, "success", "1000", 0], [1, 1500, "outbid", "1600", 0], [0, 2500, "updated", "1600", 0], [1, 2500, "outbid", "2500", 0], [2, 2600, "success", "2600", 2]];
  for (const [i, amount, outcome, price, leader] of steps) {
    const r = await bid(a, i, amount);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.outcome, outcome);
    assert.equal(r.body.currentPrice, price);
    assert.equal(r.body.isLeading, i === leader);
    assert.equal(r.body.yourMaximum, String(amount), "the caller sees only their own ceiling");
  }
  const s = await state(a);
  assert.equal(s.current_price, "2600");
  assert.equal(s.winner_id, users[2].id);
  assert.equal(s.bid_count, 4, "leader raise is not a public bid");
  assert.deepEqual(await historyAmounts(a), ["1000", "1600", "2500", "2600"]);
  const pub = JSON.stringify((await t.call("GET", `/auction/bids/${a}`)).body);
  for (const secret of ["1500", "2000"]) assert.ok(!pub.includes(`"${secret}"`), `ceiling ${secret} leaked into public history`);
  // minimum next bid is derived from canonical state
  const detail = (await t.call("GET", `/auction/${a}`, { token: tokens[5] })).body;
  assert.equal(detail.minimumNextBid, "2700");
  assert.equal(detail.capabilities.canBid, true);
  assert.equal(detail.version, s.version);
});

test("50 concurrent bids from distinct users: one serial history, committed order replays to the same result", async () => {
  const a = await newAuction({ start: 1000, step: 100 });
  const amounts = Array.from({ length: 50 }, (_, i) => 1000 + ((i * 37) % 50) * 100 + i * 100); // distinct ceilings
  const results = await Promise.all(amounts.map((amount, i) => bid(a, i, amount)));
  assert.ok(results.every((r) => r.status === 200 || r.status === 400), JSON.stringify(results.filter((r) => ![200, 400].includes(r.status)).map((r) => r.body)));

  // replay the committed order (audit sequence) through the pure engine and compare with what the DB ended with
  const audit = await t.sql`SELECT sequence, actor_id, decision, private_payload FROM auction_command_audit WHERE auction_id = ${a} ORDER BY sequence`;
  const seqs = audit.map((r) => Number(r.sequence));
  assert.deepEqual(seqs, seqs.map((_, i) => i + 1), "sequences are contiguous: no two commands interleaved");
  let sim = { startingPrice: 1000n, step: 100n, currentPrice: 1000n, maxima: [] };
  for (const row of audit) {
    const r = decideBid(sim, { bidderId: row.actor_id, amount: BigInt(row.private_payload.maximum), sequence: Number(row.sequence) });
    assert.equal(r.outcome, row.decision);
    sim = { ...sim, currentPrice: r.currentPrice, maxima: r.maxima };
  }
  const s = await state(a);
  assert.equal(s.current_price, sim.currentPrice.toString());
  assert.equal(s.winner_id, rank(sim.maxima)[0].bidderId);
  const maxima = await t.sql`SELECT bidder_id, max_amount FROM bidder_maxima WHERE auction_id = ${a}`;
  assert.equal(maxima.length, audit.length - audit.filter((r) => r.decision === "rejected").length);
  const rows = await t.sql`SELECT count(*)::int AS n, count(DISTINCT auction_sequence)::int AS d FROM bids WHERE auction_id = ${a}`;
  assert.equal(rows[0].n, s.bid_count);
  assert.equal(rows[0].n, rows[0].d, "every public event has its own sequence");
  // price history is monotone
  const prices = (await historyAmounts(a)).map(BigInt);
  for (let i = 1; i < prices.length; i++) assert.ok(prices[i] >= prices[i - 1]);
});

test("equal ceilings bid concurrently: whoever commits first leads, price equals the ceiling", async () => {
  const a = await newAuction({ start: 1000, step: 100 });
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => bid(a, i, 5000)));
  const wins = results.filter((r) => r.body.outcome === "success");
  assert.equal(wins.length, 1, "exactly one bidder holds the lead");
  const first = (await t.sql`SELECT actor_id FROM auction_command_audit WHERE auction_id = ${a} ORDER BY sequence LIMIT 1`)[0];
  const s = await state(a);
  assert.equal(s.winner_id, first.actor_id, "first committed command keeps priority");
  assert.equal(s.current_price, "5000");
});

test("leader raising their ceiling concurrently with a challenger never corrupts the result", async () => {
  for (let round = 0; round < 10; round++) {
    const a = await newAuction();
    assert.equal((await bid(a, 0, 3000)).status, 200);
    const [raise, challenge] = await Promise.all([bid(a, 0, 4000), bid(a, 1, 3500)]);
    assert.equal(raise.status, 200);
    assert.equal(challenge.status, 200);
    const s = await state(a);
    // either order must give A (ceiling 4000) the lead; price is one step over the best rival, capped by A's ceiling
    assert.equal(s.winner_id, users[0].id);
    assert.ok(["3100", "3600", "3500"].includes(s.current_price), s.current_price);
  }
});

test("a bid that waits for the lock past the deadline is rejected on the DB clock", async () => {
  const a = await newAuction({ endsInSec: 3600 });
  const tx = t.sql.begin(async (hold) => {
    await hold`SELECT 1 FROM auctions WHERE auction_id = ${a} FOR UPDATE`;
    await hold`UPDATE auctions SET end_time = clock_timestamp() + interval '300 milliseconds' WHERE auction_id = ${a}`;
    await new Promise((r) => setTimeout(r, 700)); // the bid below enters before the deadline but gets the lock after it
  });
  await new Promise((r) => setTimeout(r, 100));
  const late = await bid(a, 0, 2000);
  await tx;
  assert.equal(late.status, 409);
  assert.equal(late.body.code, "AUCTION_ENDED");
  assert.equal((await state(a)).bid_count, 0);
});

test("deadline equality and past deadlines are rejected for bids and Buy Now", async () => {
  const a = await newAuction({ buyNow: 9000, endsInSec: -1 });
  assert.equal((await bid(a, 0, 2000)).body.code, "AUCTION_ENDED");
  const bn = await t.call("POST", `/auction/${a}/buy-now`, { token: tokens[0] });
  assert.equal(bn.status, 409);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM orders WHERE auction_id = ${a}`)[0].n, 0);
});

test("anti-sniping: a public bid in the last 5 minutes extends once; raising your own max or a replay does not", async () => {
  const a = await newAuction({ endsInSec: 120, autoExtend: true });
  const end0 = (await state(a)).end_time;
  const r1 = await bidWithKey(a, 0, 3000, "extend-key-0001");
  assert.equal(r1.status, 200);
  const end1 = (await state(a)).end_time;
  assert.equal(end1 - end0, 5 * 60 * 1000, "extended by exactly five minutes");
  const replay = await bidWithKey(a, 0, 3000, "extend-key-0001");
  assert.equal(replay.replayed, "true");
  assert.equal((await state(a)).end_time - end0, 5 * 60 * 1000, "replay does not extend again");
  await sqlSetEnd(a, 60);
  const end2 = (await state(a)).end_time;
  assert.equal((await bid(a, 0, 4000)).body.outcome, "updated");
  assert.equal(+(await state(a)).end_time, +end2, "leader raise does not extend");
  assert.equal((await bid(a, 1, 1050)).status, 400, "invalid bid does not extend either");
  assert.equal(+(await state(a)).end_time, +end2);
});
const sqlSetEnd = (a, secs) => t.sql`UPDATE auctions SET end_time = now() + (${secs} * interval '1 second') WHERE auction_id = ${a}`;

test("network retries: same key replays the stored result; duplicates racing in parallel execute once; changed payload is a conflict", async () => {
  const a = await newAuction();
  const results = await Promise.all(Array.from({ length: 15 }, () => bidWithKey(a, 3, 2500, "retry-key-0001")));
  assert.ok(results.every((r) => r.status === 200 && r.body.outcome === "success"));
  assert.equal(results.filter((r) => r.replayed === "false").length, 1);
  assert.equal((await state(a)).bid_count, 1);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM auction_command_audit WHERE auction_id = ${a}`)[0].n, 1);
  const conflict = await bidWithKey(a, 3, 2600, "retry-key-0001");
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, "IDEMPOTENCY_CONFLICT");
  // a replay is served even after the auction has since ended
  await t.sql`UPDATE auctions SET status = 'ended' WHERE auction_id = ${a}`;
  const late = await bidWithKey(a, 3, 2500, "retry-key-0001");
  assert.equal(late.status, 200);
  assert.equal(late.replayed, "true");
  const bad = await fetch(`${t.base}/auction/${a}/bid`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens[3]}`, "Idempotency-Key": "short" }, body: JSON.stringify({ amount: 2500 }) });
  assert.equal(bad.status, 400);
});

test("ineligible bidders cannot mutate anything", async () => {
  const a = await newAuction({ allowNewbies: false });
  const before = await t.sql`SELECT version, command_sequence, bid_count, current_price FROM auctions WHERE auction_id = ${a}`;
  const probes = {
    banned: await t.createUser("p_banned", { status: "banned" }),
    unverified: await t.createUser("p_unverified", { isVerified: false, role: "unauthorized" }),
    admin: await t.createUser("p_admin", { role: "admin" }),
    lowRating: await t.createUser("p_low"),
    newbie: await t.createUser("p_newbie"),
  };
  await t.sql`UPDATE users SET rating_count = 10, positive_rating_count = 7 WHERE user_id = ${probes.lowRating.id}`;
  const expected = { banned: 403, unverified: 403, admin: 403, lowRating: 403, newbie: 403 };
  for (const [name, u] of Object.entries(probes)) {
    const r = await t.call("POST", `/auction/${a}/bid`, { token: await t.tokenFor(u), body: { amount: 2000 } });
    assert.equal(r.status, expected[name], `${name}: ${JSON.stringify(r.body)}`);
  }
  const own = await t.call("POST", `/auction/${a}/bid`, { token: await t.tokenFor(seller), body: { amount: 2000 } });
  assert.equal(own.status, 400);
  assert.equal(own.body.code, "OWN_LISTING");
  assert.deepEqual(await t.sql`SELECT version, command_sequence, bid_count, current_price FROM auctions WHERE auction_id = ${a}`, before);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM bidder_maxima WHERE auction_id = ${a}`)[0].n, 0);
});

test("legacy auctions with unconverted bid history refuse new bids", async () => {
  const a = await newAuction();
  await t.sql`UPDATE auctions SET bid_count = 2, current_price = 1500, winner_id = ${users[0].id} WHERE auction_id = ${a}`;
  const r = await bid(a, 1, 5000);
  assert.equal(r.status, 409);
  assert.equal(r.body.code, "LEGACY_UNVERIFIED");
});

test("bid validation failures report the exact minimum and change nothing", async () => {
  const a = await newAuction();
  assert.equal((await bid(a, 0, 999)).body.details.minimumNextBid, "1000");
  assert.equal((await bid(a, 0, 2000)).status, 200);
  const low = await bid(a, 1, 1050);
  assert.equal(low.status, 400);
  assert.equal(low.body.code, "BID_TOO_LOW");
  assert.equal(low.body.details.minimumNextBid, "1100");
  const same = await bid(a, 0, 2000);
  assert.equal(same.body.code, "BID_NOT_HIGHER");
  assert.equal((await state(a)).bid_count, 1);
});

test("15-digit amounts stay exact end to end", async () => {
  const a = await newAuction({ start: 999999999999000, step: 100 });
  assert.equal((await bid(a, 0, "999999999999900")).status, 200);
  const r = await bid(a, 1, "999999999999999");
  assert.equal(r.status, 200);
  assert.equal(r.body.currentPrice, "999999999999999".replace(/.$/, "9")); // min(top, second + step) = 999999999999999
  assert.equal((await bid(a, 2, "1000000000000000")).status, 400);
});

// ---------------- Buy Now ----------------
test("Buy Now: ends the lot at buyNowPrice and creates exactly one order", async () => {
  const a = await newAuction({ buyNow: 9000 });
  await bid(a, 0, 3000);
  const r = await t.call("POST", `/auction/${a}/buy-now`, { token: tokens[1] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.finalPrice, "9000");
  const s = await state(a);
  assert.deepEqual([s.status, s.winner_id, s.current_price, s.close_reason], ["ended", users[1].id, "9000", "buy_now"]);
  const orders = await t.sql`SELECT buyer_id, seller_id, final_price, status FROM orders WHERE auction_id = ${a}`;
  assert.deepEqual(orders.map((o) => [o.buyer_id, o.seller_id, o.final_price, o.status]), [[users[1].id, seller.id, "9000", "pending_payment"]]);
  assert.equal((await bid(a, 2, 9500)).body.code, "AUCTION_NOT_ACTIVE");
  assert.equal((await t.call("POST", `/auction/${a}/buy-now`, { token: tokens[2] })).status, 409);
});

test("Buy Now is refused once the price reached it, without Buy Now, or for the seller; capabilities say so", async () => {
  const a = await newAuction({ buyNow: 2000 });
  assert.equal((await t.call("GET", `/auction/${a}`, { token: tokens[0] })).body.capabilities.canBuyNow, true);
  await bid(a, 0, 5000); // first bid -> price 1000
  await bid(a, 1, 3000); // price 2000 = buyNow
  const detail = (await t.call("GET", `/auction/${a}`, { token: tokens[2] })).body;
  assert.equal(detail.capabilities.canBuyNow, false);
  assert.equal(detail.capabilities.reasons.buyNow, "PRICE_REACHED");
  assert.equal((await t.call("POST", `/auction/${a}/buy-now`, { token: tokens[2] })).status, 409);
  const none = await newAuction();
  assert.equal((await t.call("POST", `/auction/${none}/buy-now`, { token: tokens[0] })).body.code, "BUY_NOW_UNAVAILABLE");
  const own = await t.call("POST", `/auction/${a}/buy-now`, { token: await t.tokenFor(seller) });
  assert.equal(own.status, 400);
  const guest = (await t.call("GET", `/auction/${a}`)).body.capabilities;
  assert.deepEqual([guest.canBid, guest.canBuyNow, guest.reasons.bid], [false, false, "AUTH_REQUIRED"]);
  const expired = await newAuction({ buyNow: 9000, endsInSec: -5 });
  assert.equal((await t.call("GET", `/auction/${expired}`, { token: tokens[0] })).body.capabilities.canBuyNow, false);
});

test("Buy Now x Buy Now race: one winner, one order, the rest get a clean 409", async () => {
  const a = await newAuction({ buyNow: 9000 });
  const results = await Promise.all(Array.from({ length: 25 }, (_, i) => t.call("POST", `/auction/${a}/buy-now`, { token: tokens[i] })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.ok(results.filter((r) => r.status !== 200).every((r) => r.status === 409), JSON.stringify(results.map((r) => r.status)));
  const orders = await t.sql`SELECT buyer_id FROM orders WHERE auction_id = ${a}`;
  assert.equal(orders.length, 1);
  assert.equal((await state(a)).winner_id, orders[0].buyer_id);
});

test("Buy Now x bid race (30 rounds): the committed order decides, state is always consistent", async () => {
  for (let round = 0; round < 30; round++) {
    const a = await newAuction({ buyNow: 90000 });
    const [b, bn] = await Promise.all([bid(a, 0, 5000), t.call("POST", `/auction/${a}/buy-now`, { token: tokens[1] })]);
    assert.equal(bn.status, 200, `round ${round}: ${JSON.stringify(bn.body)}`);
    const s = await state(a);
    assert.deepEqual([s.status, s.winner_id, s.current_price], ["ended", users[1].id, "90000"]);
    const lastBid = (await t.sql`SELECT bidder_id, type FROM bids WHERE auction_id = ${a} ORDER BY auction_sequence DESC LIMIT 1`)[0];
    assert.deepEqual([lastBid.bidder_id, lastBid.type], [users[1].id, "buy_now"], "nothing was committed after Buy Now");
    if (b.status !== 200) assert.equal(b.status, 409);
    assert.equal((await t.sql`SELECT count(*)::int AS n FROM orders WHERE auction_id = ${a}`)[0].n, 1);
  }
});

test("Buy Now keys: a replay returns the same order and never creates a second one", async () => {
  const a = await newAuction({ buyNow: 9000 });
  const call = () => fetch(`${t.base}/auction/${a}/buy-now`, { method: "POST", headers: { Authorization: `Bearer ${tokens[4]}`, "Idempotency-Key": "buynow-key-001" } }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const [first, second, third] = await Promise.all([call(), call(), call()]);
  assert.deepEqual([first.status, second.status, third.status], [200, 200, 200]);
  assert.equal(new Set([first, second, third].map((r) => r.body.orderId)).size, 1);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM orders WHERE auction_id = ${a}`)[0].n, 1);
});

test("viewer state: each signed-in bidder sees only their own maximum and the floor the server enforces for them", async () => {
  const a = await newAuction({ start: 1000000, step: 100000 });
  assert.equal((await bid(a, 10, "2000000")).body.outcome, "success"); // u10 leads with a private 2.000.000 maximum
  assert.equal((await bid(a, 11, "1100000")).body.outcome, "outbid"); //  u11 is outbid, price auto-raised to 1.200.000
  const get = async (i) => {
    const res = await fetch(`${t.base}/auction/${a}`, { headers: i === undefined ? {} : { Authorization: `Bearer ${i === "seller" ? await t.tokenFor(seller) : tokens[i]}` } });
    return { cache: res.headers.get("cache-control"), body: await res.json() };
  };

  const leader = await get(10);
  assert.deepEqual(leader.body.viewer, { status: "leading", yourMaximum: "2000000", minimumBid: "2000001" });
  assert.match(leader.cache, /no-store/);
  assert.deepEqual((await get(11)).body.viewer, { status: "outbid", yourMaximum: "1100000", minimumBid: "1300000" });
  assert.deepEqual((await get(12)).body.viewer, { status: "none", yourMaximum: null, minimumBid: "1300000" });
  assert.equal((await get()).body.viewer, null, "guests get no viewer state");
  assert.equal((await get("seller")).body.viewer, null, "the seller cannot bid, so no viewer state");
  for (const who of [undefined, 11, 12, "seller"]) {
    assert.ok(!JSON.stringify((await get(who)).body).includes('"2000000"'), `the leader's maximum leaked to ${who ?? "a guest"}`);
  }

  // the shown floor is the real one: one below is refused, exactly the floor is accepted
  const below = (await bid(a, 10, "2000000")).body;
  assert.equal(below.code, "BID_NOT_HIGHER");
  assert.equal(below.details.minimumNextBid, leader.body.viewer.minimumBid, "server and viewer state agree on the leader's floor");
  assert.equal((await bid(a, 10, leader.body.viewer.minimumBid)).body.outcome, "updated");
  const low = (await bid(a, 11, "1299999")).body;
  assert.equal(low.details.minimumNextBid, "1300000", "server and viewer state agree on the challenger's floor");
  assert.equal((await bid(a, 11, "1300000")).body.outcome, "outbid");
});
