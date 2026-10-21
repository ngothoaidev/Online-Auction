import { dispatch } from "../services/outbox.js";

// Internal consumers ({ name, handle(event) }), e.g. notifications (T21). Each must dedupe by eventId.
// The public SSE stream (T19) reads committed outbox rows per auction itself; it is not a competing consumer here.
export const consumers = [];

export const name = "outbox";
export async function run() {
  const r = await dispatch({ consumers });
  return { due: { settled: r.dispatched, failed: r.failed }, legacy: {} };
}
