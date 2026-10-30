import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.ts";
import type { TestApp } from "../helpers/app.ts";

let t: TestApp;
before(async () => { t = await startApp({ AUTH_RATE_LIMIT_MAX: "3", COMMENT_RATE_LIMIT_MAX: "2", BID_RATE_LIMIT_MAX: "2" }); });
after(() => t.stop());

test("credential endpoints answer 429 with retryAfter after the limit", async () => {
  const body = { identifier: "nobody", password: "x" };
  const statuses: number[] = [];
  let last;
  for (let i = 0; i < 5; i++) { last = await t.call("POST", "/auth/login", { body }); statuses.push(last.status); }
  assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
  assert.equal(last.body.code, "RATE_LIMITED");
  assert.ok(last.body.retryAfter > 0);
});

test("write actions are limited per user: comments and bids answer 429 after the cap", async () => {
  const u = await t.createUser("chatty");
  const token = await t.tokenFor(u);
  const [{ id: cat }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
  const [{ id: auction }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${u.id}, ${cat}, 't', 'd', 1000, 1000, 100, now() + interval '1 day') RETURNING auction_id AS id`;
  const comments: number[] = [];
  for (let i = 0; i < 3; i++) comments.push((await t.call("POST", `/auction/${auction}/comments`, { token, body: { content: "hi" } })).status);
  assert.deepEqual(comments, [201, 201, 429]);
  const bids: number[] = [];
  for (let i = 0; i < 3; i++) bids.push((await t.call("POST", `/auction/${auction}/bid`, { token, body: { amount: 5000 } })).status);
  assert.equal(bids[2], 429);
});
