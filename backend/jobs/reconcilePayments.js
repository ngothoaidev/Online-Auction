import { reconcile } from "../services/payments.js";

export const name = "payment-reconcile";
export async function run() {
  const r = await reconcile();
  return { due: { settled: r.applied, failed: r.failed }, legacy: { conflicts: r.exceptions } };
}
