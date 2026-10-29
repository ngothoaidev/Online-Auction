import * as moderation from "../services/moderation.js";
import { keyFrom } from "../services/idempotency.js";
import sellerRequestService from "../services/sellerRequest.js";
import userService from "../services/user.js";
import authService from "../services/auth.js";

import { sendSellerRequestRejected, sendSellerRequestAccepted } from "../utils/email.ts";

const controller = {
    // Submit a seller upgrade request (for buyers)
    submitRequest: async function(req, res) {
        try {
            // Check if user is a buyer
            const user = req.user;

            if (user.isVerified === false) {
                return res.status(400).json({ message: 'Please verify your email first' });
            }

            // Check for existing pending request
            const hasPending = await sellerRequestService.hasPendingRequest(user.id);
            if (hasPending) {
                return res.status(400).json({ message: 'You already have a pending request' });
            }

            // Check if user has an active seller status (not expired yet)
            const sellerStatus = await sellerRequestService.getActiveSellerStatus(user.id);
            if (sellerStatus && sellerStatus.isActive) {
                return res.status(400).json({ 
                    message: `You are currently a seller. Your seller status expires on ${sellerStatus.expiryDate.toLocaleDateString()}`,
                    expiryDate: sellerStatus.expiryDate,
                    daysRemaining: sellerStatus.daysRemaining
                });
            }

            // Check if user can reapply after rejection (7 days cooldown)
            const reapplyStatus = await sellerRequestService.canReapplyAfterRejection(user.id);
            if (!reapplyStatus.canReapply) {
                return res.status(400).json({ 
                    message: `You can reapply after ${reapplyStatus.canReapplyDate.toLocaleDateString()} (${reapplyStatus.daysRemaining} days remaining)`,
                    canReapplyDate: reapplyStatus.canReapplyDate,
                    daysRemaining: reapplyStatus.daysRemaining
                });
            }

            const { reason } = req.body;

            // Create the request
            const request = await sellerRequestService.create(user.id, reason || '');

            res.status(201).json({
                message: 'Seller upgrade request submitted successfully',
                request: {
                    id: request.id,
                    status: request.status,
                    createdAt: request.createdAt,
                }
            });
        } catch (error) {
            console.error('Submit seller request error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Get current user's request status
    getMyRequest: async function(req, res) {
        try {
            const user = req.user;
            
            // Check and update seller status (revert to buyer if expired)
            const sellerStatusCheck = await sellerRequestService.checkAndUpdateSellerStatus(user.id);
            
            const request = await sellerRequestService.getByUserId(user.id);

            // Add additional status info
            let statusInfo = null;
            if (request) {
                if (request.status === 'approved' && request.sellerExpiryDate) {
                    const expiryDate = new Date(request.sellerExpiryDate);
                    const now = new Date();
                    if (now < expiryDate) {
                        // Active seller
                        statusInfo = {
                            isActive: true,
                            expiryDate: expiryDate,
                            daysRemaining: Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000))
                        };
                    } else {
                        // Expired - can reapply
                        statusInfo = { 
                            isActive: false, 
                            expired: true,
                            canReapply: true 
                        };
                    }
                } else if (request.status === 'rejected') {
                    const reapplyStatus = await sellerRequestService.canReapplyAfterRejection(user.id);
                    statusInfo = reapplyStatus;
                }
            }

            res.status(200).json({ 
                request,
                statusInfo,
                sellerStatusCheck
            });
        } catch (error) {
            console.error('Get my request error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Get all requests (admin only)
    getAllRequests: async function(req, res) {
        try {
            const { status } = req.query;
            const requests = await sellerRequestService.findAll(status || null);

            res.status(200).json({ requests });
        } catch (error) {
            console.error('Get all requests error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Approve a request (admin only)
    approveRequest: async function(req, res, next) {
        try {
            const result = await moderation.approveSellerRequest({ actor: req.user, key: keyFrom(req), requestId: Number(req.params.id), note: req.body?.note });
            res.status(200).json(result);
            if (!result.replayed) {
                const user = await userService.getById(result.request.userId);
                if (user?.email) sendSellerRequestAccepted({ email: user.email, username: user.username }).catch((e) => console.error('seller approval email failed:', e.message));
            }
        } catch (error) {
            next(error);
        }
    },

    // Reject a request (admin only)
    rejectRequest: async function(req, res, next) {
        try {
            const result = await moderation.rejectSellerRequest({ actor: req.user, key: keyFrom(req), requestId: Number(req.params.id), reason: req.body?.reason });
            res.status(200).json(result);
            if (!result.replayed) {
                const user = await userService.getById(result.request.userId);
                if (user?.email) sendSellerRequestRejected({ email: user.email, username: user.username }).catch((e) => console.error('seller rejection email failed:', e.message));
            }
        } catch (error) {
            next(error);
        }
    },
};

export default controller;
