import { z } from "zod";
import { formBoolean, moneyInput } from "./index.ts";
import { sanitizeRichText } from "../utils/sanitize.ts";

const richText = z.string().max(50000).transform(sanitizeRichText);

export const createAuctionBody = z.object({
  title: z.string().trim().min(1).max(255),
  description: richText.optional().default(""),
  categoryId: z.coerce.number().int().positive(),
  startingPrice: moneyInput,
  stepPrice: moneyInput,
  buyNowPrice: z.union([moneyInput, z.literal("").transform(() => null)]).optional().nullable().default(null),
  endTime: z.coerce.date().refine((d) => d.getTime() > Date.now(), "endTime must be in the future"),
  autoExtend: formBoolean.optional().default(false),
  allowNewbies: formBoolean.optional().default(true),
}).strip().superRefine((v, ctx) => {
  if (v.buyNowPrice && BigInt(v.buyNowPrice) <= BigInt(v.startingPrice)) {
    ctx.addIssue({ code: "custom", path: ["buyNowPrice"], message: "Buy Now price must be greater than Starting price" });
  }
});

// Seller-editable fields only. Anything else (winnerId, currentPrice, sellerId, status, bidCount, ...) is rejected, not ignored.
export const updateAuctionBody = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: richText.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const descriptionBody = z.object({ description: richText }).strip();

export const commentBody = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.coerce.number().int().positive().nullish(),
}).strip();

export const bidBody = z.object({ amount: moneyInput }).strip();

export const bidHistoryQuery = z.object({ f: z.enum(["all", "mine", "recent"]).default("all") }).passthrough();
