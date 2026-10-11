// Pure proxy-bidding engine (B02-B04, design D4.1). No I/O, no clock, no DB: money is BigInt, order is explicit.
import { max as maxBig, min as minBig } from "./money.js";

export class BidRejection extends Error {
  constructor(code, message, minimum) {
    super(message);
    this.code = code;
    if (minimum !== undefined) this.minimum = minimum;
  }
}

/** Highest ceiling first; equal ceilings go to whoever reached it first (lower prioritySequence). */
export const rank = (maxima) => [...maxima].sort((a, b) => (a.max === b.max ? a.priority - b.priority : a.max > b.max ? -1 : 1));

/** Price the leader pays: one step over the runner-up, capped by the leader's own ceiling, never below the starting price. */
export function competitivePrice(startingPrice, step, ranked) {
  if (ranked.length === 0) return null;
  if (ranked.length === 1) return startingPrice;
  return maxBig(startingPrice, minBig(ranked[0].max, ranked[1].max + step));
}

/** Smallest acceptable new ceiling from a non-leader (first bid: the starting price). */
export const minimumNextBid = ({ startingPrice, currentPrice, step }, hasLeader) => (hasLeader ? currentPrice + step : startingPrice);

/**
 * state: { startingPrice, step, currentPrice, maxima: [{ bidderId, max, priority }] }  (eligible maxima only)
 * cmd:   { bidderId, amount (BigInt), sequence }
 * Returns { outcome: 'success'|'updated'|'outbid', maxima, leaderId, currentPrice, events: [{ bidderId, amount, type }], ownMax }
 * or throws BidRejection. `events` are the PUBLIC price/leader changes; a leader raising their own ceiling emits none.
 */
export function decideBid(state, cmd) {
  const { startingPrice: S, step: I, currentPrice: P } = state;
  const { bidderId, amount: M, sequence } = cmd;
  const ranked = rank(state.maxima);
  const leader = ranked[0];

  if (leader && P > leader.max) {
    throw new BidRejection("INVARIANT_VIOLATION", "Auction state is inconsistent (price above the leader's ceiling); it must be reconciled before further bids");
  }

  const upsert = (priority) => [...state.maxima.filter((m) => m.bidderId !== bidderId), { bidderId, max: M, priority }];

  // 1. first bid
  if (!leader) {
    if (M < S) throw new BidRejection("BID_TOO_LOW", "Bid must be at least the starting price", S);
    return { outcome: "success", maxima: upsert(sequence), leaderId: bidderId, currentPrice: S, ownMax: M, events: [{ bidderId, amount: S, type: "bid" }] };
  }

  const own = state.maxima.find((m) => m.bidderId === bidderId);

  // 2. the leader raises their own ceiling: price, count and deadline do not move
  if (leader.bidderId === bidderId) {
    if (M <= own.max) throw new BidRejection("BID_NOT_HIGHER", "A new maximum must be higher than your current maximum", own.max + 1n);
    return { outcome: "updated", maxima: upsert(sequence), leaderId: bidderId, currentPrice: P, ownMax: M, events: [] };
  }

  // 3. a challenger
  const minimum = P + I;
  if (M < minimum) throw new BidRejection("BID_TOO_LOW", "Bid must be at least the current price plus one step", minimum);
  if (own && M <= own.max) throw new BidRejection("BID_NOT_HIGHER", "A new maximum must be higher than your current maximum", own.max + 1n);

  const maxima = upsert(sequence);
  const nextRanked = rank(maxima);
  const nextLeader = nextRanked[0];
  const price = maxBig(P, competitivePrice(S, I, nextRanked)); // normal bidding never lowers the price
  const events = [];
  if (price !== P || nextLeader.bidderId !== leader.bidderId) {
    events.push({ bidderId: nextLeader.bidderId, amount: price, type: nextLeader.bidderId === bidderId ? "bid" : "auto" });
  }
  return { outcome: nextLeader.bidderId === bidderId ? "success" : "outbid", maxima, leaderId: nextLeader.bidderId, currentPrice: price, ownMax: M, events };
}

/**
 * Recompute leader/price from eligible maxima after a moderation action or settlement (no new bid).
 * May lower the price: it is an audited correction, not a bid. No eligible bidder -> leader null, price = starting price.
 */
export function recompute({ startingPrice: S, step: I, maxima }) {
  const ranked = rank(maxima);
  return ranked.length === 0
    ? { leaderId: null, currentPrice: S }
    : { leaderId: ranked[0].bidderId, currentPrice: competitivePrice(S, I, ranked) };
}

/** Anti-sniping (B04): a public bid inside the final 5 minutes extends the ORIGINAL deadline by 5 minutes. */
export const FIVE_MIN_MS = 5 * 60 * 1000;
export function extendedEndTime({ endTime, autoExtend, now, producedPublicEvent }) {
  const end = new Date(endTime);
  if (autoExtend && producedPublicEvent && end.getTime() - new Date(now).getTime() < FIVE_MIN_MS) return new Date(end.getTime() + FIVE_MIN_MS);
  return end;
}
