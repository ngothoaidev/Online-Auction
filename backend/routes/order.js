import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import orderController from "../controllers/order.js";
import multer from "multer";
import { validate, idParam } from "../validation/index.js";
import { actionLimiter } from "../middleware/rateLimit.js";
import orderService from "../services/order.js";
import { AppError } from "../utils/errors.js";
import { MAX_BYTES, PURPOSES } from "../services/media.js";

// In-memory, hard-limited multipart parsing: one file, size capped before anything is written anywhere.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5, parts: 6 } });
const parseUpload = (req, res, next) => upload.single('file')(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'FILE_TOO_LARGE', 'File is too large'));
  return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid upload'));
});

// Authorise BEFORE a single byte of the body is read: participant, right role for the purpose, order in a state that accepts it.
async function proofGate(req, res, next) {
  try {
    const purpose = req.query.purpose;
    if (!PURPOSES.includes(purpose)) throw new AppError(400, 'VALIDATION_ERROR', 'purpose must be payment, shipping or message');
    const order = await orderService.getById(req.params.id);
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    const isBuyer = order.buyerId === req.user.id;
    const isSeller = order.sellerId === req.user.id;
    if (!isBuyer && !isSeller) throw new AppError(403, 'FORBIDDEN', 'Access denied');
    if (purpose === 'payment' && !(isBuyer && order.status === 'pending_payment')) throw new AppError(isBuyer ? 409 : 403, isBuyer ? 'INVALID_TRANSITION' : 'FORBIDDEN', 'A payment proof can only be uploaded by the buyer while payment is pending');
    if (purpose === 'shipping' && !(isSeller && ['pending_confirmation', 'pending_delivery'].includes(order.status))) throw new AppError(isSeller ? 409 : 403, isSeller ? 'INVALID_TRANSITION' : 'FORBIDDEN', 'A shipping proof can only be uploaded by the seller before shipping');
    req.order = order;
    next();
  } catch (error) {
    next(error);
  }
}

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

// POST: Submit shipping for an order whose payment is already recorded (seller)
route.post('/:id/shipping', orderController.submitShipping);

// POST: Confirm receipt (buyer - Step 3)
route.post('/:id/receipt', orderController.confirmReceipt);

// POST: Submit review (Step 4)
route.post('/:id/review', orderController.submitReview);

// POST: Cancel order (seller only)
route.post('/:id/cancel', orderController.cancelOrder);

// Proof / message-image upload (private storage) and protected read
route.post('/:id/proofs', validate({ params: idParam }), actionLimiter('upload'), proofGate, parseUpload, orderController.uploadProof);
route.get('/:id/proofs/:assetId', orderController.getProof);

// POST: mark the other party's messages as read (GETs never write)
route.post('/:id/messages/read', validate({ params: idParam }), orderController.markMessagesRead);

// GET: Get messages for order
route.get('/:id/messages', orderController.getMessages);

// POST: Send message
route.post('/:id/messages', orderController.sendMessage);

export default route;
