import { settleDue, reconcileLegacyEnded } from "../services/settlement.ts";

export const name = "settlement";
export async function run() {
  const due = await settleDue({ limit: Number(process.env.SETTLEMENT_BATCH || 50) });
  const legacy = await reconcileLegacyEnded({ limit: 50 });
  return { due, legacy };
}
