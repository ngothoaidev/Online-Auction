import { z } from 'zod';
import { urlSchema, phoneSchema } from './common.schemas';

// Payment submission schema
export const paymentFormSchema = z.object({
  paymentProofUrl: z.string()
    .min(1, 'Payment proof is required')
    .url('Invalid payment proof URL'),
  shippingAddress: z.string()
    .min(20, 'Shipping address must be at least 20 characters')
    .max(500, 'Shipping address must not exceed 500 characters'),
  buyerPhone: phoneSchema,
  notes: z.string()
    .max(1000, 'Notes must not exceed 1000 characters')
    .optional(),
});

// Confirm payment schema (seller)
export const confirmPaymentSchema = z.object({
  shippingProofUrl: z.string()
    .min(1, 'Shipping invoice is required')
    .url('Invalid shipping invoice URL'),
  trackingNumber: z.string()
    .min(5, 'Tracking number must be at least 5 characters')
    .max(50, 'Tracking number must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9-]+$/, 'Tracking number can only contain letters, numbers, and hyphens'),
  shippingNotes: z.string()
    .max(1000, 'Shipping notes must not exceed 1000 characters')
    .optional(),
});

// Review submission schema
export const reviewFormSchema = z.object({
  rating: z.enum([1, -1], {
    errorMap: () => ({ message: 'Please select a rating' }),
  }),
  comment: z.string()
    .max(1000, 'Comment must not exceed 1000 characters')
    .optional(),
});

// Cancel order schema
export const cancelOrderSchema = z.object({
  reason: z.string()
    .min(10, 'Cancellation reason must be at least 10 characters')
    .max(500, 'Cancellation reason must not exceed 500 characters'),
});

// Chat message schema
export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must not exceed 1000 characters')
    .transform((val) => val.trim()),
});
