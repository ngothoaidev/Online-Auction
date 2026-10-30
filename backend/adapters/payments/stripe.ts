// Stripe Checkout in TEST mode (sk_test_ keys): hosted card page, no real money. Same contract as the mock adapter:
// an attempt's reference is the Checkout Session id, webhooks are verified on the raw body, and the session can be
// polled so reconciliation recovers a lost webhook.
import Stripe from "stripe";
import { AppError } from "../../utils/errors.ts";
import type { PaymentEvent, ProviderStatus } from "./mock.ts";

export const name = "stripe";

let client: Stripe | null = null;
const stripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required when PAYMENT_ADAPTER=stripe");
  if (!key.startsWith("sk_test_")) throw new Error("This demo only runs Stripe in test mode (sk_test_ key)");
  return (client ??= new Stripe(key));
};

/** VND is a zero-decimal currency in Stripe, so the integer VND amount is sent as is. */
export async function createAttempt({ orderId, auctionId, amount, currency, title }: { orderId: number; auctionId: number; amount: string; currency: string; title: string }) {
  const back = `${process.env.FRONTEND_URL || "http://localhost:5173"}/order/${auctionId}`;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: currency.toLowerCase(), unit_amount: Number(amount), product_data: { name: title.slice(0, 250) } } }],
    client_reference_id: String(orderId),
    success_url: `${back}?checkout=done`,
    cancel_url: `${back}?checkout=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // an unused checkout closes after an hour; reconciliation then marks it failed
  });
  return { reference: session.id };
}

/** Where to send the buyer for an open attempt; null once the session can no longer be paid. */
export async function checkoutUrl(reference: string): Promise<string | null> {
  const s = await stripe().checkout.sessions.retrieve(reference);
  return s.status === "open" ? s.url : null;
}

const toEvent = (eventId: string, s: Stripe.Checkout.Session, type: PaymentEvent["type"]): PaymentEvent =>
  ({ eventId, reference: s.id, type, amount: String(s.amount_total ?? 0), currency: (s.currency ?? "").toUpperCase() });

/** Verified with STRIPE_WEBHOOK_SECRET on the raw bytes. Events this app does not act on return null (acknowledged). */
export function verifyEvent(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): PaymentEvent | null {
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, String(headers["stripe-signature"] ?? ""), process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    throw new AppError(400, "INVALID_SIGNATURE", "Webhook signature does not match");
  }
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return event.data.object.payment_status === "paid" ? toEvent(event.id, event.data.object, "payment.succeeded") : null;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return toEvent(event.id, event.data.object, "payment.failed");
    default:
      return null;
  }
}

export async function getAttemptStatus(reference: string): Promise<{ status: ProviderStatus; amount: string; currency: string } | null> {
  const s = await stripe().checkout.sessions.retrieve(reference);
  const status: ProviderStatus = s.payment_status === "paid" ? "succeeded" : s.status === "expired" ? "failed" : "pending";
  return { status, amount: String(s.amount_total ?? 0), currency: (s.currency ?? "").toUpperCase() };
}
