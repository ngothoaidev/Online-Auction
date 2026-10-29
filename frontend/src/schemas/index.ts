/**
 * Central export file for all Zod validation schemas
 * Import schemas from this file throughout the application
 */

// Authentication schemas
export {
  registerSchema,
  loginSchema,
  forgotPasswordEmailSchema,
  forgotPasswordOtpSchema,
  resetPasswordSchema,
  verificationCodeSchema,
} from './auth.schemas';

// Auction schemas
export {
  commentSchema,
} from './auction.schemas';

// Order schemas
export {
  paymentFormSchema,
  confirmPaymentSchema,
  reviewFormSchema,
  cancelOrderSchema,
  chatMessageSchema,
} from './order.schemas';

// User schemas
export {
  becomeSellerSchema,
} from './user.schemas';

// Admin schemas
export {
  categorySchema,
} from './admin.schemas';

// Common schemas
export {
  phoneSchema,
} from './common.schemas';
