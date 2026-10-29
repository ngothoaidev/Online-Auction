import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { authChallenges } from "../db/schema.js";
import { hmac } from "./auth.js";

export const PURPOSES = Object.freeze({
  VERIFY_EMAIL: "verify_email",
  RESET_OTP: "reset_password",
  RESET_GRANT: "reset_grant",
  CHANGE_PASSWORD: "change_password",
});

const MAX_ATTEMPTS = Number(process.env.AUTH_CHALLENGE_MAX_ATTEMPTS || 5);
export const TTL_MS = {
  [PURPOSES.VERIFY_EMAIL]: 24 * 60 * 60 * 1000,
  [PURPOSES.RESET_OTP]: 10 * 60 * 1000,
  [PURPOSES.RESET_GRANT]: 5 * 60 * 1000,
  [PURPOSES.CHANGE_PASSWORD]: 10 * 60 * 1000,
};

export const newOtp = () => String(crypto.randomInt(100000, 1000000));
export const newGrant = () => crypto.randomBytes(32).toString("base64url");

/** Issue a new code, invalidating any earlier unconsumed one for the same user+purpose. `tx` may be db or a transaction. */
export async function issue(tx, userId, purpose, code, now = new Date()) {
  await tx.update(authChallenges).set({ consumedAt: now })
    .where(and(eq(authChallenges.userId, userId), eq(authChallenges.purpose, purpose), isNull(authChallenges.consumedAt)));
  await tx.insert(authChallenges).values({
    userId, purpose, hashedCode: hmac(`${purpose}:${code}`), expiresAt: new Date(now.getTime() + TTL_MS[purpose]),
  });
  return code;
}

/**
 * Atomically check and consume the latest live challenge. Must run inside a transaction so the row lock
 * serialises concurrent consumers: exactly one caller sees `true`. A wrong code burns an attempt and
 * returns false (the caller must still commit so the attempt is persisted).
 */
export async function consume(tx, userId, purpose, code, now = new Date()) {
  if (typeof code !== "string" || !code) return false;
  const [row] = await tx.select().from(authChallenges)
    .where(and(eq(authChallenges.userId, userId), eq(authChallenges.purpose, purpose), isNull(authChallenges.consumedAt)))
    .orderBy(sql`${authChallenges.id} DESC`).limit(1).for("update");
  if (!row || row.expiresAt <= now || row.attempts >= MAX_ATTEMPTS) return false;

  const given = Buffer.from(hmac(`${purpose}:${code}`));
  const want = Buffer.from(row.hashedCode);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    await tx.update(authChallenges).set({ attempts: row.attempts + 1 }).where(eq(authChallenges.id, row.id));
    return false;
  }
  await tx.update(authChallenges).set({ consumedAt: now }).where(eq(authChallenges.id, row.id));
  return true;
}

/** Invalidate every live challenge of a user (after password reset/change). */
export async function revokeAll(tx, userId, now = new Date()) {
  await tx.update(authChallenges).set({ consumedAt: now })
    .where(and(eq(authChallenges.userId, userId), isNull(authChallenges.consumedAt)));
}
