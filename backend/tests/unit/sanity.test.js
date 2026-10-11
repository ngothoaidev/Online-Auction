import { test } from "node:test";
import assert from "node:assert/strict";
import { assertTestDatabase } from "../helpers/db.js";

test("test helper refuses non-test databases", () => {
  assert.throws(() => assertTestDatabase("postgres://u:p@h:5432/auction"), /non-test/);
  assert.doesNotThrow(() => assertTestDatabase("postgres://u:p@h:5432/auction_test"));
});
