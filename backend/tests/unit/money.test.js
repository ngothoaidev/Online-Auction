import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, fromDb, toStr, formatVnd, MoneyError, MAX_MONEY } from "../../domain/money.js";
import { hashPayload, validKey } from "../../services/idempotency.js";

test("parseMoney accepts positive whole amounts up to 15 digits", () => {
  assert.equal(parseMoney("1"), 1n);
  assert.equal(parseMoney(" 1500000 "), 1500000n);
  assert.equal(parseMoney(2500000), 2500000n);
  assert.equal(parseMoney(10n ** 15n - 1n), MAX_MONEY);
  assert.equal(toStr(parseMoney("999999999999999")), "999999999999999");
});

test("parseMoney rejects zero, negatives, fractions, NaN/Infinity, exponents, overflow and junk", () => {
  for (const bad of [0, "0", -1, "-5", 1.5, "1.5", "1.0", NaN, Infinity, "1e3", 1e21, "0x10", "007", "", " ", null, undefined, {}, [], "1000000000000000", 2 ** 53]) {
    assert.throws(() => parseMoney(bad), MoneyError, String(bad));
  }
});

test("BigInt arithmetic stays exact where Number would not", () => {
  const a = parseMoney("999999999999998");
  assert.equal((a + 1n).toString(), "999999999999999");
  assert.equal(formatVnd(1234567890123n), "1.234.567.890.123");
  assert.equal(fromDb("1200000"), 1200000n);
  assert.equal(fromDb("1200000.00"), 1200000n);
  assert.equal(fromDb(null), null);
});

test("hashPayload ignores key order and distinguishes values; idempotency keys are validated", () => {
  assert.equal(hashPayload({ a: 1, b: { c: 2, d: 3 } }), hashPayload({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(hashPayload({ amount: "100" }), hashPayload({ amount: "101" }));
  assert.equal(hashPayload("x").length, 64);
  assert.ok(validKey("abc12345-xyz"));
  for (const k of [undefined, "", "short", "has space 123", "x".repeat(101)]) assert.equal(validKey(k), false);
});
