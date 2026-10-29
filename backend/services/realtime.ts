// Public per-auction Server-Sent Events. Every connection reads the committed outbox of ONE auction by version,
// independently of the dispatcher and of other API instances, so each instance/subscriber sees every event.
// Only `public_payload` ever leaves this module. Ids are `auctionId:version`; a version gap is legal (some changes do
// not publish), clients simply refetch. Too far behind -> `reset`, the client refetches the snapshot.
import { sql } from "drizzle-orm";
import type { Request, Response } from "express";
import db from "../db/index.ts";
import { AppError } from "../utils/errors.ts";

const num = (name: string, fallback: number) => Number(process.env[name] || fallback);
const perIp = new Map<string, number>();
let total = 0;

export const connectionCount = () => total;

/** `Last-Event-ID: <auctionId>:<version>` (browser reconnect) wins over `?since=<version>` (first connect). */
function startCursor(req: Request, auctionId: number): number | null {
  const last = String(req.get("Last-Event-ID") ?? "").match(/^(\d+):(\d+)$/);
  if (last && Number(last[1]) === auctionId) return Number(last[2]);
  const since = Number(req.query.since);
  return Number.isSafeInteger(since) && since >= 0 ? since : null;
}

export async function streamAuction(req: Request, res: Response, auctionId: number) {
  const [auction] = await db.execute<{ version: number }>(sql`SELECT version FROM auctions WHERE auction_id = ${auctionId}`);
  if (!auction) throw new AppError(404, "NOT_FOUND", "Auction not found");

  const ip = req.ip ?? "";
  if (total >= num("SSE_MAX_CONNECTIONS", 1000) || (perIp.get(ip) ?? 0) >= num("SSE_MAX_PER_IP", 20)) {
    throw new AppError(429, "TOO_MANY_STREAMS", "Too many live connections; the page will fall back to polling");
  }
  total += 1;
  perIp.set(ip, (perIp.get(ip) ?? 0) + 1);

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");

  const replayLimit = num("SSE_REPLAY_LIMIT", 50);
  const reset = (version: number) => { cursor = version; res.write(`id: ${auctionId}:${version}\nevent: reset\ndata: ${JSON.stringify({ auctionId, version })}\n\n`); };

  let cursor = startCursor(req, auctionId) ?? auction.version;
  if (cursor > auction.version) reset(auction.version); // a cursor from the future (e.g. DB restored): resync

  let busy = false;
  const poll = async () => {
    if (busy) return;
    busy = true;
    try {
      const rows = await db.execute<{ aggregate_version: number; event_type: string; public_payload: Record<string, unknown> }>(sql`
        SELECT aggregate_version, event_type, public_payload FROM outbox_events
        WHERE aggregate_type = 'auction' AND aggregate_id = ${auctionId} AND aggregate_version > ${cursor}
        ORDER BY aggregate_version LIMIT ${replayLimit + 1}`);
      if (rows.length > replayLimit) {
        const [now] = await db.execute<{ version: number }>(sql`SELECT version FROM auctions WHERE auction_id = ${auctionId}`);
        reset(now.version);
      } else {
        for (const e of rows) {
          res.write(`id: ${auctionId}:${e.aggregate_version}\ndata: ${JSON.stringify({ type: e.event_type, ...e.public_payload })}\n\n`);
          cursor = e.aggregate_version;
        }
      }
    } catch (error) {
      console.error(JSON.stringify({ component: "sse", auctionId, msg: "poll failed", error: (error as Error).message }));
    } finally {
      busy = false;
    }
  };

  // Note: one indexed query per connection per poll; share one poller per auction if connections reach the thousands
  const pollTimer = setInterval(poll, num("SSE_POLL_MS", 1000));
  const beat = setInterval(() => res.write(": ping\n\n"), num("SSE_HEARTBEAT_MS", 15_000));
  poll();

  req.on("close", () => {
    clearInterval(pollTimer);
    clearInterval(beat);
    total -= 1;
    const left = (perIp.get(ip) ?? 1) - 1;
    if (left > 0) perIp.set(ip, left); else perIp.delete(ip);
  });
}
