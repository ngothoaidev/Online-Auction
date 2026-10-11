import { Router } from "express";
import { uploadAvatar } from "../config/cloudinary.js";
import userController from "../controllers/user.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const route = new Router();

// GET: Get user profile by username
route.get('/profile', userController.getUserProfile);

// GET: get active tab content
// route.get('/tabs', userController.getTabContent);

route.use(requireAuth);

// POST: Toggle favorite auction
route.post('/favorites/:auctionId', userController.toggleFavorite);

// PUT: update current user information
route.put('/info', userController.updateUserInfo);

// PUT: update current user avatar
route.put('/avatar', uploadAvatar.single('avatar'), userController.updateUserAvatar);

route.use(requireAdmin);

// GET: Get all users with pagination (admin only)
route.get('/', userController.getAllUsers);

// GET: Get user statistics summary (admin only)
route.get('/stats', userController.getUserStatsSummary);

// GET: Get user by ID (admin only)
route.get('/:id', userController.getUserById);

// POST: Ban a user (admin only)
route.post('/:id/ban', userController.banUser);

// POST: Unban a user (admin only)
route.post('/:id/unban', userController.unbanUser);

// PUT: Update user role (admin only)
route.put('/:id/role', userController.updateUserRole);

export default route;
