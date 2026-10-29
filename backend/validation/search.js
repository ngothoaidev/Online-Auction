import { z } from "zod";

const SORT_ALIASES = { priceLowToHigh: "price-asc", priceHighToLow: "price-desc", timeEndingSoon: "ending-soon", timeNewlyListed: "newest" };

const num = z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.number().min(0).max(999999999999999).optional());

export const searchQuery = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  minPrice: num,
  maxPrice: num,
  // The SPA's sort menu uses the camelCase names on the right; both spellings are accepted and normalised.
  sortBy: z.enum(["relevance", "popularity", "price-asc", "price-desc", "ending-soon", "newest", "aToZ", "zToA", "priceLowToHigh", "priceHighToLow", "timeEndingSoon", "timeNewlyListed"])
    .transform((v) => SORT_ALIASES[v] ?? v).optional(),
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
  reason: z.string().trim().max(500).optional(),
}).passthrough();
