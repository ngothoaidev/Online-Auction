import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t, admin, seller, buyer, buyer2, tokens, categoryId;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000", COMMENT_RATE_LIMIT_MAX: "100000" });
  admin = await t.createUser("madmin", { role: "admin" });
  seller = await t.createUser("mseller", { role: "seller" });
  buyer = await t.createUser("mbuyer");
  buyer2 = await t.createUser("mbuyer2");
  tokens = { admin: await t.tokenFor(admin), seller: await t.tokenFor(seller), buyer: await t.tokenFor(buyer), buyer2: await t.tokenFor(buyer2) };
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('mc') RETURNING category_id AS id`;
});
after(() => t.stop());

const call = (method, path, who, body, headers = {}) => fetch(t.base + path, {
  method, headers: { "Content-Type": "application/json", ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...headers }, body: body && method !== "GET" ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const audit = (type, id) => t.sql`SELECT * FROM admin_audit WHERE target_type = ${type} AND target_id = ${id} ORDER BY id`;
const lot = async ({ status = "active" } = {}) => (await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status)
  VALUES (${seller.id}, ${categoryId}, 'Reported lot', 'd', 1000, 1000, 100, now() + interval '1 hour', ${status}) RETURNING auction_id AS id`)[0].id;
const ratings = async (id) => (await t.sql`SELECT rating_count, positive_rating_count FROM users WHERE user_id = ${id}`)[0];

