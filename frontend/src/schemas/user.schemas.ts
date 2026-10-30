import { z } from 'zod';

// Become seller request schema
export const becomeSellerSchema = z.object({
  reason: z.string()
    .min(50, 'Reason must be at least 50 characters')
    .max(2000, 'Reason must not exceed 2000 characters'),
});
