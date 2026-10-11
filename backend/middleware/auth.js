import authService from "../services/auth.js";
import userService from "../services/user.js";
import sellerRequestService from "../services/sellerRequest.js";

// Optional authentication: no Authorization header (or a literal "Bearer null/undefined" left by
// logged-out clients) means guest. Any real token that is invalid, expired, revoked or belongs to a
// banned/missing user is rejected here, before any controller side effect.
const GUEST_TOKENS = new Set(['', 'null', 'undefined']);

export const authenticate = async (req, res, next) => {
    const authorization = req.header('Authorization');
    const token = authorization?.replace(/^Bearer\s+/i, '').trim() ?? '';
    if (GUEST_TOKENS.has(token)) return next();

    let tokenData;
    try {
        tokenData = await authService.validateToken(token);
    } catch (error) {
        const expired = error?.name === 'TokenExpiredError';
        return res.status(401).json({ code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID', message: expired ? 'Token expired' : 'Invalid token' });
    }

    try {
        const user = await userService.getById(tokenData.userId);
        if (!user || (tokenData.av ?? -1) !== (user.authVersion ?? 0)) {
            return res.status(401).json({ code: 'TOKEN_REVOKED', message: 'Session is no longer valid' });
        }
        if (user.status === 'banned') {
            return res.status(403).json({ code: 'ACCOUNT_BANNED', message: 'Your account has been banned' });
        }

        // Check seller status - if seller role has expired, revert to buyer
        // ponytail: still a write on the auth path; move to a worker job with audit in T09/T10.
        if (user.role === 'seller') {
            const statusCheck = await sellerRequestService.checkAndUpdateSellerStatus(user.id);
            if (statusCheck.status === 'expired' && statusCheck.reverted) user.role = 'buyer';
        }
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

export const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'User not authenticated' });
    }
    next();
};

// Email-verified account (unverified accounts keep role "unauthorized" and cannot transact)
export const requireVerified = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'User not authenticated' });
    }
    if (!req.user.isVerified) {
        return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first' });
    }
    next();
};

// Check if user has required role(s)
// export const requireRole = (...allowedRoles) => {
//     return (req, res, next) => {
//         if (!req.user) {
//             return res.status(401).json({
//                 message: 'User not authenticated',
//             });
//         }

//         if (!allowedRoles.includes(req.user.role)) {
//             return res.status(403).json({
//                 message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', '),
//             });
//         }

//         next();
//     };
// };

// Middleware for seller-only routes
export const requireSeller = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'User not authenticated',
        });
    }

    if (req.user.role !== 'seller') {
        return res.status(403).json({
            message: 'Only sellers can access this resource',
        });
    }

    next();
};

// Middleware for buyer-only routes
export const requireBuyer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'User not authenticated',
        });
    }

    if (req.user.role !== 'buyer') {
        return res.status(403).json({
            message: 'Only buyers can access this resource',
        });
    }

    next();
};

// Middleware for admin-only routes
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'User not authenticated',
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Only admins can access this resource',
        });
    }

    next();
};

export default authenticate;
