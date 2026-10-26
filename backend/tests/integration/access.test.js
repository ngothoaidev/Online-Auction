import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t, buyer, seller, outsider, admin, unverified, banned, orderId, auctionId;
const tokens = {};

before(async () => {
  t = await startApp();
  [buyer, seller, outsider, admin, unverified, banned] = await Promise.all([
    t.createUser("buyer"), t.createUser("seller", { role: "seller" }), t.createUser("outsider"),
    t.createUser("admin", { role: "admin" }), t.createUser("unverified", { isVerified: false, role: "unauthorized" }),
    t.createUser("banneduser"),
  ]);
  for (const [k, u] of Object.entries({ buyer, seller, outsider, admin, unverified, banned })) tokens[k] = await t.login(u);
  await t.sql`UPDATE users SET status='banned' WHERE user_id=${banned.id}`;

  const [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
  [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id)
    VALUES (${seller.id}, ${categoryId}, 't', 'd', 1000, 1000, 100, now() - interval '1 hour', 'ended', ${buyer.id}) RETURNING auction_id AS id`;
  [{ id: orderId }] = await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price)
    VALUES (${auctionId}, ${buyer.id}, ${seller.id}, 1000) RETURNING order_id AS id`;
});
after(() => t.stop());

const PROTECTED = [
  ["GET", "/auth/me"], ["POST", "/auth/change-password/request-otp"], ["POST", "/auth/change-password/verify"],
  ["POST", "/auction"], ["DELETE", "/auction/reject"], ["PUT", "/auction/1"], ["PUT", "/auction/1/description"], ["DELETE", "/auction/1"],
  ["POST", "/auction/1/bid"], ["POST", "/auction/1/comments"], ["POST", "/auction/1/buy-now"],
  ["POST", "/users/favorites/1"], ["PUT", "/users/info"], ["PUT", "/users/avatar"], ["GET", "/users"], ["GET", "/users/stats"], ["GET", "/users/1"],
  ["POST", "/users/1/ban"], ["POST", "/users/1/unban"], ["PUT", "/users/1/role"],
  ["POST", "/seller/request"], ["GET", "/seller/my-request"], ["GET", "/seller/requests"], ["POST", "/seller/requests/1/approve"],
  ["GET", "/categories/admin"], ["POST", "/categories"], ["PUT", "/categories/1"], ["DELETE", "/categories/1"],
  ["GET", "/order/my"], ["GET", "/order/auction/1"], ["GET", "/order/1"], ["POST", "/order/1/payment"], ["POST", "/order/1/confirm"],
  ["POST", "/order/1/receipt"], ["POST", "/order/1/review"], ["POST", "/order/1/cancel"], ["GET", "/order/1/messages"], ["POST", "/order/1/messages"],
];

test("guests get 401 on every protected route (never 500, never a write)", async () => {
  for (const [method, path] of PROTECTED) {
    const r = await t.call(method, path, { body: method === "GET" ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${path} -> ${r.status}`);
  }
});

test("invalid/expired/forged token is 401 even on public routes; 'Bearer null' stays a guest", async () => {
  assert.equal((await t.call("GET", "/categories", { token: "garbage" })).status, 401);
  assert.equal((await t.call("GET", "/categories", { token: "null" })).status, 200);
  assert.equal((await t.call("GET", "/categories")).status, 200);
});

test("a token issued before the ban stops working", async () => {
  const r = await t.call("GET", "/auth/me", { token: tokens.banned });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, "ACCOUNT_BANNED");
  assert.equal((await t.call("POST", "/auth/login", { body: { identifier: banned.username, password: banned.password } })).status, 403);
});

test("role matrix: buyer cannot use admin or seller endpoints", async () => {
  for (const [method, path] of [["GET", "/users"], ["POST", "/users/1/ban"], ["POST", "/categories"], ["GET", "/seller/requests"], ["POST", "/auction"], ["PUT", "/auction/1/description"]]) {
    const r = await t.call(method, path, { token: tokens.buyer, body: method === "GET" ? undefined : {} });
    assert.equal(r.status, 403, `${method} ${path} -> ${r.status}`);
  }
});

test("unverified account cannot bid, buy now or comment", async () => {
  for (const path of ["/auction/1/bid", "/auction/1/buy-now", "/auction/1/comments"]) {
    const r = await t.call("POST", path, { token: tokens.unverified, body: {} });
    assert.equal(r.status, 403, path);
    assert.equal(r.body.code, "EMAIL_NOT_VERIFIED");
  }
});

test("order resources: an outsider is denied every read and write; participants are allowed to read", async () => {
  const o = tokens.outsider;
  const probes = [
    ["GET", `/order/${orderId}`], ["GET", `/order/auction/${auctionId}`], ["GET", `/order/${orderId}/messages`],
    ["POST", `/order/${orderId}/payment`], ["POST", `/order/${orderId}/confirm`], ["POST", `/order/${orderId}/receipt`],
    ["POST", `/order/${orderId}/cancel`], ["POST", `/order/${orderId}/messages`], ["POST", `/order/${orderId}/review`],
  ];
  for (const [method, path] of probes) {
    const r = await t.call(method, path, { token: o, body: method === "GET" ? undefined : { message: "hi", isGoodRating: true } });
    assert.equal(r.status, 403, `${method} ${path} -> ${r.status} ${JSON.stringify(r.body)}`);
  }
  assert.equal((await t.call("GET", `/order/${orderId}`, { token: tokens.buyer })).status, 200);
  assert.equal((await t.call("GET", `/order/${orderId}`, { token: tokens.seller })).status, 200);
  const [{ status }] = await t.sql`SELECT status FROM orders WHERE order_id=${orderId}`;
  assert.equal(status, "pending_payment", "outsider probes changed nothing");
});

test("OAuth callback guard: banned users are redirected without a token, normal users receive a valid one", async () => {
  const { oauthFinish } = await import("../../controllers/auth.js");
  const authService = (await import("../../services/auth.js")).default;
  const redirects = [];
  const res = { redirect: (u) => redirects.push(u) };
  await oauthFinish("google", res, null, { id: 1, username: "x", email: "x@e.t", status: "banned", role: "buyer" });
  await oauthFinish("google", res, null, { id: buyer.id, username: "buyer", email: buyer.email, status: "active", role: "buyer", authVersion: 0 });
  await oauthFinish("google", res, new Error("boom"), null);
  assert.match(redirects[0], /error=account_banned/);
  assert.doesNotMatch(redirects[0], /token=/);
  const token = new URL(redirects[1]).searchParams.get("token");
  assert.equal((await authService.validateToken(token)).userId, buyer.id);
  assert.match(redirects[2], /error=google_failed/);
});

test("OAuth link by email claims an unverified account (pre-hijack) but leaves a verified one alone", async () => {
  const accountSecurity = (await import("../../services/accountSecurity.js")).default;
  const userService = (await import("../../services/user.js")).default;
  const authService = (await import("../../services/auth.js")).default;
  const squatter = await t.createUser("squatter", { isVerified: false, role: "unauthorized" });
  const squatterToken = t.tokenFor(squatter);
  const claimed = await accountSecurity.linkProvider(await userService.getByEmail(squatter.email), { googleId: "g-1" });
  assert.deepEqual([claimed.isVerified, claimed.role, claimed.googleId], [true, "buyer", "g-1"]);
  assert.equal(await authService.validatePassword(squatter.password, claimed.encryptedPassword), false, "pre-set password is gone");
  assert.equal((await t.call("GET", "/auth/me", { token: await squatterToken })).status, 401, "earlier tokens are revoked");

  const owner = await t.createUser("owner");
  const linked = await accountSecurity.linkProvider(await userService.getByEmail(owner.email), { facebookId: "f-1" });
  assert.equal(linked.facebookId, "f-1");
  assert.equal(await authService.validatePassword(owner.password, linked.encryptedPassword), true, "verified owner keeps the password");
  assert.equal(linked.authVersion, 0);
});
