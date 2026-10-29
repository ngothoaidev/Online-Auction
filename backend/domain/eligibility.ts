// Who may bid / Buy Now. Pure: pass the already-loaded user + auction rows.
export const RATING_THRESHOLD_PERCENT = 80;

export type Refusal = { status: number; code: string; message: string };
export type Bidder = {
  id: number; role: string | null; status: string | null; isVerified: boolean | null;
  ratingCount: number | null; positiveRatingCount: number | null;
};
type BuyNowLot = { status: string | null; buyNowPrice: string | null | undefined; endTime: Date | string; currentPrice: string };

/** Returns null when allowed, else { status, code, message }. */
export function checkBidderEligibility(
  user: Bidder | null | undefined,
  auction: { sellerId: number; allowNewbies: boolean | null },
  { disqualified = false } = {},
): Refusal | null {
  if (!user) return { status: 401, code: "AUTH_REQUIRED", message: "Please sign in" };
  if (user.status === "banned") return { status: 403, code: "ACCOUNT_BANNED", message: "Your account has been banned" };
  if (!user.isVerified) return { status: 403, code: "EMAIL_NOT_VERIFIED", message: "Please verify your email first" };
  if (user.role === "admin") return { status: 403, code: "ROLE_NOT_ALLOWED", message: "Administrators cannot participate in auctions" };
  if (user.role !== "buyer" && user.role !== "seller") return { status: 403, code: "ROLE_NOT_ALLOWED", message: "Your account cannot bid yet" };
  if (auction.sellerId === user.id) return { status: 400, code: "OWN_LISTING", message: "Seller cannot bid on their own product" };
  if (disqualified) return { status: 403, code: "BIDDER_DISQUALIFIED", message: "You have been removed from this auction by the seller" };

  const total = user.ratingCount || 0;
  if (total > 0) {
    const pct = ((user.positiveRatingCount || 0) / total) * 100;
    if (pct < RATING_THRESHOLD_PERCENT) {
      return { status: 403, code: "RATING_TOO_LOW", message: `Your rating score (${pct.toFixed(1)}%) is too low. Required: ${RATING_THRESHOLD_PERCENT}%` };
    }
  } else if (auction.allowNewbies === false) {
    return { status: 403, code: "NEWBIES_NOT_ALLOWED", message: "This seller does not accept bids from users with no rating history." };
  }
  return null;
}

/** Server-side Buy Now rule, independent of who is asking. */
export function buyNowAvailable(auction: BuyNowLot, now: Date | string): boolean {
  return auction.status === "active"
    && auction.buyNowPrice !== null && auction.buyNowPrice !== undefined
    && new Date(now) < new Date(auction.endTime)
    && BigInt(auction.currentPrice) < BigInt(auction.buyNowPrice);
}
