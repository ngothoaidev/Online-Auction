// Fault injection with REAL process deaths: the actual worker (node worker.ts) is started as a child process and killed
// at a named point around a commit (utils/fault.js). A fresh worker process must then finish the job exactly once.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startApp } from "../helpers/app.js";
import { TEST_DATABASE_URL } from "../helpers/db.js";

const backend = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let t, seller, buyer, categoryId;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000" });
  seller = await t.createUser("fseller", { role: "seller" });
  buyer = await t.createUser("fbuyer");
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('fc') RETURNING category_id AS id`;
});
after(() => t.stop());

/** One worker pass in a separate process; resolves { code, output }. */
function worker(env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["worker.ts"], {
      cwd: backend,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, WORKER_ONCE: "1", EMAIL_TRANSPORT: "local", OUTBOX_RETRY_BASE_MS: "0", FAULT_POINT: "", ...env },
    });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, output }));
  });
}

const dueLotWithBid = async () => {
  const [{ id }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${categoryId}, 'Fault lot', 'd', 1000, 1000, 100, now() + interval '1 hour') RETURNING auction_id AS id`;
  assert.equal((await t.call("POST", `/auction/${id}/bid`, { token: await t.tokenFor(buyer), body: { amount: "5000" } })).status, 200);
  await t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ${id}`;
  return id;
};
// the dispatcher handles the oldest event first: make the settlement's event the only one pending before a crash run
const onlySettlementEventPending = () => t.sql`UPDATE outbox_events SET dispatched_at = now() WHERE dispatched_at IS NULL`;
const state = async (id) => ({
  status: (await t.sql`SELECT status FROM auctions WHERE auction_id = ${id}`)[0].status,
  orders: (await t.sql`SELECT count(*)::int AS n FROM orders WHERE auction_id = ${id}`)[0].n,
  ended: (await t.sql`SELECT count(*)::int AS n FROM outbox_events WHERE aggregate_id = ${id} AND event_type = 'auction.ended'`)[0].n,
});

test("worker killed just before the settlement commit: nothing is half-written; the next worker settles exactly once", async () => {
  const id = await dueLotWithBid();
  const crashed = await worker({ FAULT_POINT: "settle.before_commit" });
  assert.equal(crashed.code, 86, crashed.output);
  assert.deepEqual(await state(id), { status: "active", orders: 0, ended: 0 }, "the killed transaction rolled back completely");

  const next = await worker();
  assert.equal(next.code, 0, next.output);
  assert.deepEqual(await state(id), { status: "ended", orders: 1, ended: 1 });
  assert.equal((await worker()).code, 0);
  assert.deepEqual(await state(id), { status: "ended", orders: 1, ended: 1 }, "a further pass changes nothing");
});

test("dispatcher killed after the notification consumer ran but before marking the event: redelivered after the lease, no duplicate notification rows", async () => {
  const id = await dueLotWithBid();
  await onlySettlementEventPending();
  const crashed = await worker({ FAULT_POINT: "outbox.after_consumer", OUTBOX_LEASE_MS: "300" });
  assert.equal(crashed.code, 86, crashed.output);
  const [ev] = await t.sql`SELECT * FROM outbox_events WHERE aggregate_id = ${id} AND event_type = 'auction.ended'`;
  assert.equal(ev.dispatched_at, null, "not marked: the process died first");
  assert.equal(ev.attempts, 1);
  const rows = async () => (await t.sql`SELECT kind, channel, status FROM notifications WHERE dedupe_key LIKE ${`${ev.event_id}:%`} ORDER BY kind, channel`).map((r) => `${r.kind}/${r.channel}/${r.status}`);
  const afterCrash = await rows();
  assert.ok(afterCrash.length > 0, "the consumer's side effect happened before the crash");

  await new Promise((r) => setTimeout(r, 400)); // lease expires
  const next = await worker();
  assert.equal(next.code, 0, next.output);
  const [done] = await t.sql`SELECT dispatched_at, attempts FROM outbox_events WHERE event_id = ${ev.event_id}`;
  assert.ok(done.dispatched_at);
  assert.equal(done.attempts, 2, "delivered at least once: a second attempt after the crash");
  assert.deepEqual((await rows()).map((r) => r.split("/").slice(0, 2).join("/")), afterCrash.map((r) => r.split("/").slice(0, 2).join("/")), "same rows: the consumer deduped the redelivery");
  assert.ok((await rows()).every((r) => !r.endsWith("/pending")), "every email row settled");
});

test("killed after an email left but before it was recorded: the email is resent on recovery (documented at-least-once)", async () => {
  const id = await dueLotWithBid();
  await onlySettlementEventPending();
  const crashed = await worker({ FAULT_POINT: "notify.after_send", OUTBOX_LEASE_MS: "300" });
  assert.equal(crashed.code, 86, crashed.output);
  const [ev] = await t.sql`SELECT event_id FROM outbox_events WHERE aggregate_id = ${id} AND event_type = 'auction.ended'`;
  const emailRows = () => t.sql`SELECT status, attempts FROM notifications WHERE dedupe_key LIKE ${`${ev.event_id}:%`} AND channel = 'email' ORDER BY id`;
  assert.ok((await emailRows()).some((r) => r.status === "pending" && r.attempts === 0), "the sent email is not recorded: our records cannot know it left");

  await new Promise((r) => setTimeout(r, 400));
  assert.equal((await worker()).code, 0);
  const final = await emailRows();
  assert.ok(final.every((r) => r.status === "sent" && r.attempts === 1), JSON.stringify(final));
  // the provider accepted that first message too: this is the documented at-least-once window, not a silent loss
});
