import userService from "../services/user.js";
import authService from "../services/auth.js";
import sellerRequestService from "../services/sellerRequest.js";
import { sendWelcomeEmail, sendPasswordResetOTP, sendChangePasswordOTP } from "../utils/email.js";
import accountSecurity from "../services/accountSecurity.js";
import passport from "passport";

const controller = {
    getUser: async function(req, res, next){
        try {
            const { identifier, password } = req.body ?? {};
            if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
                return res.status(400).json({ message: 'Identifier and password are required' });
            }
            // identifier can be username or email
            const found = (await userService.getByUsername(identifier)) || (await userService.getByEmail(identifier));
            // Same answer for unknown account and wrong password (no account enumeration).
            if (!found || !(await authService.validatePassword(password, found.encryptedPassword))) {
                return res.status(401).json({ message: 'Invalid username/email or password' });
            }
            if (found.status === 'banned') {
                return res.status(403).json({ code: 'ACCOUNT_BANNED', message: "Your account has been banned. Please contact support for assistance." });
            }

            // Check seller status - if seller role has expired, revert to buyer
            if (found.role === 'seller') {
                const statusCheck = await sellerRequestService.checkAndUpdateSellerStatus(found.id);
                if (statusCheck.status === 'expired' && statusCheck.reverted) found.role = 'buyer';
            }
            // Check buyer status - if seller role is approved
            if (found.role === 'buyer') {
                const activationResult = await sellerRequestService.checkAndUpdateSellerStatus(found.id);
                if (activationResult.status === 'active') {
                    await userService.update(found.id, { role: 'seller' });
                    found.role = 'seller';
                }
            }

            const token = await authService.generateUserToken(found);
            res.status(200).json({
                token,
                user: {
                    imgUrl: found.avatarUrl,
                    userId: found.id,
                    username: found.username,
                    email: found.email,
                    fullName: found.fullName,
                    role: found.role,
                    status: found.status,
                    isVerified: found.isVerified,
                }
            });
        } catch (error) {
            next(error);
        }
    },

    createUser: async function(req, res, next){
        try {
            const { username, email, password } = req.body ?? {};
            if (![username, email, password].every((v) => typeof v === 'string' && v)) {
                return res.status(400).json({ message: "Username, email, and password are required" });
            }
            if (password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters long" });
            }
            if (await userService.getByEmail(email)) {
                return res.status(409).json({ message: "Email already exists" });
            }
            if (await userService.getByUsername(username)) {
                return res.status(409).json({ message: "Username already exists" });
            }

            const result = await userService.create({
                username,
                email,
                encryptedPassword: await authService.hashPassword(password),
                createdAt: new Date(),
            });

            try {
                const code = await accountSecurity.issueVerificationCode(result.id);
                await sendWelcomeEmail(email, username, code);
            } catch (error) {
                console.error('Failed to send verification email:', error.message);
                // Don't fail the registration if email fails
            }

            res.status(201).json({
                userId: result.id,
                username: result.username,
                email: result.email,
                message: "Registration successful. Please check your email to verify your account."
            });
        } catch (error) {
            next(error);
        }
    },

    validateEmail: async function(req, res, next){
        try {
            const { email, code } = req.body ?? {};
            const found = typeof email === 'string' ? await userService.getByEmail(email) : null;
            if (!found || typeof code !== 'string') {
                return res.status(400).json({ message: "Invalid verification code" });
            }
            if (found.isVerified === true) {
                return res.status(400).json({ message: "Account is already verified" });
            }
            if (!(await accountSecurity.verifyEmail(found, code))) {
                return res.status(400).json({ message: "Invalid verification code" });
            }
            res.status(200).json({ message: "Email verified successfully. Your account is now active!" });
        } catch (error) {
            next(error);
        }
    },

    resendVerification: async function(req, res, next){
        try {
            const { email } = req.body ?? {};
            const found = typeof email === 'string' ? await userService.getByEmail(email) : null;
            // Always the same answer so the endpoint cannot be used to probe which emails are registered.
            if (found && found.isVerified !== true) {
                try {
                    await sendWelcomeEmail(email, found.username, await accountSecurity.issueVerificationCode(found.id));
                } catch (error) {
                    console.error('Failed to send verification email:', error.message);
                    return res.status(500).json({ message: "Failed to send verification email" });
                }
            }
            res.status(200).json({ message: "If the account exists and is not verified, a new code has been sent." });
        } catch (error) {
            next(error);
        }
    },

    verifyUser: async function(req, res){
        const user = req.user;
        res.status(200).json({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        });
    },

    // Forgot password - send OTP to email
    forgotPassword: async function(req, res, next) {
        try {
            const { email } = req.body ?? {};
            if (typeof email !== 'string' || !email) {
                return res.status(400).json({ message: "Email is required" });
            }
            const found = await userService.getByEmail(email);
            if (found) {
                try {
                    await sendPasswordResetOTP(email, found.username || 'User', await accountSecurity.issueResetOtp(found.id));
                } catch (emailError) {
                    console.error('Failed to send password reset email:', emailError.message);
                    return res.status(500).json({ message: "Failed to send verification email. Please try again." });
                }
            }
            // Same response whether or not the account exists.
            res.status(200).json({ message: "If an account exists for this email, an OTP has been sent" });
        } catch (error) {
            next(error);
        }
    },

    // Verify reset OTP -> returns a single-use reset grant
    verifyResetOtp: async function(req, res, next) {
        try {
            const { email, otp } = req.body ?? {};
            if (typeof email !== 'string' || typeof otp !== 'string' || !email || !otp) {
                return res.status(400).json({ message: "Email and OTP are required" });
            }
            const found = await userService.getByEmail(email);
            const resetToken = found ? await accountSecurity.exchangeResetOtp(found.id, otp) : null;
            if (!resetToken) {
                return res.status(400).json({ message: "Invalid or expired verification code" });
            }
            res.status(200).json({ message: "OTP verified successfully", resetToken });
        } catch (error) {
            next(error);
        }
    },

    // Reset password: requires the grant issued by verifyResetOtp
    resetPassword: async function(req, res, next) {
        try {
            const { email, newPassword, resetToken } = req.body ?? {};
            if (![email, newPassword, resetToken].every((v) => typeof v === 'string' && v)) {
                return res.status(400).json({ message: "Email, reset token and new password are required" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters long" });
            }
            const found = await userService.getByEmail(email);
            if (!found || !(await accountSecurity.resetPasswordWithGrant(found.id, resetToken, newPassword))) {
                return res.status(400).json({ message: "Invalid or expired reset token" });
            }
            res.status(200).json({ message: "Password reset successful!" });
        } catch (error) {
            next(error);
        }
    },

    authenticateGoogle: function(req, res, next){
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false // Disable session support
        })(req, res, next);
    },
    callbackGoogle: function(req, res, next){
        passport.authenticate('google', { session: false }, (err, user) => oauthFinish('google', res, err, user))(req, res, next);
    },
    authenticateFacebook: function(req, res, next){
        passport.authenticate('facebook', {
            scope: ['email'],
            session: false
        })(req, res, next);
    },
    callbackFacebook: function(req, res, next){
        passport.authenticate('facebook', { session: false }, (err, user) => oauthFinish('facebook', res, err, user))(req, res, next);
    },

    // Request OTP for password change
    requestChangePasswordOTP: async function(req, res, next){
        try {
            const user = req.user;
            try {
                await sendChangePasswordOTP(user.email, user.username, await accountSecurity.issueChangePasswordOtp(user.id));
            } catch (error) {
                console.error('Failed to send OTP email:', error.message);
                return res.status(500).json({ message: "Failed to send verification code" });
            }
            return res.status(200).json({ message: "Verification code sent to your email" });
        } catch (error) {
            next(error);
        }
    },

    // Verify OTP and change password; returns a fresh token (older tokens are revoked)
    verifyOTPAndChangePassword: async function(req, res, next){
        try {
            const { otp, newPassword } = req.body ?? {};
            if (typeof otp !== 'string' || typeof newPassword !== 'string' || !otp || !newPassword) {
                return res.status(400).json({ message: "OTP and new password are required" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters long" });
            }
            const authVersion = await accountSecurity.changePasswordWithOtp(req.user.id, otp, newPassword);
            if (authVersion === null) {
                return res.status(400).json({ message: "Invalid verification code" });
            }
            const token = await authService.generateUserToken({ ...req.user, authVersion });
            return res.status(200).json({ message: "Password changed successfully", token });
        } catch (error) {
            next(error);
        }
    }
}

// Shared tail of the Google/Facebook callbacks: ban/role guards, then hand the JWT to the frontend.
export async function oauthFinish(provider, res, err, user) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const fail = (code) => res.redirect(`${frontendUrl}/login?error=${code}`);
    if (err || !user) return fail(`${provider}_failed`);
    try {
        if (user.status === 'banned') return fail('account_banned');

        if (!user.role || user.role === 'unauthorized') {
            user.role = 'buyer';
            await userService.update(user.id, { role: 'buyer' });
        }
        if (user.role === 'seller') {
            // Check and activate seller status if effective date has passed
            const activationResult = await sellerRequestService.checkAndUpdateSellerStatus(user.id);
            if (!activationResult.activated) user.role = 'buyer';
        }
        const token = await authService.generateUserToken(user);
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
        console.error(`${provider} callback error:`, error.message);
        fail('auth_failed');
    }
}

export default controller;
