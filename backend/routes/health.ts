// Liveness, readiness and metrics.
//  GET /health/live   200 while the process can answer (no dependencies checked).
//  GET /health/ready  200 when the DB answers and every migration is applied; 503 otherwise. The worker is reported
//                     (ok | stale | missing) but does not fail API readiness: the API can serve without it.
//  GET /metrics       Prometheus text. Requires `Authorization: Bearer $METRICS_TOKEN` when METRICS_TOKEN is set;
//                     without a token it is open in development and hidden (404) in production.
import { Router } from "express";
import fs from "node:fs";
import { sql } from "drizzle-orm";
import db from "../db/index.ts";
import { stats as outboxStats } from "../services/outbox.ts";
import { connectionCount } from "../services/realtime.ts";
import { render } from "../utils/metrics.ts";
import type { Gauge } from "../utils/metrics.ts";

type Check = { ok: boolean; ms?: number; error?: string; applied?: number; expected?: number };
type WorkerCheck = { status: string; lastBeatAgoMs?: number; error?: string };

const route = Router();
const expectedMigrations = JSON.parse(fs.readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8")).entries.length;
const num = (name: string, fallback: number) => Number(process.env[name] || fallback);
const withTimeout = <T>(promise: Promise<T>, ms: number) => Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms))]);

async function workerStatus(): Promise<WorkerCheck> {
  const [w] = await db.execute<{ age_ms: string | null; n: number }>(sql`SELECT EXTRACT(EPOCH FROM clock_timestamp() - max(last_beat_at)) * 1000 AS age_ms, count(*)::int AS n FROM worker_heartbeats`);
  if (!w || w.n === 0 || w.age_ms === null) return { status: "missing" };
  const age = Math.round(Number(w.age_ms));
  return { status: age > num("WORKER_STALE_AFTER_MS", 60_000) ? "stale" : "ok", lastBeatAgoMs: age };
}

route.get("/health/live", (req, res) => res.json({ status: "ok", uptimeS: Math.round(process.uptime()) }));

route.get("/health/ready", async (req, res) => {
  const checks: { database?: Check; migrations?: Check; worker?: WorkerCheck } = {};
  const started = performance.now();
  try {
    await withTimeout(db.execute(sql`SELECT 1`), num("READY_DB_TIMEOUT_MS", 2000));
    checks.database = { ok: true, ms: Math.round(performance.now() - started) };
  } catch (error) {
    checks.database = { ok: false, error: (error as Error).message };
  }
  if (checks.database?.ok) {
    try {
      const [{ n }] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
      checks.migrations = { ok: n >= expectedMigrations, applied: n, expected: expectedMigrations };
    } catch (error) {
      checks.migrations = { ok: false, error: (error as Error).message };
    }
    checks.worker = await workerStatus().catch((error: Error) => ({ status: "unknown", error: error.message }));
  }
  const ready = Boolean(checks.database?.ok && checks.migrations?.ok);
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks });
});

route.get("/metrics", async (req, res, next) => {
  const token = process.env.METRICS_TOKEN;
  if (token ? req.get("Authorization") !== `Bearer ${token}` : process.env.NODE_ENV === "production") return res.status(404).end();
  try {
    const [box, [due], [lag], [pay], email, worker] = await Promise.all([
      outboxStats(),
      db.execute<{ n: number; oldest: string }>(sql`SELECT count(*)::int AS n, COALESCE(EXTRACT(EPOCH FROM clock_timestamp() - min(end_time)), 0) AS oldest
        FROM auctions WHERE status = 'active' AND end_time <= clock_timestamp()`),
      db.execute<{ p95: string }>(sql`SELECT COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM settled_at - end_time)), 0) AS p95
        FROM auctions WHERE settled_at > clock_timestamp() - interval '1 hour' AND close_reason IS DISTINCT FROM 'buy_now'`),
      db.execute<{ exceptions: number; open: number }>(sql`SELECT count(*) FILTER (WHERE status = 'exception')::int AS exceptions, count(*) FILTER (WHERE status = 'created')::int AS open FROM payment_attempts`),
      db.execute<{ status: string; n: number }>(sql`SELECT status, count(*)::int AS n FROM notifications WHERE channel = 'email' AND status IN ('pending', 'failed') GROUP BY status`),
      workerStatus(),
    ]);
    const gauges: Gauge[] = [
      { name: "outbox_backlog", help: "Outbox events not yet delivered (excluding dead letters)", value: box.backlog },
      { name: "outbox_retrying", help: "Outbox events that failed at least once and will be retried", value: box.retrying },
      { name: "outbox_dead_letters", help: "Outbox events that exhausted their retries", value: box.dead },
      { name: "outbox_oldest_pending_seconds", help: "Age of the oldest undelivered outbox event", value: Math.round(box.oldestPendingMs / 1000) },
      { name: "auctions_overdue_unsettled", help: "Active auctions past their end time (worker lag)", value: due.n },
      { name: "auctions_overdue_oldest_seconds", help: "How long the oldest overdue auction has waited for settlement", value: Math.round(Number(due.oldest)) },
      { name: "settlement_lag_p95_seconds", help: "p95 of settled_at - end_time over the last hour (worker-settled lots)", value: +Number(lag.p95).toFixed(3) },
      { name: "payment_exceptions", help: "Payment attempts waiting for a human (late/mismatched/conflicting)", value: pay.exceptions },
      { name: "payment_attempts_open", help: "Payment attempts not yet settled by the provider", value: pay.open },
      ...["pending", "failed"].map((s) => ({ name: "email_deliveries", help: "Email notifications by delivery status", labels: { status: s }, value: email.find((e) => e.status === s)?.n ?? 0 })),
      { name: "worker_heartbeat_age_seconds", help: "Seconds since the most recent worker pass (NaN when no worker ever ran)", value: worker.lastBeatAgoMs === undefined ? NaN : Math.round(worker.lastBeatAgoMs / 1000) },
      { name: "sse_connections", help: "Open live-update streams on this API process", value: connectionCount() },
      { name: "process_resident_memory_bytes", help: "Resident memory of this API process", value: process.memoryUsage().rss },
      { name: "process_uptime_seconds", help: "Uptime of this API process", value: Math.round(process.uptime()) },
    ];
    res.type("text/plain; version=0.0.4").send(render(gauges));
  } catch (error) {
    next(error);
  }
});

export default route;
