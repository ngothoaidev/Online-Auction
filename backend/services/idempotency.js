import crypto from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { commandRequests } from "../db/schema.ts";
import { AppError } from "../utils/errors.ts";

/** Stable SHA-256 over a canonical JSON form (sorted keys) so key order never changes the hash. */
export function hashPayload(value) {
  const canon = (v) => (v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
    : Array.isArray(v) ? v.map(canon) : v);
  return crypto.createHash("sha256").update(JSON.stringify(canon(value))).digest("hex");
}

export const validKey = (key) => typeof key === "string" && /^[A-Za-z0-9._:-]{8,100}$/.test(key);

/** Optional `Idempotency-Key` request header: null when absent, 400 when malformed. */
export function keyFrom(req) {
  const key = req.header("Idempotency-Key");
  if (key === undefined) return null;
  if (!validKey(key)) throw new AppError(400, "VALIDATION_ERROR", "Idempotency-Key must be 8-100 characters of [A-Za-z0-9._:-]");
  return key;
}

/**
 * Run `fn(tx)` at most once per (actor, operation, key), inside the caller's transaction `tx`.
 *  - The key row is claimed with INSERT .. ON CONFLICT DO NOTHING in the SAME transaction as the business writes, so a
 *    concurrent duplicate blocks on the unique index until the first commits (then replays) or rolls back (then proceeds).
 *  - `fn` returns { status, body, resourceId }; it is stored before commit. A thrown error rolls the claim back too.
 *  - Same key + different payload -> 409 IDEMPOTENCY_CONFLICT. Compacted results -> 409 IDEMPOTENCY_RESULT_EXPIRED (tombstone kept).
 *  - No key -> no idempotency (fn just runs); callers decide whether a key is mandatory.
 */
export async function runIdempotent(tx, { actorId, operation, key, payload }, fn) {
  if (!key) return { ...(await fn(tx)), replayed: false };
  const requestHash = hashPayload({ operation, payload });

  const [claimed] = await tx.insert(commandRequests)
    .values({ actorId, operation, idempotencyKey: key, requestHash })
    .onConflictDoNothing().returning({ id: commandRequests.id });

  if (!claimed) {
    const [prior] = await tx.select().from(commandRequests)
      .where(and(eq(commandRequests.actorId, actorId), eq(commandRequests.operation, operation), eq(commandRequests.idempotencyKey, key)));
    if (prior.requestHash !== requestHash) {
      throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This Idempotency-Key was already used with a different request");
    }
    if (prior.result === null) {
      throw new AppError(409, "IDEMPOTENCY_RESULT_EXPIRED", "The original result is no longer stored; refresh to see the current state", { resourceId: prior.resourceId });
    }
    return { status: prior.httpStatus, body: prior.result, resourceId: prior.resourceId, replayed: true };
  }

  const out = await fn(tx);
  await tx.update(commandRequests)
    .set({ httpStatus: out.status, result: out.body, resourceId: out.resourceId ?? null })
    .where(eq(commandRequests.id, claimed.id));
  return { ...out, replayed: false };
}

/** Retention: drop bulky results older than the cutoff but keep key+hash+resource as a tombstone so old keys can never act as new requests. */
export async function compactResults(tx, olderThan) {
  const res = await tx.update(commandRequests).set({ result: null })
    .where(and(lt(commandRequests.createdAt, olderThan), sql`${commandRequests.result} IS NOT NULL`)).returning({ id: commandRequests.id });
  return res.length;
}
