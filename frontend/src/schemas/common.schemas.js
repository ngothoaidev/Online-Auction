import { z } from 'zod';

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const errorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

// URL validation
export const urlSchema = z.string().url('Invalid URL format');

// Phone number validation (international format)
export const phoneSchema = z.string()
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number format');

// Price validation
export const priceSchema = z.number()
  .positive('Price must be positive')
  .finite('Price must be a valid number');

// Date validation (must be in the future)
export const futureDateSchema = z.string()
  .datetime()
  .refine(
    (date) => new Date(date) > new Date(),
    'Date must be in the future'
  );
