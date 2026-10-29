import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuctionBody } from "../../validation/auction.js";
import { moneyInput } from "../../validation/index.js";
import { sanitizeRichText } from "../../utils/sanitize.js";

const future = new Date(Date.now() + 86400000).toISOString();
const base = { title: "Lot", categoryId: "3", startingPrice: "1000", stepPrice: "100", endTime: future };

test("multipart booleans: 'false' is false, garbage is rejected", () => {
  assert.equal(createAuctionBody.parse({ ...base, autoExtend: "false" }).autoExtend, false);
  assert.equal(createAuctionBody.parse({ ...base, autoExtend: "true" }).autoExtend, true);
  assert.equal(createAuctionBody.parse(base).allowNewbies, true);
  assert.throws(() => createAuctionBody.parse({ ...base, autoExtend: "yes" }));
});

test("create body: privileged fields are stripped, prices must be whole positive amounts", () => {
  const out = createAuctionBody.parse({ ...base, winnerId: 1, status: "sold", currentPrice: "1", sellerId: 99, buyNowPrice: "" });
  assert.deepEqual(Object.keys(out).sort(), ["allowNewbies", "autoExtend", "buyNowPrice", "categoryId", "description", "endTime", "startingPrice", "stepPrice", "title"]);
  assert.equal(out.buyNowPrice, null);
  for (const startingPrice of ["0", "-1", "1.5", "1e3", "abc", "9".repeat(16)]) assert.throws(() => createAuctionBody.parse({ ...base, startingPrice }), startingPrice);
});

test("create body: buyNow must exceed starting price and endTime must be in the future", () => {
  assert.throws(() => createAuctionBody.parse({ ...base, buyNowPrice: "1000" }));
  assert.equal(createAuctionBody.parse({ ...base, buyNowPrice: "1001" }).buyNowPrice, "1001");
  assert.throws(() => createAuctionBody.parse({ ...base, endTime: new Date(Date.now() - 1000).toISOString() }));
});

test("moneyInput accepts numbers and digit strings up to 15 digits only", () => {
  assert.equal(moneyInput.parse(1500000), "1500000");
  assert.equal(moneyInput.parse("999999999999999"), "999999999999999");
  for (const v of [0, "0", -1, 1.5, "1.0", "007", " ", "", NaN, Infinity, "1000000000000000"]) assert.throws(() => moneyInput.parse(v), String(v));
});

test("sanitizeRichText keeps editor markup and removes active content", () => {
  assert.equal(sanitizeRichText("<p>hi <strong>there</strong></p>"), "<p>hi <strong>there</strong></p>");
  const dirty = '<p onclick="x()">a</p><script>b()</script><img src=x onerror=c()><a href="javascript:d()">e</a><iframe src="//evil"></iframe>';
  const clean = sanitizeRichText(dirty);
  assert.doesNotMatch(clean, /script|onclick|onerror|javascript:|iframe|<img/i);
  assert.match(clean, /<p>a<\/p>/);
  assert.equal(sanitizeRichText(undefined), "");
});
