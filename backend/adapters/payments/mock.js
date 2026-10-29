// Mock payment provider. NO real money moves. It mimics a hosted-checkout provider: an attempt has a reference,
// the "provider" later reports success/failure through a signed webhook, and its own status can be polled.
// Its store is the `provider_status` column of payment_attempts, so a lost webhook is recoverable by reconciliation.
import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import db from "../../db/index.ts";
import { AppError } from "../../utils/errors.ts";

export const name = "mock";

const secret = () => {
  const s = process.env.MOCK_PAYMENT_SECRET || (process.env.NODE_ENV === "production" ? "" : "mock-payment-dev-secret");
  if (!s) throw new Error("MOCK_PAYMENT_SECRET is required");
  return s;
};
export const sign = (rawBody) => `sha256=${crypto.createHmac("sha256", secret()).update(rawBody).digest("hex")}`;

export function createAttempt() {
  return { reference: `mock_${crypto.randomUUID()}` };
}

/** Signature is checked on the raw bytes BEFORE parsing; returns the normalised event or throws 400. */
export function verifyEvent(rawBody, headers) {
  const given = Buffer.from(String(headers["x-mock-signature"] ?? ""));
  const expected = Buffer.from(sign(rawBody));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new AppError(400, "INVALID_SIGNATURE", "Webhook signature does not match");
  }
  let e;
  try { e = JSON.parse(rawBody.toString("utf8")); } catch { throw new AppError(400, "VALIDATION_ERROR", "Webhook body is not JSON"); }
  const ok = typeof e?.eventId === "string" && e.eventId.length <= 100 && typeof e.reference === "string" && e.reference.length <= 64
    && ["payment.succeeded", "payment.failed"].includes(e.type) && /^\d{1,15}$/.test(String(e.amount)) && typeof e.currency === "string" && e.currency.length === 3;
  if (!ok) throw new AppError(400, "VALIDATION_ERROR", "Webhook event is malformed");
  return { eventId: e.eventId, reference: e.reference, type: e.type, amount: String(e.amount), currency: e.currency };
}

/** What the provider says about an attempt: { status: 'pending'|'succeeded'|'failed', amount, currency } or null. */
export async function getAttemptStatus(reference) {
  const [row] = await db.execute(sql`SELECT provider_status, amount, currency FROM payment_attempts WHERE provider = 'mock' AND reference = ${reference}`);
  return row ? { status: row.provider_status, amount: String(row.amount), currency: row.currency } : null;
}

/** Demo control: the "provider" settles an attempt and builds the signed webhook it would send. */
export async function settle(reference, outcome) {
  const [row] = await db.execute(sql`
    UPDATE payment_attempts SET provider_status = ${outcome} WHERE provider = 'mock' AND reference = ${reference}
    RETURNING amount, currency`);
  if (!row) throw new AppError(404, "NOT_FOUND", "Payment attempt not found");
  const rawBody = Buffer.from(JSON.stringify({
    eventId: `evt_${crypto.randomUUID()}`, reference, type: `payment.${outcome}`, amount: String(row.amount), currency: row.currency,
  }));
  return { rawBody, headers: { "x-mock-signature": sign(rawBody) } };
}
