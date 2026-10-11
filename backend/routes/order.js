import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import orderController from "../controllers/order.js";

const route = new Router();

route.use(requireAuth);

// GET: Get user's orders
route.get('/my', orderController.getMyOrders);

// GET: Get order by auction ID (public - for product detail)
route.get('/auction/:auctionId', orderController.getOrderByAuction);

// GET: Get order details (authenticated)
route.get('/:id', orderController.getOrderDetails);

// POST: Submit payment (buyer - Step 1)
route.post('/:id/payment', orderController.submitPayment);

// POST: Confirm payment and submit shipping (seller - Step 2)
route.post('/:id/confirm', orderController.confirmPayment);

// POST: Confirm receipt (buyer - Step 3)
route.post('/:id/receipt', orderController.confirmReceipt);

// POST: Submit review (Step 4)
route.post('/:id/review', orderController.submitReview);

// POST: Cancel order (seller only)
route.post('/:id/cancel', orderController.cancelOrder);

// GET: Get messages for order
route.get('/:id/messages', orderController.getMessages);

// POST: Send message
route.post('/:id/messages', orderController.sendMessage);

export default route;
