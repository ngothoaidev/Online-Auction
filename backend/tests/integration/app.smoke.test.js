import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { TEST_DATABASE_URL, assertTestDatabase, connect, resetDatabase } from "../helpers/db.js";

let server, base, dbModule;
before(async () => {
  assertTestDatabase();
  const sql = connect(); await resetDatabase(sql); await sql.end();
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET ||= "test-secret";
  dbModule = await import("../../db/index.js");
  const { default: app } = await import("../../app.js");
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((r) => server.close(r)); await dbModule.client.end(); });

test("app boots and serves a read endpoint against the test DB", async () => {
  const res = await fetch(`${base}/categories`);
  assert.ok(res.status < 500, `status ${res.status}`);
});
