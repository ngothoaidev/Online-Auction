// Rebuilds bidder_maxima / bid sequences from legacy bids (pre-proxy-engine data).
// Only auctions whose history is unambiguous are converted; everything else is REPORTED and left untouched
// (an unconverted auction that already has bids refuses new bids: see LEGACY_UNVERIFIED in the bidding command).
// `sql` is a postgres-js client or transaction.
import type { Row, Sql } from "postgres";

export type BackfillItem = {
  auctionId: number; status: string; result: "skip" | "flagged" | "convertible"; reasons: string[];
  ranked?: { bidderId: number; max: string; prioritySequence: number }[]; bidIds?: number[]; applied?: boolean;
};
type Ceiling = { bidderId: number; max: bigint; reachedIndex: number; reachedAt: Date };

export async function planMaximaBackfill(sql: Sql): Promise<BackfillItem[]> {
  const auctions = await sql`SELECT auction_id AS id, status, winner_id, current_price, bid_count, command_sequence FROM auctions ORDER BY auction_id`;
  const bids = await sql`SELECT bid_id AS id, auction_id, bidder_id, amount, max_amount, bid_time FROM bids ORDER BY auction_id, bid_time, bid_id`;
  const byAuction = new Map<number, Row[]>();
  for (const b of bids) (byAuction.get(b.auction_id) ?? byAuction.set(b.auction_id, []).get(b.auction_id)!).push(b);

  const report: BackfillItem[] = [];
  for (const a of auctions) {
    const rows = byAuction.get(a.id) ?? [];
    if (rows.length === 0 || Number(a.command_sequence) > 0) { report.push({ auctionId: a.id, status: a.status, result: "skip", reasons: [] }); continue; }

    // per bidder: highest ceiling and the first bid (in time, id order) that reached it
    const perBidder = new Map<number, Ceiling>();
    rows.forEach((b, index) => {
      const ceiling = BigInt(String(b.max_amount ?? b.amount).split(".")[0]);
      const cur = perBidder.get(b.bidder_id);
      if (!cur || ceiling > cur.max) perBidder.set(b.bidder_id, { bidderId: b.bidder_id, max: ceiling, reachedIndex: index, reachedAt: b.bid_time });
    });
    const ranked = [...perBidder.values()].sort((x, y) => (x.max === y.max ? x.reachedIndex - y.reachedIndex : x.max > y.max ? -1 : 1));

    const reasons: string[] = [];
    const [top, second] = ranked;
    if (second && top.max === second.max && +new Date(top.reachedAt) === +new Date(second.reachedAt)) reasons.push("ambiguous_tie");
    if (a.winner_id !== null && a.winner_id !== top.bidderId) reasons.push("winner_mismatch");
    if (a.winner_id === null) reasons.push("winner_missing");
    if (BigInt(String(a.current_price).split(".")[0]) > top.max) reasons.push("price_exceeds_winner_max");
    if (a.bid_count !== rows.length) reasons.push("bid_count_mismatch"); // informational only, does not block

    const blocking = reasons.filter((r) => r !== "bid_count_mismatch");
    report.push({
      auctionId: a.id, status: a.status, result: blocking.length ? "flagged" : "convertible", reasons,
      // prioritySequence = chronological sequence of the bid that first reached that ceiling (lower wins equal ceilings)
      ranked: ranked.map((r) => ({ bidderId: r.bidderId, max: r.max.toString(), prioritySequence: r.reachedIndex + 1 })),
      bidIds: rows.map((b) => b.id),
    });
  }
  return report;
}

/** Applies every "convertible" auction in one transaction; returns the plan with applied flags. */
export async function applyMaximaBackfill(sql: Sql, plan: BackfillItem[]): Promise<BackfillItem[]> {
  await sql.begin(async (tx) => {
    for (const item of plan.filter((p) => p.result === "convertible")) {
      for (const r of item.ranked ?? []) {
        await tx`INSERT INTO bidder_maxima (auction_id, bidder_id, max_amount, priority_sequence) VALUES (${item.auctionId}, ${r.bidderId}, ${r.max}, ${r.prioritySequence}) ON CONFLICT DO NOTHING`;
      }
      const bidIds = item.bidIds ?? [];
      for (let i = 0; i < bidIds.length; i++) {
        await tx`UPDATE bids SET auction_sequence = ${i + 1} WHERE bid_id = ${bidIds[i]}`;
      }
      await tx`UPDATE auctions SET command_sequence = ${bidIds.length}, version = version + 1 WHERE auction_id = ${item.auctionId}`;
      item.applied = true;
    }
  });
  return plan;
}
