import orderService from "../services/order.js";
import userService from "../services/user.js";
import auctionService from "../services/auction.js";
import { sendEmail } from "../utils/email.js";
import { transitionOrder } from "../services/orderCommands.js";
import { submitReview } from "../services/reviewCommands.js";
import { keyFrom } from "../services/idempotency.js";
import { AppError } from "../utils/errors.js";
import { storeOrderUpload, readOrderAsset } from "../services/media.js";
import * as payments from "../services/payments.js";

/** Load the order and make sure the caller is its buyer or seller (404 unknown, 403 outsider). */
async function participantOrder(req) {
    const order = await orderService.getById(parseInt(req.params.id));
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');
    return order;
}

const asActor = (user) => ({ type: 'user', id: user.id, role: user.role });
const idempotencyKey = keyFrom;

const controller = {
    // Get order by auction ID (for product detail page)
    getOrderByAuction: async function(req, res) {
        try {
            const { auctionId } = req.params;
            
            const userData = { userId: req.user.id };

            // Get the auction details
            const auction = await auctionService.findById(parseInt(auctionId));
            if (!auction) {
                return res.status(404).json({ message: 'Auction not found' });
            }

            // Read-only: orders are created by settlement (worker / Buy Now), never by this GET.
            // Only the seller and the current/final winner may ask.
            const isParticipant = auction.sellerId === userData.userId || auction.winnerId === userData.userId;
            if (!isParticipant) {
                return res.status(403).json({ message: 'You are not a participant in this auction' });
            }

            const order = await orderService.getByAuctionId(parseInt(auctionId));
            if (!order) {
                if (auction.status === 'active') {
                    const due = new Date(auction.endTime) <= new Date();
                    if (!due) return res.status(400).json({ message: 'Auction has not ended yet' });
                    return res.status(202).json({ status: 'settlement_pending', retryAfter: 5 });
                }
                if (auction.status === 'ended' && !auction.settledAt && auction.winnerId) {
                    return res.status(202).json({ status: 'settlement_pending', retryAfter: 5 }); // legacy lot awaiting reconciliation
                }
                return res.status(404).json({ message: 'No order found - auction ended without a valid winner' });
            }

            // Get full order details
            const orderDetails = await orderService.getOrderWithDetails(order.id);
            
            // Get reviews
            const reviews = await orderService.getOrderReviews(parseInt(auctionId));
            
            // Check if buyer/seller have reviewed
            const buyerReviewSubmitted = await orderService.hasUserReviewed(parseInt(auctionId), order.buyerId);
            const sellerReviewSubmitted = await orderService.hasUserReviewed(parseInt(auctionId), order.sellerId);

            res.status(200).json({
                order: {
                    ...orderDetails,
                    buyerReviewSubmitted,
                    sellerReviewSubmitted,
                },
                payment: await payments.summary(order),
                reviews: reviews.map(r => ({
                    ...r.review,
                    reviewer: r.reviewer
                })),
                currentUserId: userData.userId,
                isBuyer: order.buyerId === userData.userId,
                isSeller: order.sellerId === userData.userId,
            });
        } catch (error) {
            console.error('Get order by auction error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Get order details (with auth check)
    getOrderDetails: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const order = await orderService.getById(parseInt(id));

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Check if user is buyer or seller
            if (order.buyerId !== userData.userId && order.sellerId !== userData.userId) {
                return res.status(403).json({ message: 'Access denied' });
            }

            const orderDetails = await orderService.getOrderWithDetails(order.id);
            const reviews = await orderService.getOrderReviews(order.auctionId);
            const messages = await orderService.getMessages(order.id);

            res.status(200).json({
                order: orderDetails,
                payment: await payments.summary(order),
                reviews: reviews.map(r => ({
                    ...r.review,
                    reviewer: r.reviewer
                })),
                messages: messages.map(m => ({
                    ...m.message,
                    sender: m.sender
                })),
                currentUserId: userData.userId,
                isBuyer: order.buyerId === userData.userId,
                isSeller: order.sellerId === userData.userId,
            });
        } catch (error) {
            console.error('Get order details error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Get user's orders
    getMyOrders: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const orders = await orderService.getByUserId(userData.userId);

            res.status(200).json({ orders });
        } catch (error) {
            console.error('Get my orders error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Step 1: buyer submits payment proof (manual mode)
    submitPayment: async function(req, res, next) {
        try {
            const result = await transitionOrder({
                orderId: parseInt(req.params.id), command: 'submit_payment', actor: asActor(req.user),
                payload: req.body ?? {}, expectedVersion: req.body?.expectedVersion, key: idempotencyKey(req),
            });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(200).json({ message: 'Payment submitted successfully', order: result.body.order });
        } catch (error) {
            next(error);
        }
    },

    // Step 1 (online): buyer opens a payment attempt with the configured adapter (mock: no real money)
    createPaymentAttempt: async function(req, res, next) {
        try {
            const result = await payments.createAttempt({ orderId: parseInt(req.params.id), actor: asActor(req.user), payload: req.body ?? {}, key: idempotencyKey(req) });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(result.status).json(result.body);
        } catch (error) {
            next(error);
        }
    },

    // Step 2: seller confirms payment and ships
    confirmPayment: async function(req, res, next) {
        try {
            const result = await transitionOrder({
                orderId: parseInt(req.params.id), command: 'confirm_with_shipping', actor: asActor(req.user),
                payload: req.body ?? {}, expectedVersion: req.body?.expectedVersion, key: idempotencyKey(req),
            });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(200).json({ message: 'Payment confirmed and shipping info submitted', order: result.body.order });
        } catch (error) {
            next(error);
        }
    },

    // Seller ships an order whose payment is already recorded
    submitShipping: async function(req, res, next) {
        try {
            const result = await transitionOrder({
                orderId: parseInt(req.params.id), command: 'submit_shipping', actor: asActor(req.user),
                payload: req.body ?? {}, expectedVersion: req.body?.expectedVersion, key: idempotencyKey(req),
            });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(200).json({ message: 'Shipping info submitted', order: result.body.order });
        } catch (error) {
            next(error);
        }
    },

    // Step 3: buyer confirms receipt
    confirmReceipt: async function(req, res, next) {
        try {
            const result = await transitionOrder({
                orderId: parseInt(req.params.id), command: 'confirm_receipt', actor: asActor(req.user),
                payload: {}, expectedVersion: req.body?.expectedVersion, key: idempotencyKey(req),
            });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(200).json({ message: 'Receipt confirmed', order: result.body.order });
        } catch (error) {
            next(error);
        }
    },

    // Cancel order: seller while unpaid, admin until shipping; a reason is mandatory and no review is created (B09)
    cancelOrder: async function(req, res, next) {
        try {
            const result = await transitionOrder({
                orderId: parseInt(req.params.id), command: 'cancel', actor: asActor(req.user),
                payload: { reason: req.body?.reason }, expectedVersion: req.body?.expectedVersion, key: idempotencyKey(req),
            });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(200).json({ message: 'Order cancelled', order: result.body.order });
        } catch (error) {
            next(error);
        }
    },

    // Submit or edit my review of the counterpart (B10)
    submitReview: async function(req, res, next) {
        try {
            const result = await submitReview({ orderId: parseInt(req.params.id), actor: req.user, isGoodRating: req.body?.isGoodRating, comment: req.body?.comment, key: idempotencyKey(req) });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(200).json({ message: result.body.message, review: result.body.review, orderCompleted: result.body.orderCompleted });
        } catch (error) {
            next(error);
        }
    },

    // Send chat message
    sendMessage: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const { message, imageAssetId } = req.body;

            if (!message || message.trim() === '') {
                return res.status(400).json({ message: 'Message is required' });
            }

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Check if user is participant
            if (order.buyerId !== userData.userId && order.sellerId !== userData.userId) {
                return res.status(403).json({ message: 'Access denied' });
            }

            const newMessage = await orderService.sendMessage(
                parseInt(id),
                userData.userId,
                message.trim(),
                imageAssetId
            );

            // Get sender info
            const sender = await userService.getById(userData.userId);

            res.status(201).json({
                message: 'Message sent',
                data: {
                    ...newMessage,
                    sender: {
                        id: sender.id,
                        username: sender.username,
                        avatarUrl: sender.avatarUrl,
                    }
                }
            });
        } catch (error) {
            console.error('Send message error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Get messages
    getMessages: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Check if user is participant
            if (order.buyerId !== userData.userId && order.sellerId !== userData.userId) {
                return res.status(403).json({ message: 'Access denied' });
            }

            const messages = await orderService.getMessages(parseInt(id));

            // Mark as read

            res.status(200).json({
                messages: messages.map(m => ({
                    ...m.message,
                    sender: m.sender
                }))
            });
        } catch (error) {
            console.error('Get messages error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // POST /order/:id/proofs?purpose=payment|shipping|message  (multipart field "file"; gate + multer run in the router)
    uploadProof: async function(req, res, next) {
        try {
            if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'A file is required (multipart field "file")');
            const result = await storeOrderUpload({ orderId: req.order.id, ownerId: req.user.id, purpose: req.query.purpose, buffer: req.file.buffer });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    // GET /order/:id/proofs/:assetId  - participants only, never cached, never sniffed
    getProof: async function(req, res, next) {
        try {
            await participantOrder(req);
            const { asset, data } = await readOrderAsset(parseInt(req.params.id), req.params.assetId);
            res.set({ 'Content-Type': asset.mime, 'Content-Length': String(data.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' });
            res.send(data);
        } catch (error) {
            next(error);
        }
    },

    // POST /order/:id/messages/read - the explicit write that GET used to do implicitly
    markMessagesRead: async function(req, res, next) {
        try {
            const order = await participantOrder(req);
            await orderService.markMessagesAsRead(order.id, req.user.id);
            res.status(200).json({ message: 'Messages marked as read' });
        } catch (error) {
            next(error);
        }
    },

};

export default controller;
