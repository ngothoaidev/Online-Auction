import { z } from 'zod';

// Category create/update schema
export const categorySchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name must not exceed 50 characters'),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
});
