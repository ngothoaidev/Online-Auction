import { z } from "zod";

const num = z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.number().min(0).max(999999999999999).optional());

export const searchQuery = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  minPrice: num,
  maxPrice: num,
  sortBy: z.enum(["relevance", "popularity", "price-asc", "price-desc", "ending-soon", "newest", "aToZ", "zToA"]).optional(),
  status: z.enum(["all", "active", "sold", "ended", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).passthrough();

export const topQuery = z.object({
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(["active", "sold", "ended", "cancelled"]).default("active"),
  sortBy: z.enum(["newest", "endingSoon", "mostBids", "highestPrice"]).default("newest"),
}).passthrough();

export const profileQuery = z.object({
  username: z.string().trim().min(1).max(50),
  status: z.enum(["my-listings", "sold-items", "won-auctions", "favorites", "active-bids"]),
  category: z.string().trim().max(100).optional(),
}).passthrough();

export const rejectQuery = z.object({
  auctionId: z.coerce.number().int().positive(),
  bidId: z.coerce.number().int().positive(),
}).passthrough();
