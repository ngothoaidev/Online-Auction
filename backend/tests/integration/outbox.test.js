import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { startApp } from "../helpers/app.js";

let t, db, outbox;

before(async () => {
  t = await startApp();
  db = (await import("../../db/index.js")).default;
  outbox = await import("../../services/outbox.js");
  await t.sql`CREATE TABLE test_effects (event_id uuid PRIMARY KEY)`;
});
after(() => t.stop());
beforeEach(() => t.sql`TRUNCATE outbox_events, test_effects`);

let nextId = 1;
const event = (n = nextId++) => ({ aggregateType: "test", aggregateId: n, aggregateVersion: 1, eventType: "test.happened", publicPayload: { n } });
const add = (count = 1) => db.transaction(async (tx) => { for (let i = 0; i < count; i++) await outbox.enqueue(tx, event()); });
const rows = () => t.sql`SELECT * FROM outbox_events ORDER BY aggregate_id`;
// measured on the DB clock: the container's clock may differ from the host's by tens of ms
const dbDelayMs = async (id) => Number((await t.sql`SELECT EXTRACT(EPOCH FROM next_attempt_at - clock_timestamp()) * 1000 AS ms FROM outbox_events WHERE event_id = ${id}`)[0].ms);

/** A consumer whose side effect is idempotent by eventId, plus a raw call log to observe redelivery. */
function recorder() {
  const calls = [];
  return {
    calls,
    name: "recorder",
    async handle(e) { calls.push(e.eventId); await t.sql`INSERT INTO test_effects (event_id) VALUES (${e.eventId}) ON CONFLICT DO NOTHING`; },
  };
}
const effects = async () => (await t.sql`SELECT count(*)::int AS n FROM test_effects`)[0].n;

test("rolled-back transactions leave no event; uncommitted events are invisible to the dispatcher", async () => {
  await assert.rejects(db.transaction(async (tx) => { await outbox.enqueue(tx, event()); throw new Error("domain failure"); }));
  assert.equal((await rows()).length, 0);

  const c = recorder();
  let release;
  const held = new Promise((r) => { release = r; });
  const pending = db.transaction(async (tx) => { await outbox.enqueue(tx, event()); await held; });
  await sleep(50);
  const early = await outbox.dispatch({ consumers: [c] });
  assert.equal(early.claimed, 0, "dispatcher must not see an event before its transaction commits");
  release();
  await pending;
  const r = await outbox.dispatch({ consumers: [c] });
  assert.equal(r.dispatched, 1);
  assert.equal(c.calls.length, 1);
  assert.ok((await rows())[0].dispatched_at);
});

test("logical events are unique: enqueueing the same (aggregate, version, type) twice stores one row", async () => {
  const e = event();
  await db.transaction(async (tx) => { await outbox.enqueue(tx, e); await outbox.enqueue(tx, e); });
  await db.transaction((tx) => outbox.enqueue(tx, e));
  assert.equal((await rows()).length, 1);
});

test("a failing consumer is retried with exponential backoff, then dead-lettered; state stays committed", async () => {
  await add(1);
  let fail = true;
  const flaky = { name: "flaky", async handle() { if (fail) throw new Error("smtp down"); } };

  const first = await outbox.dispatch({ consumers: [flaky], baseDelayMs: 60_000, maxAttempts: 3 });
  assert.equal(first.failed.length, 1);
  let [row] = await rows();
  assert.equal(row.attempts, 1);
  assert.match(row.last_error, /^flaky: smtp down/);
  assert.equal(row.lease_until, null);
  const delay = await dbDelayMs(row.event_id);
  assert.ok(delay > 50_000 && delay <= 60_000, `backoff ${delay}ms`);
  assert.equal((await outbox.dispatch({ consumers: [flaky] })).claimed, 0, "not retried before its backoff");
  const gauges = await outbox.stats();
  assert.deepEqual({ ...gauges, oldestPendingMs: gauges.oldestPendingMs >= 0 }, { backlog: 1, retrying: 1, dead: 0, oldestPendingMs: true });

  // second failure doubles the delay
  await t.sql`UPDATE outbox_events SET next_attempt_at = now()`;
  await outbox.dispatch({ consumers: [flaky], baseDelayMs: 60_000, maxAttempts: 3 });
  [row] = await rows();
  const delay2 = await dbDelayMs(row.event_id);
  assert.ok(delay2 > 110_000 && delay2 <= 120_000, `backoff ${delay2}ms`);

  // third failure reaches maxAttempts -> dead letter, never claimed again
  await t.sql`UPDATE outbox_events SET next_attempt_at = now()`;
  const third = await outbox.dispatch({ consumers: [flaky], baseDelayMs: 60_000, maxAttempts: 3 });
  assert.equal(third.failed[0].dead, true);
  await t.sql`UPDATE outbox_events SET next_attempt_at = now()`;
  fail = false;
  assert.equal((await outbox.dispatch({ consumers: [flaky] })).claimed, 0);
  const s = await outbox.stats();
  assert.equal(s.dead, 1);
  assert.equal(s.backlog, 0);

  // operator requeue (runbook): clear dead_at -> delivered
  await t.sql`UPDATE outbox_events SET dead_at = NULL, attempts = 0, next_attempt_at = now()`;
  assert.equal((await outbox.dispatch({ consumers: [flaky] })).dispatched, 1);
});

