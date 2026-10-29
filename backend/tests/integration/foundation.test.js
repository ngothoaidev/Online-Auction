import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/postgres-js";
import { connect, resetDatabase, wipeDatabase, applyMigrations } from "../helpers/db.js";
import { runIdempotent, compactResults } from "../../services/idempotency.ts";
import { planMaximaBackfill, applyMaximaBackfill } from "../../services/legacyBackfill.ts";

let sql, db;
before(() => { sql = connect(); db = drizzle(sql); });
after(() => sql.end());

const seedUsersAndCategory = async (client) => {
  await client`INSERT INTO users (username, email, encrypted_password) VALUES ('s','s@e.t','x'),('a','a@e.t','x'),('b','b@e.t','x')`;
  await client`INSERT INTO categories (name) VALUES ('c')`;
};

test("migration 0002 on legacy data: whole-number order prices convert, money domain widens", async () => {
  await wipeDatabase(sql);
  await applyMigrations(sql, { upTo: 1 }); // schema as it was before the money/proxy work
  await seedUsersAndCategory(sql);
  await sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time) VALUES (1,1,'t','d',1000,1000,100, now())`;
  await sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price) VALUES (1,2,1,12345678.00)`;
  await applyMigrations(sql, { from: 2 });
  const [o] = await sql`SELECT final_price FROM orders`;
  assert.equal(o.final_price, "12345678");
  // 15-digit prices that numeric(10,2) could never hold
  await sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time) VALUES (1,1,'big','d',100000000000000,100000000000000,1000, now())`;
  await sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price) VALUES (2,2,1,999999999999999)`;
  const [big] = await sql`SELECT final_price FROM orders WHERE auction_id = 2`;
  assert.equal(big.final_price, "999999999999999");
});

test("migration 0002 refuses fractional legacy prices instead of rounding them, and leaves the data intact", async () => {
  await wipeDatabase(sql);
  await applyMigrations(sql, { upTo: 1 });
  await seedUsersAndCategory(sql);
  await sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time) VALUES (1,1,'t','d',1000,1000,100, now())`;
  await sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price) VALUES (1,2,1,1234.56)`;
  await assert.rejects(applyMigrations(sql, { from: 2 }), /fractional/);
  const [o] = await sql`SELECT final_price FROM orders`;
  assert.equal(o.final_price, "1234.56", "failed migration rolled back completely");
});

