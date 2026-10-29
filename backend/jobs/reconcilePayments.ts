import { reconcile } from "../services/payments.ts";

export const name = "payment-reconcile";
export async function run() {
  const r = await reconcile();
  return { due: { settled: r.applied, failed: r.failed }, legacy: { conflicts: r.exceptions } };
}
