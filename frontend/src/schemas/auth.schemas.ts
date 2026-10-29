import { z } from 'zod';

// Register schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Login schema
export const loginSchema = z.object({
  identifier: z.string()
    .min(3, 'Username or email must be at least 3 characters')
    .max(100, 'Input is too long'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

// Forgot password - Email step
export const forgotPasswordEmailSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
});

// Forgot password - OTP verification
export const forgotPasswordOtpSchema = z.object({
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

// Forgot password - Reset password
export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Email verification code
export const verificationCodeSchema = z.object({
  code: z.string()
    .length(6, 'Verification code must be exactly 6 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Invalid verification code format'),
});
