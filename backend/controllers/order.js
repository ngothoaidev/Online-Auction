import orderService from "../services/order.js";
import userService from "../services/user.js";
import auctionService from "../services/auction.js";
import { sendEmail } from "../utils/email.js";

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

            // Mark messages as read
            await orderService.markMessagesAsRead(order.id, userData.userId);

            res.status(200).json({
                order: orderDetails,
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

    // Step 1: Buyer submits payment
    submitPayment: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const { paymentProofUrl, shippingAddress, buyerPhone } = req.body;

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Only buyer can submit payment
            if (order.buyerId !== userData.userId) {
                return res.status(403).json({ message: 'Only buyer can submit payment' });
            }

            if (order.status !== 'pending_payment') {
                return res.status(400).json({ message: 'Payment already submitted' });
            }

            const updatedOrder = await orderService.submitPayment(parseInt(id), {
                paymentProofUrl,
                shippingAddress,
                buyerPhone,
            });

            // TODO: Send email to seller

            res.status(200).json({
                message: 'Payment submitted successfully',
                order: updatedOrder
            });
        } catch (error) {
            console.error('Submit payment error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Step 2: Seller confirms payment and provides shipping
    confirmPayment: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const { shippingProofUrl, trackingNumber } = req.body;

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Only seller can confirm payment
            if (order.sellerId !== userData.userId) {
                return res.status(403).json({ message: 'Only seller can confirm payment' });
            }

            if (order.status !== 'pending_confirmation') {
                return res.status(400).json({ message: 'Cannot confirm payment at this stage' });
            }

            const updatedOrder = await orderService.confirmPayment(parseInt(id), {
                shippingProofUrl,
                trackingNumber,
            });

            // TODO: Send email to buyer

            res.status(200).json({
                message: 'Payment confirmed and shipping info submitted',
                order: updatedOrder
            });
        } catch (error) {
            console.error('Confirm payment error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Step 3: Buyer confirms receipt
    confirmReceipt: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Only buyer can confirm receipt
            if (order.buyerId !== userData.userId) {
                return res.status(403).json({ message: 'Only buyer can confirm receipt' });
            }

            if (order.status !== 'pending_receipt') {
                return res.status(400).json({ message: 'Cannot confirm receipt at this stage' });
            }

            const updatedOrder = await orderService.confirmReceipt(parseInt(id));

            res.status(200).json({
                message: 'Receipt confirmed',
                order: updatedOrder
            });
        } catch (error) {
            console.error('Confirm receipt error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Cancel order (seller only)
    cancelOrder: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const { reason } = req.body;

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Only seller can cancel
            if (order.sellerId !== userData.userId) {
                return res.status(403).json({ message: 'Only seller can cancel order' });
            }

            if (order.status === 'completed' || order.status === 'cancelled') {
                return res.status(400).json({ message: 'Cannot cancel this order' });
            }

            const updatedOrder = await orderService.cancelOrder(parseInt(id), userData.userId, reason);

            // Automatically give -1 rating to buyer
            await orderService.submitReview(
                userData.userId,
                order.buyerId,
                order.auctionId,
                false,
                reason || 'Order cancelled by seller'
            );

            res.status(200).json({
                message: 'Order cancelled',
                order: updatedOrder
            });
        } catch (error) {
            console.error('Cancel order error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Submit review
    submitReview: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const { isGoodRating, comment } = req.body;

            const order = await orderService.getById(parseInt(id));
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Check if user is participant
            const isBuyer = order.buyerId === userData.userId;
            const isSeller = order.sellerId === userData.userId;

            if (!isBuyer && !isSeller) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Determine target (buyer reviews seller, seller reviews buyer)
            const targetId = isBuyer ? order.sellerId : order.buyerId;

            const result = await orderService.submitReview(
                userData.userId,
                targetId,
                order.auctionId,
                isGoodRating,
                comment
            );

            // Check if both parties have reviewed
            const buyerReviewed = await orderService.hasUserReviewed(order.auctionId, order.buyerId);
            const sellerReviewed = await orderService.hasUserReviewed(order.auctionId, order.sellerId);

            if (buyerReviewed && sellerReviewed && order.status === 'pending_review') {
                await orderService.completeOrder(order.id);
            }

            res.status(200).json({
                message: result.isNew ? 'Review submitted' : 'Review updated',
                review: result.review
            });
        } catch (error) {
            console.error('Submit review error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Send chat message
    sendMessage: async function(req, res) {
        try {
            const userData = { userId: req.user.id };

            const { id } = req.params;
            const { message, imageUrl } = req.body;

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
                imageUrl
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
            await orderService.markMessagesAsRead(parseInt(id), userData.userId);

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
};

export default controller;
