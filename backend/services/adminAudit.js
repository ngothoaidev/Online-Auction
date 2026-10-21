import { adminAudit } from "../db/schema.js";

// Only these fields of a target are ever copied into the trail (no emails, hashes, tokens, maxima, proofs).
const FIELDS = {
  user: ["status", "role"],
  seller_request: ["status", "userId"],
  category: ["name", "parentId"],
  listing: ["status", "bidCount"],
  report: ["status", "auctionId", "reason"],
};
const pick = (type, obj) => (obj ? Object.fromEntries(FIELDS[type].filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])) : null);

/** Append one admin action in the caller's transaction (same commit as the change it describes). */
export async function recordAdminAction(tx, { actor, action, targetType, targetId, reason = null, before = null, after = null }) {
  await tx.insert(adminAudit).values({ actorId: actor.id, action, targetType, targetId, reason: reason || null, before: pick(targetType, before), after: pick(targetType, after) });
}
