import { z } from 'zod';

// Comment schema
export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment must not exceed 500 characters')
    .transform((val) => val.trim()),
});
