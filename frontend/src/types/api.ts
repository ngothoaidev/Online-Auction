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
