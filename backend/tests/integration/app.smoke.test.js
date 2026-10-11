import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t;
before(async () => { t = await startApp(); });
after(() => t.stop());

test("app boots and serves a public read endpoint against the test DB", async () => {
  const res = await t.call("GET", "/categories");
  assert.equal(res.status, 200);
});
