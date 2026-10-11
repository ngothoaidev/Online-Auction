import sellerRequestService from "../services/sellerRequest.js";
import userService from "../services/user.js";
import authService from "../services/auth.js";

import { sendSellerRequestRejected, sendSellerRequestAccepted } from "../utils/email.js";

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
    approveRequest: async function(req, res) {
        try {
            const { id } = req.params;
            // const { adminNote } = req.body;

            const request = await sellerRequestService.getById(parseInt(id));
            
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }

            if (request.status !== 'pending') {
                return res.status(400).json({ message: 'This request has already been processed' });
            }

            // Send acceptance email
            const user = await userService.getById(request.userId);
            if (user && user.email) {
                await sendSellerRequestAccepted({ email: user.email, username: user.username });
            } else {
                console.warn('Could not send acceptance email - user or email not found:', { userId: request.userId, user });
            }

            // Update request status - this will set sellerExpiryDate to 7 days from now
            // and immediately change user role to seller
            const updatedRequest = await sellerRequestService.updateStatus(
                parseInt(id), 
                'approved', 
                null,  // adminNote
                request.userId  // Pass userId to update role immediately
            );

            res.status(200).json({ 
                message: 'Request approved successfully. User is now a seller for 7 days.',
                request: {
                    id: parseInt(id),
                    status: 'approved',
                    sellerExpiryDate: updatedRequest.sellerExpiryDate
                }
            });
        } catch (error) {
            console.error('Approve request error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Reject a request (admin only)
    rejectRequest: async function(req, res) {
        try {
            const { id } = req.params;

            const request = await sellerRequestService.getById(parseInt(id));
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }

            if (request.status !== 'pending') {
                return res.status(400).json({ message: 'This request has already been processed' });
            }
            // Send rejection email
            const user = await userService.getById(request.userId);
            if (user && user.email) {
                await sendSellerRequestRejected({ email: user.email, username: user.username });
            } else {
                console.warn('Could not send rejection email - user or email not found:', { userId: request.userId, user });
            }

            // Delete request
            await sellerRequestService.delete(parseInt(id));

            res.status(200).json({ 
                message: 'Request rejected.',
                request: {
                    id: parseInt(id),
                    status: 'rejected'
                }
            });
        } catch (error) {
            console.error('Reject request error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },
};

export default controller;
