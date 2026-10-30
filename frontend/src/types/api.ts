// Shapes of the API payloads the SPA reads. Money is a digit string (VND, never a float); dates are ISO strings.

export type Role = 'unauthorized' | 'buyer' | 'seller' | 'admin';

/**
 * The signed-in user. /auth/login returns { userId, username, email, fullName, role, status, isVerified, imgUrl };
 * /auth/me (used after a reload) only { userId, username, email, role }. `id` appears on users handed over by other
 * flows, so read the id with `sessionUserId()`.
 */
export type SessionUser = {
  userId?: number;
  id?: number;
  username: string;
  email: string;
  role: Role;
  fullName?: string | null;
  avatarUrl?: string | null;
  imgUrl?: string | null;
  isVerified?: boolean;
  status?: string;
};

export const sessionUserId = (user: SessionUser | null | undefined) => user?.id ?? user?.userId ?? null;

export type AuctionStatus = 'active' | 'sold' | 'ended' | 'cancelled';

export type Capabilities = {
  canBid: boolean;
  canBuyNow: boolean;
  reasons: { bid?: string; buyNow?: string };
};

/** The requester's own position on an open lot (null for guests, the seller and closed lots). */
export type ViewerState = {
  status: 'leading' | 'outbid' | 'none' | 'removed';
  yourMaximum: string | null;
  minimumBid: string | null;
};

export type PersonRef = { id?: number; username?: string; fullName?: string | null; avatarUrl?: string | null };

/** GET /auction/:id */
export type AuctionDetail = {
  id: number;
  title: string;
  description: string;
  startingPrice: string;
  currentPrice: string;
  stepPrice: string | null;
  biddingStep: string | null;
  buyNowPrice: string | null;
  status: AuctionStatus;
  endTime: string;
  createdAt: string | null;
  autoExtend: boolean | null;
  bidCount: number | null;
  settledAt: string | null;
  closeReason: string | null;
  version: number;
  serverTime: string;
  minimumNextBid: string;
  capabilities: Capabilities;
  viewer: ViewerState | null;
  sellerId: number;
  winnerId: number | null;
  categoryId: number;
  sellerName?: string;
  seller: PersonRef & { rating: number | null; ratingCount: number };
  winnerName: string | null;
  winner: PersonRef | null;
  category: { id: number; name: string } | null;
  categoryName: string;
  image: string | null;
  images: string[];
};

/** A live SSE event or a command result merged into the lot snapshot. */
export type AuctionPatch = Partial<AuctionDetail> & { auctionId?: number; type?: string };

/** A public bid row (the private maximum never leaves the server). */
export type PublicBid = {
  id: number;
  auctionId: number;
  bidderId: number;
  amount: string;
  bidTime: string;
  type: 'bid' | 'auto' | 'buy_now' | 'adjust' | string;
  invalidated: boolean;
  bidder: PersonRef | null;
};

/** A lot as listed on cards: home tabs, search, profile tabs. */
export type CatalogAuction = {
  id: number;
  sellerId: number;
  categoryId: number;
  winnerId: number | null;
  title: string;
  startingPrice: string;
  currentPrice: string;
  stepPrice: string | null;
  buyNowPrice: string | null;
  status: AuctionStatus;
  endTime: string;
  createdAt: string | null;
  allowNewbies: boolean | null;
  autoExtend: boolean | null;
  bidCount: number | null;
  images: { id: number; auctionId: number; imageUrl: string; isPrimary: boolean | null }[];
  image: string | null;
  seller: { username?: string; rating: number | null; ratingCount: number };
  category: string;
  bids?: PublicBid;
  isFavorited: boolean;
};

/** GET /categories: top-level categories with their children. */
export type CategoryNode = { id: number; name: string; subcategories: { id: number; name: string }[] };

/** GET /users/profile?username= */
export type UserProfile = {
  id: number;
  username: string;
  name: string | null;
  role: Role;
  avatar: string | null;
  bio: string | null;
  birthDate: string | null;
  createdAt: string | null;
  rating: { positive: number; negative: number; percentage: number | null };
  counts: ProfileCounts;
};

