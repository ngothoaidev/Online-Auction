import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import notificationsController from "../controllers/notifications.js";

const route = new Router();

route.use(requireAuth);

// GET: my in-app notifications (+ unread count)
route.get('/', notificationsController.list);
route.get('/unread-count', notificationsController.unreadCount);

// POST: mark one / all of MY notifications as read
route.post('/read-all', notificationsController.markAllRead);
route.post('/:id/read', notificationsController.markRead);

// GET: email delivery status (admin): pending / sent / failed / skipped, attempts and last error
route.get('/admin/deliveries', requireAdmin, notificationsController.deliveries);

export default route;
