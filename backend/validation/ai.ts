import { z } from 'zod';

export const draftInput = z.object({ notes: z.string().trim().max(2000).default(''), locale: z.enum(['en', 'vi']).default('en') }).strict();
const line = z.string().trim().min(1).max(400);
export const draftOutput = z.object({
  draft: z.object({ title: z.string().trim().min(1).max(255), descriptionText: z.string().trim().min(1).max(3000), categoryId: z.number().int().positive().nullable() }).strict(),
  facts: z.array(z.object({ text: line, source: z.enum(['seller', 'image']), imageIndex: z.number().int().min(0).optional() }).strict()).max(10),
  questions: z.array(line).max(5), warnings: z.array(line).max(5),
}).strict();
export type DraftOutput = z.infer<typeof draftOutput>;
export type DraftInput = z.infer<typeof draftInput>;
export type ListingDraft = DraftOutput & { requestId: string; inputHash: string };