test("admin-only APIs refuse buyers, sellers and guests (direct API, not just hidden UI)", async () => {
  const admin_only = [["GET", "/admin/reports"], ["GET", "/admin/audit"], ["POST", "/admin/reports/1/resolve"], ["POST", `/users/${buyer.id}/ban`],
    ["POST", `/users/${buyer.id}/unban`], ["PUT", `/users/${buyer.id}/role`], ["POST", "/categories"], ["DELETE", `/categories/${categoryId}`], ["POST", "/seller/requests/1/approve"]];
  for (const [m, p] of admin_only) {
    assert.equal((await call(m, p, null, {})).status, 401, `${m} ${p} guest`);
    for (const who of ["buyer", "seller"]) assert.equal((await call(m, p, who, { reason: "x", role: "admin", name: "x" })).status, 403, `${m} ${p} ${who}`);
  }
  assert.equal((await ratings(buyer.id)).rating_count, 0);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM admin_audit`)[0].n, 0);
});

test("ban needs a reason, is audited without private fields, replays on the same key and conflicts on reuse", async () => {
  const target = await t.createUser("mtarget");
  const token = await t.tokenFor(target);
  assert.equal((await call("POST", `/users/${target.id}/ban`, "admin", {})).body.code, "VALIDATION_ERROR");
  const before = await ratings(target.id);

  const key = { "Idempotency-Key": "ban-target-0001" };
  const [x, y] = await Promise.all([call("POST", `/users/${target.id}/ban`, "admin", { reason: "fraudulent bids" }, key), call("POST", `/users/${target.id}/ban`, "admin", { reason: "fraudulent bids" }, key)]);
  assert.deepEqual([x.status, y.status], [200, 200]);
  assert.deepEqual([x.body.replayed, y.body.replayed].sort(), [false, true]);
  assert.equal(x.body.user.status, "banned");
  const rows = await audit("user", target.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, "user.ban");
  assert.equal(rows[0].actor_id, admin.id);
  assert.equal(rows[0].reason, "fraudulent bids");
  assert.deepEqual(rows[0].before, { status: "active", role: "buyer" });
  assert.deepEqual(rows[0].after, { status: "banned", role: "buyer" });
  assert.ok(!JSON.stringify(rows).includes("example.test") && !JSON.stringify(rows).includes("$2b$"), "no email / password hash in the trail");

  assert.equal((await call("POST", `/users/${buyer.id}/ban`, "admin", { reason: "other" }, key)).body.code, "IDEMPOTENCY_CONFLICT");
  assert.equal((await call("POST", `/users/${target.id}/ban`, "admin", { reason: "again" })).body.code, "ALREADY_BANNED");
  assert.equal((await t.call("GET", "/users/profile", { token })).status, 403, "the ban applies to tokens already issued");
  assert.equal((await call("POST", `/users/${admin.id}/ban`, "admin", { reason: "x" })).body.code, "CANNOT_BAN_ADMIN");

  assert.equal((await call("POST", `/users/${target.id}/unban`, "admin", { reason: "appeal accepted" })).status, 200);
  assert.deepEqual((await audit("user", target.id)).map((r) => r.action), ["user.ban", "user.unban"]);
  assert.deepEqual(await ratings(target.id), before, "moderation never edits reputation");
});

test("role changes are audited; an admin cannot change their own role", async () => {
  assert.equal((await call("PUT", `/users/${admin.id}/role`, "admin", { role: "buyer" })).body.code, "CANNOT_CHANGE_OWN_ROLE");
  const u = await t.createUser("mrole");
  assert.equal((await call("PUT", `/users/${u.id}/role`, "admin", { role: "seller", reason: "verified dealer" })).status, 200);
  const [row] = await audit("user", u.id);
  assert.deepEqual([row.action, row.before.role, row.after.role, row.reason], ["user.role_change", "buyer", "seller", "verified dealer"]);
});

test("seller requests: rejection keeps the row (7-day reapply rule now works), approval upgrades the role, both audited", async () => {
  const u = await t.createUser("mapplicant");
  const ut = await t.tokenFor(u);
  assert.equal((await t.call("POST", "/seller/request", { token: ut, body: { reason: "I sell maps" } })).status, 201);
  const [{ request_id: first }] = await t.sql`SELECT request_id FROM seller_requests WHERE user_id = ${u.id}`;
  assert.equal((await call("POST", `/seller/requests/${first}/reject`, "admin", { reason: "no history" })).status, 200);
  assert.equal((await t.sql`SELECT status FROM seller_requests WHERE request_id = ${first}`)[0].status, "rejected");
  const again = await t.call("POST", "/seller/request", { token: ut, body: { reason: "please" } });
  assert.equal(again.status, 400);
  assert.match(again.body.message, /reapply after/);
  assert.equal((await call("POST", `/seller/requests/${first}/approve`, "admin", {})).body.code, "ALREADY_PROCESSED");

  await t.sql`UPDATE seller_requests SET updated_at = now() - interval '8 days' WHERE request_id = ${first}`;
  assert.equal((await t.call("POST", "/seller/request", { token: ut, body: { reason: "second try" } })).status, 201);
  const [{ request_id: second }] = await t.sql`SELECT request_id FROM seller_requests WHERE user_id = ${u.id} AND status = 'pending'`;
  assert.equal((await call("POST", `/seller/requests/${second}/approve`, "admin", { note: "ok" })).status, 200);
  assert.equal((await t.sql`SELECT role FROM users WHERE user_id = ${u.id}`)[0].role, "seller");
  assert.deepEqual((await audit("seller_request", first)).map((r) => [r.action, r.after.status]), [["seller_request.reject", "rejected"]]);
  assert.deepEqual((await audit("seller_request", second)).map((r) => [r.action, r.after.status]), [["seller_request.approve", "approved"]]);
});

test("categories: create/update/delete audited; a refused delete removes nothing (no half-deleted tree)", async () => {
  const main = (await call("POST", "/categories", "admin", { name: "Clocks" })).body.category;
  const sub = (await call("POST", "/categories", "admin", { name: "Mantel clocks", parentId: main.id })).body.category;
  await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time) VALUES (${seller.id}, ${main.id}, 'x', 'd', 1000, 1000, 100, now() + interval '1 hour')`;
  const refused = await call("DELETE", `/categories/${main.id}`, "admin");
  assert.equal(refused.status, 400);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM categories WHERE category_id = ${sub.id}`)[0].n, 1, "the empty subcategory was NOT deleted by the refused request");
  assert.equal((await call("PUT", `/categories/${sub.id}`, "admin", { name: "Bracket clocks" })).status, 200);
  assert.equal((await call("DELETE", `/categories/${sub.id}`, "admin")).status, 200);
  assert.deepEqual((await audit("category", sub.id)).map((r) => [r.action, r.before?.name ?? null, r.after?.name ?? null]),
    [["category.create", null, "Mantel clocks"], ["category.update", "Mantel clocks", "Bracket clocks"], ["category.delete", "Bracket clocks", null]]);
});

test("reports: validation, one open report per reporter, no self-report", async () => {
  const id = await lot();
  assert.equal((await call("POST", `/auction/${id}/reports`, null, { reason: "counterfeit" })).status, 401);
  assert.equal((await call("POST", `/auction/${id}/reports`, "buyer", { reason: "spam" })).status, 400);
  assert.equal((await call("POST", `/auction/${id}/reports`, "buyer", { reason: "other" })).status, 400, "'other' needs details");
  assert.equal((await call("POST", `/auction/${id}/reports`, "seller", { reason: "counterfeit" })).body.code, "OWN_LISTING");
  assert.equal((await call("POST", `/auction/${id}/reports`, "buyer", { reason: "counterfeit", details: "Logo is wrong" })).status, 201);
  assert.equal((await call("POST", `/auction/${id}/reports`, "buyer", { reason: "misleading" })).body.code, "ALREADY_REPORTED");
  assert.equal((await call("POST", `/auction/999999/reports`, "buyer", { reason: "counterfeit" })).status, 404);
});

test("cancel_listing on an active lot with bids: one transaction cancels via the domain command, closes every open report, audits all", async () => {
  const id = await lot();
  await t.call("POST", `/auction/${id}/bid`, { token: tokens.buyer, body: { amount: "5000" } });
  await t.call("POST", `/auction/${id}/bid`, { token: tokens.buyer2, body: { amount: "7000" } });
  await call("POST", `/auction/${id}/reports`, "buyer", { reason: "counterfeit" });
  const r2 = (await call("POST", `/auction/${id}/reports`, "buyer2", { reason: "prohibited", details: "ivory" })).body.report.id;
  const listed = (await call("GET", "/admin/reports?status=open", "admin")).body.items.filter((r) => r.auctionId === id);
  assert.equal(listed.length, 2);
  assert.equal(listed[0].lotBidCount, 2);
  const sellerBefore = await ratings(seller.id);

  assert.equal((await call("POST", `/admin/reports/${r2}/resolve`, "admin", { action: "cancel_listing" })).status, 400, "a note is required");
  const key = { "Idempotency-Key": "resolve-key-0001" };
  const [a, b] = await Promise.all([
    call("POST", `/admin/reports/${r2}/resolve`, "admin", { action: "cancel_listing", note: "counterfeit confirmed" }, key),
    call("POST", `/admin/reports/${r2}/resolve`, "admin", { action: "cancel_listing", note: "counterfeit confirmed" }, key),
  ]);
  assert.deepEqual([a.status, b.status], [200, 200]);
  assert.deepEqual([a.body.replayed, b.body.replayed].sort(), [false, true]);

  const [auction] = await t.sql`SELECT status, bid_count FROM auctions WHERE auction_id = ${id}`;
  assert.deepEqual([auction.status, auction.bid_count], ["cancelled", 2]);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM bids WHERE auction_id = ${id}`)[0].n >= 2, true, "history is kept");
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM outbox_events WHERE aggregate_id = ${id} AND event_type = 'auction.cancelled'`)[0].n, 1);
  assert.deepEqual((await t.sql`SELECT status FROM listing_reports WHERE auction_id = ${id}`).map((r) => r.status), ["actioned", "actioned"]);
  const trail = await t.sql`SELECT action, target_type, reason FROM admin_audit WHERE (target_type = 'listing' AND target_id = ${id}) OR (target_type = 'report' AND (after->>'auctionId')::int = ${id}) ORDER BY id`;
  assert.deepEqual(trail.map((r) => r.action), ["listing.cancel", "report.action", "report.action"]);
  assert.ok(trail.every((r) => r.reason === "counterfeit confirmed"));
  assert.deepEqual(await ratings(seller.id), sellerBefore, "no reputation change from moderation");

  const again = await call("POST", `/admin/reports/${r2}/resolve`, "admin", { action: "cancel_listing", note: "again" });
  assert.equal(again.status, 409);
});

test("dismiss leaves the lot alone; cancelling an ended lot is refused and the reports stay open (rollback)", async () => {
  const open = await lot();
  const r = (await call("POST", `/auction/${open}/reports`, "buyer", { reason: "offensive" })).body.report.id;
  assert.equal((await call("POST", `/admin/reports/${r}/resolve`, "admin", { action: "dismiss", note: "not offensive" })).body.status, "dismissed");
  assert.equal((await t.sql`SELECT status FROM auctions WHERE auction_id = ${open}`)[0].status, "active");

  const ended = await lot({ status: "ended" });
  const e = (await call("POST", `/auction/${ended}/reports`, "buyer", { reason: "misleading" })).body.report.id;
  const refused = await call("POST", `/admin/reports/${e}/resolve`, "admin", { action: "cancel_listing", note: "too late" });
  assert.equal(refused.body.code, "AUCTION_NOT_ACTIVE");
  assert.equal((await t.sql`SELECT status FROM listing_reports WHERE id = ${e}`)[0].status, "open");
  assert.equal((await audit("report", e)).length, 0);
});

test("admin cancel through the listing endpoint needs a reason and is audited; the seller's own cancel is not an admin action", async () => {
  const id = await lot();
  assert.equal((await call("DELETE", `/auction/${id}`, "admin")).status, 400);
  assert.equal((await call("DELETE", `/auction/${id}`, "admin", { reason: "duplicate listing" })).status, 200);
  assert.deepEqual((await audit("listing", id)).map((r) => [r.action, r.reason, r.before.status, r.after.status]), [["listing.cancel", "duplicate listing", "active", "cancelled"]]);
  const own = await lot();
  assert.equal((await call("DELETE", `/auction/${own}`, "seller")).status, 200);
  assert.equal((await audit("listing", own)).length, 0);
});

test("the audit trail is append-only and filterable", async () => {
  await assert.rejects(t.sql`UPDATE admin_audit SET reason = 'edited'`, /append-only/);
  await assert.rejects(t.sql`DELETE FROM admin_audit`, /append-only/);
  const res = await call("GET", "/admin/audit?targetType=user", "admin");
  assert.equal(res.status, 200);
  assert.ok(res.body.items.length >= 3 && res.body.items.every((r) => r.targetType === "user"));
  assert.equal(res.body.items[0].actor, "madmin");
});
