// Background worker: settlement (and, from T10, payment expiry). Separate process from the API; it never imports app.js
// (no Passport/OAuth needed). Safe to run several copies: every job claims work with row locks.
import dotenv from "dotenv";
dotenv.config();
import * as settlement from "./jobs/settleDue.js";
import * as paymentExpiry from "./jobs/expirePayments.js";
import * as mediaCleanup from "./jobs/cleanupMedia.js";
import { client } from "./db/index.js";

const POLL_MS = Number(process.env.WORKER_POLL_MS || 5000);
const jobs = [settlement, paymentExpiry, mediaCleanup];
let stopping = false;
let inflight = Promise.resolve();
let lastBeat = Date.now();

const log = (msg, extra = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), component: "worker", msg, ...extra }));

async function tick() {
  for (const job of jobs) {
    try {
      const out = await job.run();
      const settled = (out?.due?.settled ?? 0) + (out?.legacy?.settled ?? 0);
      const failed = out?.due?.failed ?? [];
      if (settled > 0 || failed.length > 0) log(`${job.name} pass`, { settled, failed: failed.length, conflicts: out?.legacy?.conflicts?.length ?? 0 });
      failed.forEach((f) => log("settlement failure", f));
    } catch (error) {
      log(`${job.name} crashed`, { error: error.message });
    }
  }
  lastBeat = Date.now();
}

async function loop() {
  log("worker started", { pollMs: POLL_MS });
  while (!stopping) {
    inflight = tick();
    await inflight;
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
setInterval(() => log("heartbeat", { lastPassAgoMs: Date.now() - lastBeat }), 60_000).unref();

loop();
