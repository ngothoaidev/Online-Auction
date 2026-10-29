import type { Tx } from "../db/index.ts";
import { adminAudit } from "../db/schema.ts";

// Only these fields of a target are ever copied into the trail (no emails, hashes, tokens, maxima, proofs).
const FIELDS: Record<string, string[]> = {
  user: ["status", "role"],
  seller_request: ["status", "userId"],
  category: ["name", "parentId"],
  listing: ["status", "bidCount"],
  report: ["status", "auctionId", "reason"],
};
export type AuditTarget = "user" | "seller_request" | "category" | "listing" | "report";
type Snapshot = Record<string, unknown> | null;

const pick = (type: AuditTarget, obj: Snapshot) => (obj ? Object.fromEntries(FIELDS[type].filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])) : null);

/** Append one admin action in the caller's transaction (same commit as the change it describes). */
export async function recordAdminAction(tx: Tx, { actor, action, targetType, targetId, reason = null, before = null, after = null }: {
  actor: { id: number }; action: string; targetType: AuditTarget; targetId: number;
  reason?: string | null; before?: Snapshot; after?: Snapshot;
}): Promise<void> {
  await tx.insert(adminAudit).values({ actorId: actor.id, action, targetType, targetId, reason: reason || null, before: pick(targetType, before), after: pick(targetType, after) });
}
