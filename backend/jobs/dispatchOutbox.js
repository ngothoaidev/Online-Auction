import { dispatch } from "../services/outbox.js";
import { consumer as notifications } from "../services/notifications.js";

// Internal consumers ({ name, handle(event) }). Each must dedupe by eventId (delivery is at least once).
// The public SSE stream reads committed outbox rows per auction itself; it is not a competing consumer here.
export const consumers = [notifications];

export const name = "outbox";
export async function run() {
  const r = await dispatch({ consumers });
  return { due: { settled: r.dispatched, failed: r.failed }, legacy: {} };
}
