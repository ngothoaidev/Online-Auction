import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t;
before(async () => { t = await startApp({ AUTH_RATE_LIMIT_MAX: "3" }); });
after(() => t.stop());

test("credential endpoints answer 429 with retryAfter after the limit", async () => {
  const body = { identifier: "nobody", password: "x" };
  const statuses = [];
  let last;
  for (let i = 0; i < 5; i++) { last = await t.call("POST", "/auth/login", { body }); statuses.push(last.status); }
  assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
  assert.equal(last.body.code, "RATE_LIMITED");
  assert.ok(last.body.retryAfter > 0);
});
