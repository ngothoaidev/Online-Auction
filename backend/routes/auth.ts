import { Router } from "express";
import { requireAuth } from "../middleware/auth.ts";
import { authLimiter } from "../middleware/rateLimit.ts";
import authController from "../controllers/auth.ts"

const route = Router();

// Brute-force / abuse protection on every credential or code endpoint (OAuth redirects excluded).
const limit = authLimiter();
for (const path of ['/login', '/register', '/validate', '/resend-verification', '/forgot-password', '/verify-reset-otp', '/reset-password', '/change-password/request-otp', '/change-password/verify']) {
    route.use(path, limit);
}

// GET: get current user
route.get('/me', requireAuth, authController.verifyUser);

// POST: register
route.post('/register', authController.createUser);

// POST: login
route.post('/login', authController.getUser);

// POST: validate email
route.post('/validate', authController.validateEmail);

// POST: resend verification code
route.post('/resend-verification', authController.resendVerification);

// POST: forgot password (send OTP)
route.post('/forgot-password', authController.forgotPassword);

// POST: verify reset OTP
route.post('/verify-reset-otp', authController.verifyResetOtp);

// POST: reset password
route.post('/reset-password', authController.resetPassword);

// POST: request change password OTP (protected)
route.post('/change-password/request-otp', requireAuth, authController.requestChangePasswordOTP);

// POST: verify OTP and change password (protected)
route.post('/change-password/verify', requireAuth, authController.verifyOTPAndChangePassword);

// ==================== Google OAuth ====================
route.get('/google', authController.authenticateGoogle);

route.get('/google/callback', authController.callbackGoogle);

// ==================== Facebook OAuth ====================
route.get('/facebook', authController.authenticateFacebook);

route.get('/facebook/callback', authController.callbackFacebook);

export default route;