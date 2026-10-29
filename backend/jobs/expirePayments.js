import { expireDuePayments } from "../services/orderCommands.js";

export const name = "payment-expiry";
export async function run() {
  const r = await expireDuePayments({ limit: 50 });
  return { due: { settled: r.expired, failed: r.failed }, legacy: {} };
}