type ReviewTally = { total: number; positive: number; negative: number };
export type ProfileCounts = {
  totalBids: number; totalAuctions: number; totalActiveListings: number; totalSoldItems: number;
  totalWonAuctions: number; totalActiveBids: number; totalFavoriteProducts: number;
  reviewsReceived: ReviewTally & { positiveRate: number | null };
  reviewsGiven: ReviewTally;
};
export type CountKey = Exclude<keyof ProfileCounts, 'reviewsReceived' | 'reviewsGiven'>;

/** An in-app notification of the signed-in user. */
export type AppNotification = { id: number; kind: string; title: string; body: string; link: string | null; createdAt: string; read: boolean };

export type PartyRef = {
  id: number; username: string; email?: string; fullName: string | null; avatarUrl: string | null;
  ratingCount?: number | null; positiveRatingCount?: number | null;
};

/** The order page's view: the order row plus its lot, both parties and who has reviewed. */
export type OrderView = {
  id: number; auctionId: number; buyerId: number; sellerId: number; finalPrice: string; status: string; version?: number;
  paymentMode: string; paymentDueAt: string | null; paymentConfirmedAt: string | null;
  paymentProofUrl: string | null; shippingProofUrl: string | null; trackingNumber: string | null;
  shippingAddress: string | null; buyerPhone: string | null; buyerNotes?: string | null; shippingNotes?: string | null;
  cancelReason?: string | null;
  auction?: { id: number; title: string; currentPrice: string; image: string | null };
  buyer?: PartyRef; seller?: PartyRef;
  buyerReviewSubmitted?: boolean; sellerReviewSubmitted?: boolean;
};

export type PaymentAttempt = {
  id: string; provider: string; reference: string; amount: string; currency: string; status: string;
  exceptionReason: string | null; createdAt: string;
};
export type PaymentSummary = { mode: string; available: string[]; attempts: PaymentAttempt[] };

export type OrderMessage = {
  id: number; orderId: number; senderId: number; message: string; imageUrl: string | null; isRead: boolean | null;
  createdAt: string; sender?: { id: number; username: string; avatarUrl: string | null };
};

/** A row of the admin audit trail. */
export type AuditEntry = {
  id: number; action: string; targetType: string; targetId: number; reason: string | null;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null; createdAt: string; actorId: number; actor: string | null;
};

/** A review as GET /reviews lists it (reviewer, target and lot flattened in). */
export type ReviewRow = {
  id: number; reviewerId: number; targetId: number; auctionId: number; isGoodRating: boolean; comment: string | null; createdAt: string;
  reviewerUsername: string | null; reviewerFullName: string | null; reviewerAvatarUrl: string | null;
  targetUsername: string | null; targetFullName: string | null; targetAvatarUrl: string | null;
  auctionTitle: string | null; auctionStatus: string | null;
};

/** Admin: a listing report with its lot, reporter and seller. */
export type ReportRow = {
  id: number; auctionId: number; reason: string; details: string | null; status: 'open' | 'actioned' | 'dismissed';
  resolution: string | null; resolvedAt: string | null; createdAt: string;
  reporter: string; lotTitle: string; lotStatus: AuctionStatus | null; lotBidCount: number | null; seller: string;
};

/** Admin: a category with product counts and its subcategories. */
export type AdminCategory = {
  id: number; name: string; description: string | null; productCount: number;
  subcategories: { id: number; name: string; description: string | null; productCount: number }[];
};

/** Admin: a user row of GET /users. */
export type AdminUser = {
  id: number; username: string; email: string; fullName: string | null; role: Role; status: 'active' | 'banned';
  avatarUrl: string | null; bio?: string | null; createdAt: string | null; isVerified: boolean | null;
  ratingCount: number | null; positiveRatingCount: number | null;
};
export type AdminUserStats = { total: number; byRole: Record<string, number>; byStatus: Record<string, number> };

/** Admin: a seller request with its applicant. */
export type SellerRequestRow = {
  id: number; userId: number; reason: string; status: 'pending' | 'approved' | 'rejected'; adminNote: string | null;
  createdAt: string; updatedAt: string;
  user: { id: number; username: string; email: string; fullName: string | null; avatarUrl: string | null; createdAt: string | null; ratingCount: number | null; positiveRatingCount: number | null } | null;
};
