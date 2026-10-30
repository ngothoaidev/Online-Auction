import type { Request, Response, NextFunction } from "express";
import * as moderation from "../services/moderation.ts";
import { keyFrom } from "../services/idempotency.ts";
import userService from "../services/user.ts";
import { selfUser } from "../serializers/index.ts";
import { AppError } from "../utils/errors.ts";

const controller = {
    // Get all users with pagination, filtering, and search (admin only)
    getAllUsers: async function(req: Request, res: Response) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                role = '', 
                status = '' 
            } = req.query;

            const result = await userService.findAllPaginated({
                page: parseInt(String(page)),
                limit: parseInt(String(limit)),
                search: String(search),
                role: String(role),
                status: String(status),
            });

            res.status(200).json(result);
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Get user by ID with stats (admin only)
    getUserById: async function(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await userService.getById(parseInt(id));

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get user stats
            const stats = await userService.getUserStats(parseInt(id));

            res.status(200).json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    status: user.status,
                    avatarUrl: user.avatarUrl,
                    bio: user.bio,
                    birthday: user.birthday,
                    createdAt: user.createdAt,
                    isVerified: user.isVerified,
                    ratingCount: user.ratingCount,
                    positiveRatingCount: user.positiveRatingCount,
                },
                stats
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    // Ban a user (admin only)
    banUser: async function(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await moderation.banUser({ actor: req.user, key: keyFrom(req), userId: Number(req.params.id), reason: req.body?.reason });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Unban a user (admin only)
    unbanUser: async function(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await moderation.unbanUser({ actor: req.user, key: keyFrom(req), userId: Number(req.params.id), reason: req.body?.reason });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Update user role (admin only)
    updateUserRole: async function(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await moderation.changeRole({ actor: req.user, key: keyFrom(req), userId: Number(req.params.id), role: req.body?.role, reason: req.body?.reason });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Get user statistics summary (admin only)
    getUserStatsSummary: async function(req: Request, res: Response) {
        try {
            const allUsers = await userService.findAll();

            const stats = {
                total: allUsers.length,
                byRole: {
                    unauthorized: allUsers.filter(u => u.role === 'unauthorized').length,
                    buyer: allUsers.filter(u => u.role === 'buyer').length,
                    seller: allUsers.filter(u => u.role === 'seller').length,
                    admin: allUsers.filter(u => u.role === 'admin').length,
                },
                byStatus: {
                    active: allUsers.filter(u => u.status === 'active' || !u.status).length,
                    banned: allUsers.filter(u => u.status === 'banned').length,
                }
            };

            res.status(200).json({ stats });
        } catch (error) {
            console.error('Get user stats summary error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    getUserProfile: async function (req: Request, res: Response) {
        try {
            const { username } = req.query;

            if (!username) {
                return res.status(400).json({ message: 'Username is required' });
            }

            const user = await userService.getByUsername(String(username));
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const auctions = await userService.getUserStats(user.id, user.role);

            // Public endpoint: email is only shown to the owner or an admin.
            const maySeeEmail = req.user && (req.user.id === user.id || req.user.role === 'admin');
            res.status(200).json({
                id: user.id,
                username: user.username,
                name: user.fullName,
                ...(maySeeEmail ? { email: user.email } : {}),
                role: user.role,
                avatar: user.avatarUrl,
                bio: user.bio,
                birthDate: user.birthday,
                createdAt: user.createdAt,
                rating: {
                    positive: user.positiveRatingCount || 0,
                    negative: (user.ratingCount || 0) - (user.positiveRatingCount || 0),
                    percentage: (user.ratingCount ?? 0) > 0
                        ? Math.round(((user.positiveRatingCount ?? 0) / user.ratingCount!) * 100)
                        : null, // no reviews is "no rating yet", never 100%
                },
                counts: auctions,
            });
        } catch (error) {
            console.error('Get user profile error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    toggleFavorite: async function(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const auctionId = parseInt(req.params.auctionId);

            const result = await userService.toggleFavorite(userId, auctionId);

            return res.status(200).json({
                message: 'Favorite status toggled successfully',
                favorites: result
            });
        } catch (error) {
            console.error("Toggle Favorite Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    // PUT /users/favorites/:auctionId  body {favorited:boolean}
    setFavorite: async function(req: Request, res: Response, next: NextFunction) {
        try {
            const favorited = await userService.setFavorite(req.user!.id, Number(req.params.auctionId), req.body.favorited);
            res.status(200).json({ auctionId: req.params.auctionId, favorited });
        } catch (error) {
            // FK violation = the lot does not exist
            const pgError = error as { code?: string; cause?: { code?: string } };
            if (pgError?.cause?.code === '23503' || pgError?.code === '23503') return next(new AppError(404, 'NOT_FOUND', 'Auction not found'));
            next(error);
        }
    },

    // GET /users/favorites  -> ids of the caller's saved lots (hydrates hearts everywhere)
    listFavoriteIds: async function(req: Request, res: Response, next: NextFunction) {
        try {
            res.status(200).json({ auctionIds: await userService.listFavoriteIds(req.user!.id) });
        } catch (error) {
            next(error);
        }
    },

    updateUserInfo: async function(req: Request, res: Response) {
        try {
            const user = req.user!;
            const { fullName, bio, birthday } = req.body;

            const updatedUser = await userService.update(user.id, {
                fullName,
                bio,
                birthday,
            });

            res.status(200).json({
                message: 'User updated successfully',
                user: selfUser(updatedUser[0])
            });
        } catch (error) {
            console.error('Update current user error:', error);
            res.status(500).json({ message: 'An error occurred. Please try again.' });
        }
    },

    updateUserAvatar: async function(req: Request, res: Response) {
        try {
            // 1. Validation
            const file = req.file ?? (req.files as Express.Multer.File[] | undefined)?.[0]; // Cloudinary -> req.file, local fallback -> req.files
            if (!file) {
                return res.status(400).json({ error: 'No image file provided.' });
            }

            const newAvatarUrl = file.path;

            const [updatedUser] = await userService.update(req.user!.id, {
                avatarUrl: newAvatarUrl
            });

            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found.' });
            }

            // 5. Success Response
            return res.status(200).json({
                message: 'Avatar updated successfully',
                user: selfUser(updatedUser),
                new_url: newAvatarUrl
            });

        } catch (error) {
            console.error('Update Avatar Error:', error);
            return res.status(500).json({ error: (error as AppError).message });
        }
    },
};

export default controller;
