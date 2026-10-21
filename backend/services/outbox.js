// Transactional outbox. Producers append events inside their domain transaction (`enqueue`); the worker's dispatcher
// delivers committed rows to consumers. Delivery is AT LEAST ONCE: a crash after a consumer's side effect but before
// the row is marked dispatched replays the event, so every consumer must dedupe by `eventId`. No ordering guarantee
// across retries either: consumers that care compare `aggregateVersion`.
import { sql } from "drizzle-orm";
import db from "../db/index.js";
import { outboxEvents } from "../db/schema.js";

/** Append a domain event in the caller's transaction. Idempotent per (aggregate, version, type). */
export async function enqueue(tx, { aggregateType, aggregateId, aggregateVersion, eventType, publicPayload, privatePayload = null }) {
  await tx.insert(outboxEvents)
    .values({ aggregateType, aggregateId, aggregateVersion, eventType, publicPayload, privatePayload })
    .onConflictDoNothing();
}

const num = (name, fallback) => Number(process.env[name] || fallback);

/**
 * Claim due events under a lease. Only committed rows are visible, so a consumer never sees an event whose
 * transaction rolled back. `attempts` doubles as the fencing token: a dispatcher whose lease expired (and was
 * re-claimed by another) can no longer settle the row.
 */
async function claim({ limit, leaseMs }) {
  const rows = await db.execute(sql`
    UPDATE outbox_events SET attempts = attempts + 1, lease_until = clock_timestamp() + ${leaseMs} * interval '1 millisecond'
    WHERE event_id IN (
      SELECT event_id FROM outbox_events
      WHERE dispatched_at IS NULL AND dead_at IS NULL AND next_attempt_at <= clock_timestamp()
        AND (lease_until IS NULL OR lease_until < clock_timestamp())
      ORDER BY next_attempt_at, created_at LIMIT ${limit}
      FOR UPDATE SKIP LOCKED)
    RETURNING event_id, aggregate_type, aggregate_id, aggregate_version, event_type, public_payload, private_payload, attempts, created_at`);
  return rows.map((r) => ({
    eventId: r.event_id, aggregateType: r.aggregate_type, aggregateId: r.aggregate_id, aggregateVersion: r.aggregate_version,
    eventType: r.event_type, publicPayload: r.public_payload, privatePayload: r.private_payload, attempts: r.attempts, createdAt: r.created_at,
  }));
}

/**
 * One dispatcher pass. `consumers` is a list of `{ name, handle(event) }`; each is called for every event and must be
 * idempotent by eventId (one failing consumer retries the whole event). Failures back off exponentially and go to
 * dead-letter (`dead_at`) after `maxAttempts`. Safe to run several dispatchers at once.
 */
export async function dispatch({
  consumers = [],
  limit = num("OUTBOX_BATCH", 50),
  leaseMs = num("OUTBOX_LEASE_MS", 30_000),
  maxAttempts = num("OUTBOX_MAX_ATTEMPTS", 10),
  baseDelayMs = num("OUTBOX_RETRY_BASE_MS", 1000),
  maxDelayMs = num("OUTBOX_RETRY_MAX_MS", 600_000),
} = {}) {
  const events = await claim({ limit, leaseMs });
  const result = { claimed: events.length, dispatched: 0, failed: [] };
  for (const event of events) {
    let current = "dispatcher";
    try {
      for (const consumer of consumers) { current = consumer.name; await consumer.handle(event); }
      current = "dispatcher";
      const done = await db.execute(sql`
        UPDATE outbox_events SET dispatched_at = clock_timestamp(), lease_until = NULL, last_error = NULL
        WHERE event_id = ${event.eventId} AND attempts = ${event.attempts} AND dispatched_at IS NULL RETURNING event_id`);
      if (done.length) result.dispatched += 1;
    } catch (error) {
      const message = `${current}: ${error?.message ?? error}`.slice(0, 1000);
      const delayMs = Math.min(baseDelayMs * 2 ** (event.attempts - 1), maxDelayMs);
      const [row] = await db.execute(sql`
        UPDATE outbox_events SET lease_until = NULL, last_error = ${message},
          next_attempt_at = clock_timestamp() + ${delayMs} * interval '1 millisecond',
          dead_at = CASE WHEN attempts >= ${maxAttempts} THEN clock_timestamp() END
        WHERE event_id = ${event.eventId} AND attempts = ${event.attempts} AND dispatched_at IS NULL RETURNING dead_at`);
      result.failed.push({ eventId: event.eventId, eventType: event.eventType, attempts: event.attempts, dead: Boolean(row?.dead_at), message });
    }
  }
  return result;
}

/** Backlog/retry/dead-letter gauges for the worker heartbeat (and the metrics endpoint later). */
export async function stats() {
  const [s] = await db.execute(sql`
    SELECT count(*) FILTER (WHERE dead_at IS NULL)::int AS backlog,
           count(*) FILTER (WHERE dead_at IS NULL AND last_error IS NOT NULL)::int AS retrying,
           count(*) FILTER (WHERE dead_at IS NOT NULL)::int AS dead,
           COALESCE(EXTRACT(EPOCH FROM clock_timestamp() - min(created_at) FILTER (WHERE dead_at IS NULL)) * 1000, 0)::bigint AS "oldestPendingMs"
    FROM outbox_events WHERE dispatched_at IS NULL`);
  return { ...s, oldestPendingMs: Number(s.oldestPendingMs) };
}
