import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { startApp } from "../helpers/app.js";
import { TEST_DATABASE_URL } from "../helpers/db.js";

const backend = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let t;

before(async () => { t = await startApp({ BID_RATE_LIMIT_MAX: "100000" }); });
after(() => t.stop());

const raw = (p, headers = {}) => fetch(t.base + p, { headers }).then(async (r) => ({ status: r.status, headers: r.headers, text: await r.text() }));

/** Start a child process and resolve once `ready()` says so; returns { child, output() }. */
function start(args, env) {
  const child = spawn(process.execPath, args, { cwd: backend, env: { ...process.env, ...env } });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  return { child, output: () => out, stop: () => new Promise((r) => { child.once("exit", r); child.kill(); }) };
}

test("live is always 200; ready checks the database and migrations and reports the worker without failing on it", async () => {
  const live = await t.call("GET", "/health/live");
  assert.equal(live.status, 200);
  assert.equal(live.body.status, "ok");

  const ready = await t.call("GET", "/health/ready");
  assert.equal(ready.status, 200);
  assert.equal(ready.body.checks.database.ok, true);
  assert.equal(ready.body.checks.migrations.ok, true);
  assert.equal(ready.body.checks.migrations.applied, ready.body.checks.migrations.expected);
  assert.equal(ready.body.checks.worker.status, "missing", "no worker has run against this DB yet");
});

test("worker heartbeat: a real worker pass makes it ok; an old beat is reported stale (API stays ready)", async () => {
  const w = start(["worker.js"], { DATABASE_URL: TEST_DATABASE_URL, WORKER_ONCE: "1", EMAIL_TRANSPORT: "local" });
  await new Promise((r) => w.child.once("exit", r));
  let ready = await t.call("GET", "/health/ready");
  assert.equal(ready.body.checks.worker.status, "ok", w.output());
  const [hb] = await t.sql`SELECT * FROM worker_heartbeats`;
  assert.ok(hb.last_pass_ms >= 0);
  assert.equal(hb.last_pass_failures, 0);
  for (const line of w.output().trim().split("\n")) JSON.parse(line); // every worker log line is JSON

  await t.sql`UPDATE worker_heartbeats SET last_beat_at = now() - interval '10 minutes'`;
  ready = await t.call("GET", "/health/ready");
  assert.equal(ready.status, 200);
  assert.equal(ready.body.checks.worker.status, "stale");
  assert.ok(ready.body.checks.worker.lastBeatAgoMs >= 590_000);
});

test("database down (simulated with a dead port): the API stays live, readiness is 503, the access log is JSON without query strings", async () => {
  const port = 39000 + Math.floor(Math.random() * 1000);
  const api = start(["server.js"], { DATABASE_URL: "postgres://auction:auction@127.0.0.1:1/nowhere", PORT: String(port), READY_DB_TIMEOUT_MS: "1500" });
  try {
    let up = false;
    for (let i = 0; i < 50 && !up; i++) { await sleep(100); up = await fetch(`http://127.0.0.1:${port}/health/live`).then((r) => r.ok).catch(() => false); }
    assert.ok(up, api.output());
    const res = await fetch(`http://127.0.0.1:${port}/health/ready?token=should-not-be-logged`, { headers: { "X-Request-Id": "probe-12345678" } });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, "not_ready");
    assert.equal(body.checks.database.ok, false);
    assert.equal(res.headers.get("x-request-id"), "probe-12345678", "a well-formed incoming request id is kept");
    await sleep(100);
    const line = api.output().split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((l) => l.msg === "request" && l.route === "/health/ready");
    assert.ok(line, api.output());
    assert.deepEqual([line.status, line.path, line.requestId, line.level], [503, "/health/ready", "probe-12345678", "info"]);
    assert.ok(!api.output().includes("should-not-be-logged"));
  } finally {
    await api.stop();
  }
});

test("metrics: HTTP, lock wait and business gauges; protected by METRICS_TOKEN, hidden in production without one", async () => {
  const seller = await t.createUser("mseller", { role: "seller" });
  const buyer = await t.createUser("mbuyer");
  const [{ id: cat }] = await t.sql`INSERT INTO categories (name) VALUES ('mc') RETURNING category_id AS id`;
  const [{ id: lot }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${cat}, 'm', 'd', 1000, 1000, 100, now() + interval '1 hour') RETURNING auction_id AS id`;
  assert.equal((await t.call("POST", `/auction/${lot}/bid`, { token: await t.tokenFor(buyer), body: { amount: "2000" } })).status, 200);
  await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${cat}, 'overdue', 'd', 1000, 1000, 100, now() - interval '2 minutes')`;

  const m = await raw("/metrics");
  assert.equal(m.status, 200);
  assert.match(m.headers.get("content-type"), /text\/plain/);
  for (const needle of [
    /http_requests_total\{method="POST",route="\/auction\/:id\/bid",status="2xx"\} 1/,
    /auction_lock_wait_ms_count 1/,
    /^outbox_backlog \d+$/m,
    /^auctions_overdue_unsettled 1$/m,
    /^auctions_overdue_oldest_seconds (1[1-9]\d|[2-9]\d\d)$/m,
    /^payment_exceptions 0$/m,
    /^email_deliveries\{status="failed"\} 0$/m,
    /^worker_heartbeat_age_seconds \d+$/m,
  ]) assert.match(m.text, needle);
  assert.equal(m.text.match(/^# TYPE email_deliveries gauge$/gm).length, 1, "one TYPE line per metric");
  assert.ok(!/route="\/auction\/\d+/.test(m.text), "labels use route patterns, never raw ids");

  process.env.METRICS_TOKEN = "scrape-secret";
  try {
    assert.equal((await raw("/metrics")).status, 404);
    assert.equal((await raw("/metrics", { Authorization: "Bearer scrape-secret" })).status, 200);
  } finally { delete process.env.METRICS_TOKEN; }
  process.env.NODE_ENV = "production";
  try { assert.equal((await raw("/metrics")).status, 404); } finally { process.env.NODE_ENV = "test"; }
});

test("request ids: a malformed incoming id is replaced, errors carry the id", async () => {
  const res = await fetch(`${t.base}/nope`, { headers: { "X-Request-Id": "bad id with spaces" } });
  const id = res.headers.get("x-request-id");
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal((await res.json()).requestId, id);
});
