import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_unit";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit";
const { verifyEvent } = await import("../../adapters/payments/stripe.ts");

const signed = (event: object) => {
  const payload = JSON.stringify(event);
  const header = new Stripe("sk_test_unit").webhooks.generateTestHeaderString({ payload, secret: "whsec_unit" });
  return { raw: Buffer.from(payload), headers: { "stripe-signature": header } };
};
const session = (over = {}) => ({ object: "checkout.session", id: "cs_test_abc", amount_total: 1500000, currency: "vnd", payment_status: "paid", status: "complete", ...over });

test("a paid checkout becomes payment.succeeded with the VND amount as is (zero-decimal)", () => {
  const { raw, headers } = signed({ id: "evt_1", type: "checkout.session.completed", data: { object: session() } });
  assert.deepEqual(verifyEvent(raw, headers), { eventId: "evt_1", reference: "cs_test_abc", type: "payment.succeeded", amount: "1500000", currency: "VND" });
});

test("an expired checkout becomes payment.failed; unrelated or unpaid events are acknowledged and ignored", () => {
  const expired = signed({ id: "evt_2", type: "checkout.session.expired", data: { object: session({ payment_status: "unpaid", status: "expired" }) } });
  assert.equal(verifyEvent(expired.raw, expired.headers)?.type, "payment.failed");
  const unpaid = signed({ id: "evt_3", type: "checkout.session.completed", data: { object: session({ payment_status: "unpaid" }) } });
  assert.equal(verifyEvent(unpaid.raw, unpaid.headers), null);
  const other = signed({ id: "evt_4", type: "customer.created", data: { object: {} } });
  assert.equal(verifyEvent(other.raw, other.headers), null);
});

test("a body that does not match its signature is refused before parsing", () => {
  const { headers } = signed({ id: "evt_5", type: "checkout.session.completed", data: { object: session() } });
  const tampered = Buffer.from(JSON.stringify({ id: "evt_5", type: "checkout.session.completed", data: { object: session({ amount_total: 1 }) } }));
  assert.throws(() => verifyEvent(tampered, headers), (e: { code?: string }) => e.code === "INVALID_SIGNATURE");
});
