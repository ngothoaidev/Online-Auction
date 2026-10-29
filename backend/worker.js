// Background worker: settlement, payment reconciliation/expiry/reminders, media cleanup and the outbox dispatcher (notifications). Separate process from the API; it never imports app.js
// (no Passport/OAuth needed). Safe to run several copies: every job claims work with row locks.
import dotenv from "dotenv";
dotenv.config();
import * as settlement from "./jobs/settleDue.js";
import * as paymentExpiry from "./jobs/expirePayments.js";
import * as mediaCleanup from "./jobs/cleanupMedia.js";
import * as outbox from "./jobs/dispatchOutbox.js";
import * as paymentReconcile from "./jobs/reconcilePayments.js";
import * as paymentReminders from "./jobs/paymentReminders.js";
import { stats as outboxStats } from "./services/outbox.js";
import os from "node:os";
import { sql } from "drizzle-orm";
import db, { client } from "./db/index.ts";
import logger from "./utils/log.ts";

const POLL_MS = Number(process.env.WORKER_POLL_MS || 5000);
const jobs = [settlement, paymentReconcile, paymentExpiry, paymentReminders, mediaCleanup, outbox];
let stopping = false;
let inflight = Promise.resolve();
let lastBeat = Date.now();
const workerId = `${os.hostname()}:${process.pid}`.slice(0, 100);

const log = (msg, extra = {}) => (extra.error || /failure|crashed/.test(msg) ? logger.warn : logger.info)(msg, { component: "worker", workerId, ...extra });

/** Liveness for /health/ready and /metrics: one row per worker process, refreshed after every pass. */
const beat = (passMs, failures) => db.execute(sql`
  INSERT INTO worker_heartbeats (worker_id, last_beat_at, last_pass_ms, last_pass_failures) VALUES (${workerId}, clock_timestamp(), ${passMs}, ${failures})
  ON CONFLICT (worker_id) DO UPDATE SET last_beat_at = clock_timestamp(), last_pass_ms = ${passMs}, last_pass_failures = ${failures}`)
  .catch((error) => log("heartbeat write failed", { error: error.message }));

async function tick() {
  const started = performance.now();
  let failures = 0;
  for (const job of jobs) {
    try {
      const out = await job.run();
      const settled = (out?.due?.settled ?? 0) + (out?.legacy?.settled ?? 0);
      const failed = out?.due?.failed ?? [];
      const conflicts = out?.legacy?.conflicts ?? [];
      if (settled > 0 || failed.length > 0 || conflicts.length > 0) log(`${job.name} pass`, { settled, failed: failed.length, conflicts: conflicts.length });
      conflicts.forEach((c) => log(`${job.name} needs review`, c));
      failed.forEach((f) => log(`${job.name} failure`, f));
      failures += failed.length;
    } catch (error) {
      failures += 1;
      log(`${job.name} crashed`, { error: error.message });
    }
  }
  lastBeat = Date.now();
  await beat(Math.round(performance.now() - started), failures);
}

async function loop() {
  log("worker started", { pollMs: POLL_MS });
  while (!stopping) {
    inflight = tick();
    await inflight;
    if (process.env.WORKER_ONCE) return shutdown("WORKER_ONCE"); // one pass, for tests and cron-style runs
    await new Promise((r) => { const t = setTimeout(r, POLL_MS); t.unref?.(); if (stopping) clearTimeout(t); });
  }
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log("shutting down", { signal });
  await inflight.catch(() => {});
  await client.end({ timeout: 5 });
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
setInterval(async () => {
  const outbox = await outboxStats().catch((error) => ({ error: error.message }));
  log("heartbeat", { lastPassAgoMs: Date.now() - lastBeat, outbox });
}, 60_000).unref();

loop();
