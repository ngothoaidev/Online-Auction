import { enqueuePaymentReminders } from "../services/notifications.ts";

export const name = "payment-reminders";
export async function run() {
  const r = await enqueuePaymentReminders();
  return { due: { settled: r.queued, failed: [] }, legacy: {} };
}
