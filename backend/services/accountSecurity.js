import { eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { users } from "../db/schema.js";
import authService from "./auth.js";
import { PURPOSES, issue, consume, revokeAll, newOtp, newGrant } from "./authChallenges.js";

/** Replace password + bump authVersion (revokes every older JWT) + kill live challenges. Caller supplies the tx. */
async function setPassword(tx, userId, newPassword) {
  const [row] = await tx.update(users)
    .set({ encryptedPassword: await authService.hashPassword(newPassword), authVersion: sql`${users.authVersion} + 1` })
    .where(eq(users.id, userId)).returning({ authVersion: users.authVersion });
  await revokeAll(tx, userId);
  return row.authVersion;
}

const service = {
  issueVerificationCode: (userId) => issue(db, userId, PURPOSES.VERIFY_EMAIL, newOtp()),

  /** Consume a verify-email code and activate the account atomically. */
  verifyEmail: (user, code) => db.transaction(async (tx) => {
    if (!(await consume(tx, user.id, PURPOSES.VERIFY_EMAIL, code))) return false;
    await tx.update(users).set({ isVerified: true, role: 'buyer' }).where(eq(users.id, user.id));
    return true;
  }),

  issueResetOtp: (userId) => issue(db, userId, PURPOSES.RESET_OTP, newOtp()),

  /** OTP -> opaque, short-lived, single-use reset grant (null when the OTP is wrong/expired/exhausted). */
  exchangeResetOtp: (userId, otp) => db.transaction(async (tx) => {
    if (!(await consume(tx, userId, PURPOSES.RESET_OTP, otp))) return null;
    return issue(tx, userId, PURPOSES.RESET_GRANT, newGrant());
  }),

  /** Consume the grant and change the password in ONE transaction: one grant -> at most one reset. */
  resetPasswordWithGrant: (userId, grant, newPassword) => db.transaction(async (tx) => {
    if (!(await consume(tx, userId, PURPOSES.RESET_GRANT, grant))) return false;
    await setPassword(tx, userId, newPassword);
    return true;
  }),

  issueChangePasswordOtp: (userId) => issue(db, userId, PURPOSES.CHANGE_PASSWORD, newOtp()),

  /** Returns the user's new authVersion, or null if the OTP is invalid. */
  changePasswordWithOtp: (userId, otp, newPassword) => db.transaction(async (tx) => {
    if (!(await consume(tx, userId, PURPOSES.CHANGE_PASSWORD, otp))) return null;
    return setPassword(tx, userId, newPassword);
  }),
};

export default service;
