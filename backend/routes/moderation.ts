import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.ts";
import moderationController from "../controllers/moderation.ts";

// Admin moderation: listing reports and the append-only admin audit trail.
const route = Router();

route.use(requireAuth, requireAdmin);

route.get('/reports', moderationController.listReports);
route.post('/reports/:id/resolve', moderationController.resolveReport);
route.get('/audit', moderationController.listAudit);

export default route;