test("integrity checks reject new bad rows (non-positive price, buyNow <= start) and bad rating counters", async () => {
  await resetDatabase(sql);
  await seedUsersAndCategory(sql);
  const insert = (start, cur, step, buy) => sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, buy_now_price, end_time) VALUES (1,1,'t','d',${start},${cur},${step},${buy},now())`;
  await assert.rejects(insert(0, 0, 100, null), /auctions_money_chk/);
  await assert.rejects(insert(1000, 1000, 0, null), /auctions_money_chk/);
  await assert.rejects(insert(1000, 1000, 100, 1000), /auctions_money_chk/);
  await insert(1000, 1000, 100, 1001);
  await assert.rejects(sql`UPDATE users SET positive_rating_count = 5, rating_count = 1 WHERE user_id = 1`, /users_rating_chk/);
});

test("idempotency: same key + payload runs once and replays; concurrent duplicates execute exactly once", async () => {
  await resetDatabase(sql);
  await seedUsersAndCategory(sql);
  let runs = 0;
  const call = (payload, key = "key-aaaa-1111") => db.transaction((tx) => runIdempotent(tx, { actorId: 2, operation: "bid:1", key, payload }, async () => {
    runs++;
    await new Promise((r) => setTimeout(r, 30)); // widen the race window
    return { status: 200, body: { outcome: "success", n: runs }, resourceId: "1" };
  }));

  const results = await Promise.all(Array.from({ length: 20 }, () => call({ amount: "5000" })));
  assert.equal(runs, 1, "business logic ran exactly once");
  assert.equal(results.filter((r) => !r.replayed).length, 1);
  assert.ok(results.every((r) => r.status === 200 && r.body.outcome === "success" && r.body.n === 1));

  await assert.rejects(call({ amount: "9999" }), (e) => e.code === "IDEMPOTENCY_CONFLICT" && e.status === 409);
  assert.equal(runs, 1);
  // scope: other actor / other operation / other key are independent
  await db.transaction((tx) => runIdempotent(tx, { actorId: 3, operation: "bid:1", key: "key-aaaa-1111", payload: { amount: "5000" } }, async () => { runs++; return { status: 200, body: {} }; }));
  assert.equal(runs, 2);
});

test("idempotency: a failed command releases its key; compaction keeps a tombstone that can never act as a new request", async () => {
  await resetDatabase(sql);
  await seedUsersAndCategory(sql);
  const base = { actorId: 2, operation: "bid:7", key: "key-bbbb-2222", payload: { amount: "1" } };
  await assert.rejects(db.transaction((tx) => runIdempotent(tx, base, async () => { throw new Error("business rule"); })), /business rule/);
  assert.equal((await sql`SELECT count(*)::int AS n FROM command_requests`)[0].n, 0, "claim rolled back with the failed command");
  const ok = await db.transaction((tx) => runIdempotent(tx, base, async () => ({ status: 200, body: { done: true }, resourceId: "7" })));
  assert.equal(ok.replayed, false);

  await sql`UPDATE command_requests SET created_at = now() - interval '40 days'`;
  assert.equal(await db.transaction((tx) => compactResults(tx, new Date(Date.now() - 30 * 86400000))), 1);
  let ran = false;
  await assert.rejects(db.transaction((tx) => runIdempotent(tx, base, async () => { ran = true; return { status: 200, body: {} }; })), (e) => e.code === "IDEMPOTENCY_RESULT_EXPIRED" && e.details.resourceId === "7");
  assert.equal(ran, false);
});

test("legacy backfill converts clean history, reports ambiguous/mismatched auctions and leaves them untouched", async () => {
  await resetDatabase(sql);
  await seedUsersAndCategory(sql);
  const mk = (title, winner, current, count) => sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, winner_id, bid_count)
    VALUES (1,1,${title},'d',1000,${current},100, now() + interval '1 day', ${winner}, ${count}) RETURNING auction_id AS id`;
  const [{ id: clean }] = await mk("clean", 3, 1600, 3);
  const [{ id: tie }] = await mk("tie", 2, 2000, 2);
  const [{ id: wrong }] = await mk("wrong-winner", 2, 1500, 2);
  const t0 = "2026-01-01T10:00:00Z";
  // clean: a(max 2000) then b(max 1500, outbid) then b auto-bid result 1600 for a  -> a leads with ceiling 2000
  await sql`INSERT INTO bids (auction_id, bidder_id, amount, max_amount, bid_time) VALUES
    (${clean}, 2, 1000, 2000, '2026-01-01T10:00:00Z'), (${clean}, 3, 1500, 1500, '2026-01-01T10:01:00Z'), (${clean}, 2, 1600, 2000, '2026-01-01T10:01:00.1Z')`;
  await sql`UPDATE auctions SET winner_id = 2 WHERE auction_id = ${clean}`;
  // tie: both ceilings 2000 at the very same instant -> order cannot be inferred
  await sql`INSERT INTO bids (auction_id, bidder_id, amount, max_amount, bid_time) VALUES (${tie}, 2, 2000, 2000, ${t0}), (${tie}, 3, 2000, 2000, ${t0})`;
  // wrong winner: b has the higher ceiling but auction says a
  await sql`INSERT INTO bids (auction_id, bidder_id, amount, max_amount, bid_time) VALUES (${wrong}, 2, 1000, 1200, ${t0}), (${wrong}, 3, 1500, 3000, '2026-01-01T10:05:00Z')`;

  const plan = await planMaximaBackfill(sql);
  const by = Object.fromEntries(plan.map((p) => [p.auctionId, p]));
  assert.equal(by[clean].result, "convertible");
  assert.deepEqual(by[clean].reasons, ["bid_count_mismatch"].filter(() => false)); // 3 bids, count 3 -> no reasons
  assert.equal(by[tie].result, "flagged");
  assert.ok(by[tie].reasons.includes("ambiguous_tie"));
  assert.equal(by[wrong].result, "flagged");
  assert.ok(by[wrong].reasons.includes("winner_mismatch"));

  await applyMaximaBackfill(sql, plan);
  const maxima = await sql`SELECT bidder_id, max_amount, priority_sequence FROM bidder_maxima WHERE auction_id = ${clean} ORDER BY bidder_id`;
  assert.deepEqual(maxima.map((m) => [m.bidder_id, m.max_amount, Number(m.priority_sequence)]), [[2, "2000", 1], [3, "1500", 2]]);
  const seq = await sql`SELECT auction_sequence FROM bids WHERE auction_id = ${clean} ORDER BY bid_time`;
  assert.deepEqual(seq.map((s) => Number(s.auction_sequence)), [1, 2, 3]);
  assert.equal((await sql`SELECT count(*)::int AS n FROM bidder_maxima WHERE auction_id IN (${tie}, ${wrong})`)[0].n, 0, "flagged auctions untouched");
  assert.equal(Number((await sql`SELECT command_sequence FROM auctions WHERE auction_id = ${clean}`)[0].command_sequence), 3);

  const again = await planMaximaBackfill(sql); // re-run is a no-op for converted auctions
  assert.equal(again.find((p) => p.auctionId === clean).result, "skip");
});
