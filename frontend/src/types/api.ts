// Shapes of the API payloads the SPA reads. Money is a digit string (VND, never a float); dates are ISO strings.

export type Role = 'unauthorized' | 'buyer' | 'seller' | 'admin';

/**
 * The signed-in user. /auth/me answers { userId, username, email, role } while /auth/login returns a fuller user
 * with `id`, so both id fields exist; read the id with `sessionUserId()`.
 */
export type SessionUser = {
  userId?: number;
  id?: number;
  username: string;
  email: string;
  role: Role;
  fullName?: string | null;
  avatarUrl?: string | null;
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
