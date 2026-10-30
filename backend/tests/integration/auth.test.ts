import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.ts";
import type { TestApp, TestUser } from "../helpers/app.ts";

let t: TestApp, alice: TestUser, bob: TestUser;
before(async () => {
  t = await startApp();
  alice = await t.createUser("alice");
  bob = await t.createUser("bob");
});
after(() => t.stop());

const resetFlow = async (user) => {
  await t.call("POST", "/auth/forgot-password", { body: { email: user.email } });
  const otp = t.lastOtp(user.email);
  assert.ok(otp, "OTP email captured by the local sink");
  const { status, body } = await t.call("POST", "/auth/verify-reset-otp", { body: { email: user.email, otp } });
  return { otp, status, resetToken: body.resetToken };
};

test("reset-password with only email+newPassword is rejected and changes nothing", async () => {
  const r = await t.call("POST", "/auth/reset-password", { body: { email: alice.email, newPassword: "Hacked123" } });
  assert.equal(r.status, 400);
  assert.ok(await t.login(alice), "old password still works");
});

test("reset-password rejects a made-up or wrong-purpose token (OTP is not a grant)", async () => {
  const { otp } = await resetFlow(alice); // consumes the OTP, yields a real grant we deliberately ignore
  for (const resetToken of ["made-up-token", otp]) {
    const r = await t.call("POST", "/auth/reset-password", { body: { email: alice.email, newPassword: "Hacked123", resetToken } });
    assert.equal(r.status, 400);
  }
  assert.ok(await t.login(alice));
});

test("full reset: OTP -> grant -> new password; old password and old JWT stop working", async () => {
  const oldToken = await t.login(bob);
  const { status, resetToken } = await resetFlow(bob);
  assert.equal(status, 200);
  const r = await t.call("POST", "/auth/reset-password", { body: { email: bob.email, newPassword: "NewPass123", resetToken } });
  assert.equal(r.status, 200);

  const oldLogin = await t.call("POST", "/auth/login", { body: { identifier: bob.username, password: bob.password } });
  assert.equal(oldLogin.status, 401);
  const newLogin = await t.call("POST", "/auth/login", { body: { identifier: bob.username, password: "NewPass123" } });
  assert.equal(newLogin.status, 200);
  assert.equal(JSON.stringify(newLogin.body).includes("encryptedPassword"), false);

  const stale = await t.call("GET", "/auth/me", { token: oldToken });
  assert.equal(stale.status, 401);
  assert.equal(stale.body.code, "TOKEN_REVOKED");
  const me = await t.call("GET", "/auth/me", { token: newLogin.body.token });
  assert.equal(me.status, 200);
  assert.deepEqual(me.body, newLogin.body.user, "/auth/me returns the same user shape as login");

  // a grant works once
  const replay = await t.call("POST", "/auth/reset-password", { body: { email: bob.email, newPassword: "Again12345", resetToken } });
  assert.equal(replay.status, 400);
});

test("expired grant is rejected", async () => {
  const carol = await t.createUser("carol");
  const { resetToken } = await resetFlow(carol);
  await t.sql`UPDATE auth_challenges SET expires_at = now() - interval '1 second' WHERE user_id = ${carol.id}`;
  const r = await t.call("POST", "/auth/reset-password", { body: { email: carol.email, newPassword: "NewPass123", resetToken } });
  assert.equal(r.status, 400);
});

test("OTP attempts are capped: correct code after 5 wrong ones is refused", async () => {
  const dave = await t.createUser("dave");
  await t.call("POST", "/auth/forgot-password", { body: { email: dave.email } });
  const otp = t.lastOtp(dave.email);
  const wrong = otp === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) {
    assert.equal((await t.call("POST", "/auth/verify-reset-otp", { body: { email: dave.email, otp: wrong } })).status, 400);
  }
  assert.equal((await t.call("POST", "/auth/verify-reset-otp", { body: { email: dave.email, otp } })).status, 400);
});

test("two concurrent resets with the same grant: exactly one succeeds", async () => {
  const erin = await t.createUser("erin");
  const { resetToken } = await resetFlow(erin);
  const results = await Promise.all(["PassOne111", "PassTwo222", "PassThree333", "PassFour444"].map((newPassword) =>
    t.call("POST", "/auth/reset-password", { body: { email: erin.email, newPassword, resetToken } })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  const [{ auth_version }] = await t.sql`SELECT auth_version FROM users WHERE user_id = ${erin.id}`;
  assert.equal(auth_version, 1, "authVersion bumped exactly once");
});

test("forgot-password does not reveal whether an email exists", async () => {
  const known = await t.call("POST", "/auth/forgot-password", { body: { email: alice.email } });
  const unknown = await t.call("POST", "/auth/forgot-password", { body: { email: "nobody@example.test" } });
  assert.equal(known.status, 200);
  assert.deepEqual(unknown, known);
});

test("email verification code is purpose-scoped: a reset OTP cannot verify an account", async () => {
  const frank = await t.createUser("frank", { isVerified: false, role: "unauthorized" });
  await t.call("POST", "/auth/forgot-password", { body: { email: frank.email } });
  const resetOtp = t.lastOtp(frank.email);
  const r = await t.call("POST", "/auth/validate", { body: { email: frank.email, code: resetOtp } });
  assert.equal(r.status, 400);
  await t.call("POST", "/auth/resend-verification", { body: { email: frank.email } });
  const code = t.lastOtp(frank.email);
  assert.equal((await t.call("POST", "/auth/validate", { body: { email: frank.email, code } })).status, 200);
  const [row] = await t.sql`SELECT is_verified, role FROM users WHERE user_id = ${frank.id}`;
  assert.deepEqual({ v: row.is_verified, r: row.role }, { v: true, r: "buyer" });
});

test("change-password: OTP required, revokes the old token, returns a working fresh one", async () => {
  const gina = await t.createUser("gina");
  const token = await t.login(gina);
  assert.equal((await t.call("POST", "/auth/change-password/verify", { token, body: { otp: "123456", newPassword: "Whatever12" } })).status, 400);
  assert.equal((await t.call("POST", "/auth/change-password/request-otp", { token })).status, 200);
  const otp = t.lastOtp(gina.email);
  const r = await t.call("POST", "/auth/change-password/verify", { token, body: { otp, newPassword: "Whatever12" } });
  assert.equal(r.status, 200);
  assert.equal((await t.call("GET", "/auth/me", { token })).status, 401);
  assert.equal((await t.call("GET", "/auth/me", { token: r.body.token })).status, 200);
});
