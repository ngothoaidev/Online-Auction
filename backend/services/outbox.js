import { outboxEvents } from "../db/schema.js";

/** Append a domain event in the caller's transaction. Idempotent per (aggregate, version, type). Dispatcher: T18. */
export async function enqueue(tx, { aggregateType, aggregateId, aggregateVersion, eventType, publicPayload }) {
  await tx.insert(outboxEvents)
    .values({ aggregateType, aggregateId, aggregateVersion, eventType, publicPayload })
    .onConflictDoNothing();
}
