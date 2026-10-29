import { cleanupPending } from "../services/media.ts";

export const name = "media-cleanup";
export async function run() {
  const r = await cleanupPending();
  return { due: { settled: 0, failed: [] }, legacy: {}, removed: r.removed };
}
