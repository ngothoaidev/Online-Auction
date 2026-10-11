// Explicit allowlist DTOs. Never spread ORM rows/relations into a response: every field that leaves the API is named here.
import { sanitizeRichText } from "../utils/sanitize.js";

export const publicUser = (u) => (u ? { id: u.id, username: u.username, fullName: u.fullName ?? null, avatarUrl: u.avatarUrl ?? null } : null);

/** The signed-in user looking at their own account (no password hash, OTP, provider ids or authVersion). */
export const selfUser = (u) => (u ? {
  id: u.id, username: u.username, email: u.email, fullName: u.fullName ?? null, role: u.role, status: u.status,
  avatarUrl: u.avatarUrl ?? null, birthday: u.birthday ?? null, bio: u.bio ?? null, isVerified: u.isVerified,
} : null);

// maxAmount (the private proxy ceiling) is intentionally absent.
export const publicBid = (b) => (b ? {
  id: b.id, auctionId: b.auctionId, bidderId: b.bidderId, amount: b.amount, bidTime: b.bidTime, type: b.type, invalidated: Boolean(b.invalidatedAt), bidder: publicUser(b.bidder),
} : null);

export const publicImage = (i) => ({ id: i.id, auctionId: i.auctionId, imageUrl: i.imageUrl, isPrimary: i.isPrimary });

export const publicComment = (c) => ({
  commentId: c.commentId, auctionId: c.auctionId, userId: c.userId, parentId: c.parentId, content: c.content, createdAt: c.createdAt,
  user: c.user ? { ...publicUser(c.user), role: c.user.role } : null,
});

export const descriptionLog = (l) => ({ logId: l.logId, auctionId: l.auctionId, contentSnapshot: sanitizeRichText(l.contentSnapshot), editedAt: l.editedAt });

/** Card/list item shared by home, profile tabs and search. `auction` must be loaded with images/seller/category/bids[0].bidder. */
export function catalogAuction(auction, { isFavorited = false } = {}) {
  const s = auction.seller;
  // No reviews yet is NOT 100%: rating is null and the UI says so.
  const rating = s && s.ratingCount > 0 ? (s.positiveRatingCount / s.ratingCount) * 100 : null;
  return {
    id: auction.id, sellerId: auction.sellerId, categoryId: auction.categoryId, winnerId: auction.winnerId ?? null,
    title: auction.title,
    startingPrice: auction.startingPrice, currentPrice: auction.currentPrice, stepPrice: auction.stepPrice, buyNowPrice: auction.buyNowPrice ?? null,
    status: auction.status, endTime: auction.endTime, createdAt: auction.createdAt,
    allowNewbies: auction.allowNewbies, autoExtend: auction.autoExtend, bidCount: auction.bidCount,
    images: (auction.images ?? []).map(publicImage),
    image: auction.images?.find((i) => i.isPrimary)?.imageUrl || auction.images?.[0]?.imageUrl || null,
    seller: { username: s?.username, rating: rating === null ? null : parseFloat(rating.toFixed(1)), ratingCount: s?.ratingCount || 0 },
    category: auction.category?.name || "Uncategorized",
    bids: publicBid(auction.bids?.[0]) ?? undefined,
    isFavorited,
  };
}
