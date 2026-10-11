import { Router } from "express";
import { requireAuth, requireAdmin, requireBuyer } from "../middleware/auth.js";
import sellerRequestController from "../controllers/sellerRequest.js";

const route = new Router();

route.use(requireAuth);

// POST: submit a seller upgrade request (buyers)
route.post('/request', requireBuyer, sellerRequestController.submitRequest);

// GET: get current user's request status
route.get('/my-request', sellerRequestController.getMyRequest);

route.use(requireAdmin);

// GET: get all requests (admin)
route.get('/requests', sellerRequestController.getAllRequests);

// POST: approve a request (admin)
route.post('/requests/:id/approve', sellerRequestController.approveRequest);

// POST: reject a request (admin)
route.post('/requests/:id/reject', sellerRequestController.rejectRequest);

export default route;