test("crash after a consumer side effect: the lease expires, the event is redelivered, the consumer dedupes, the stale dispatcher is fenced out", async () => {
  await add(1);
  const c = recorder();
  let release;
  const stuck = new Promise((r) => { release = r; });
  // dispatcher A performs the side effect, then "dies" (hangs past its lease without marking the row)
  const a = outbox.dispatch({ leaseMs: 100, consumers: [{ name: "a", async handle(e) { await c.handle(e); await stuck; } }] });
  await sleep(50);
  assert.equal((await outbox.dispatch({ consumers: [c] })).claimed, 0, "lease still held");
  await sleep(150);
  // dispatcher B (e.g. after restart) re-claims the expired lease
  const b = await outbox.dispatch({ consumers: [c] });
  assert.equal(b.dispatched, 1);
  release();
  const late = await a;
  assert.equal(late.dispatched, 0, "A's lease was taken over: it must not settle the row");
  assert.equal(c.calls.length, 2, "delivery is at least once");
  assert.equal(await effects(), 1, "the consumer's dedupe keeps the effect single");
  const [row] = await rows();
  assert.equal(row.attempts, 2);
  assert.ok(row.dispatched_at);
});

test("crash before the consumer ran: the event is not lost and is delivered once the lease expires", async () => {
  await add(1);
  // claim and abandon (simulates a process killed right after claiming)
  await t.sql`UPDATE outbox_events SET attempts = attempts + 1, lease_until = now() + interval '50 milliseconds'`;
  await sleep(100);
  const c = recorder();
  assert.equal((await outbox.dispatch({ consumers: [c] })).dispatched, 1);
  assert.equal(await effects(), 1);
});

test("two dispatchers in parallel deliver every event exactly once when nothing fails", async () => {
  await add(200);
  const c = recorder();
  const [x, y] = await Promise.all([outbox.dispatch({ consumers: [c], limit: 150 }), outbox.dispatch({ consumers: [c], limit: 150 })]);
  const rest = await outbox.dispatch({ consumers: [c], limit: 200 });
  assert.equal(x.dispatched + y.dispatched + rest.dispatched, 200);
  assert.equal(c.calls.length, 200);
  assert.equal(new Set(c.calls).size, 200);
  assert.equal((await outbox.stats()).backlog, 0);
});

test("domain events carry only the public snapshot publicly; recipients are in the private payload", async () => {
  const seller = await t.createUser("oseller", { role: "seller" });
  const [b1, b2] = [await t.createUser("ob1"), await t.createUser("ob2")];
  const [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('oc') RETURNING category_id AS id`;
  const [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 1000, 100, now() + interval '1 hour') RETURNING auction_id AS id`;
  assert.equal((await t.call("POST", `/auction/${auctionId}/bid`, { token: await t.tokenFor(b1), body: { amount: "5000" } })).status, 200);
  assert.equal((await t.call("POST", `/auction/${auctionId}/bid`, { token: await t.tokenFor(b2), body: { amount: "9000" } })).status, 200);

  const events = await t.sql`SELECT * FROM outbox_events WHERE aggregate_type = 'auction' AND aggregate_id = ${auctionId} ORDER BY aggregate_version`;
  assert.equal(events.length, 2);
  for (const e of events) {
    assert.deepEqual(Object.keys(e.public_payload).sort(), ["auctionId", "bidCount", "currentPrice", "endTime", "serverTime", "status", "version"]);
    assert.ok(!JSON.stringify(e.public_payload).includes("9000"), "the leader's maximum never appears");
  }
  assert.deepEqual(events[1].private_payload, { sellerId: seller.id, leaderId: b2.id, previousLeaderId: b1.id });

  const c = recorder();
  const r = await outbox.dispatch({ consumers: [c] });
  assert.equal(r.dispatched, 2);
});
