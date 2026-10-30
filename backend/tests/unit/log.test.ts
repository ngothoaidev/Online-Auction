import { test } from "node:test";
import assert from "node:assert/strict";
import { redact } from "../../utils/log.ts";

test("redaction hides secrets and personal data at any depth, keeps the rest", () => {
  const out = redact({
    userId: 7, password: "p", authorization: "Bearer x", nested: { email: "a@b.c", phone: "1", shippingAddress: "x", ok: "keep" },
    list: [{ token: "t", resetToken: "r", amount: "5000" }], maximum: "99000", paymentProofUrl: "/order/1/proofs/x",
  });
  assert.deepEqual(out, {
    userId: 7, password: "[redacted]", authorization: "[redacted]", nested: { email: "[redacted]", phone: "[redacted]", shippingAddress: "[redacted]", ok: "keep" },
    list: [{ token: "[redacted]", resetToken: "[redacted]", amount: "5000" }], maximum: "[redacted]", paymentProofUrl: "[redacted]",
  });
});

test("errors keep name/message/code and a short stack", () => {
  const e = Object.assign(new Error("boom"), { code: "X" });
  const out = redact({ error: e }) as { error: { message: string; code: string; stack: string } };
  assert.equal(out.error.message, "boom");
  assert.equal(out.error.code, "X");
  assert.ok(out.error.stack.split("\n").length <= 6);
});

test("metrics: label values are escaped per the Prometheus text format, histograms are cumulative", async () => {
  const { inc, observe, render } = await import("../../utils/metrics.ts");
  inc("t_total", { route: '/a"b\\c\nd' }); // quote, backslash, newline
  observe("t_ms", { route: "/x/:id" }, 30);
  const text = render([{ name: "g", help: "h", value: 1, labels: { s: "pending" } }, { name: "g", value: 2, labels: { s: "failed" } }]);
  assert.ok(text.includes('t_total{route="/a\\"b\\\\c\\nd"} 1'), text);
  assert.match(text, /t_ms_bucket\{route="\/x\/:id",le="25"\} 0/);
  assert.match(text, /t_ms_bucket\{route="\/x\/:id",le="50"\} 1/);
  assert.match(text, /t_ms_bucket\{route="\/x\/:id",le="\+Inf"\} 1/);
  assert.equal(text.match(/# TYPE g gauge/g)?.length, 1);
  assert.match(text, /g\{s="pending"\} 1\ng\{s="failed"\} 2/);
});
