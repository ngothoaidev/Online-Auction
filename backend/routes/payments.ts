import { Router } from "express";
import { requireAuth } from "../middleware/auth.ts";
import paymentsController from "../controllers/payments.ts";

const route = Router();

route.use(requireAuth);

// POST: mock provider outcome for one of your attempts (demo/local only; 404 when the mock adapter is not active)
route.post('/mock/:reference/simulate', paymentsController.simulate);

export default route;
