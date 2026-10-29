import type { Request, Response, NextFunction } from "express";
import * as notifications from "../services/notifications.ts";
import { AppError } from "../utils/errors.ts";

const handler = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(200).json(await fn(req));
    } catch (error) {
        next(error);
    }
};

export default {
    list: handler((req) => notifications.list(req.user!.id, { limit: req.query.limit as string | undefined })),
    unreadCount: handler(async (req) => ({ unread: await notifications.unreadCount(req.user!.id) })),
    markRead: handler((req) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid notification id');
        return notifications.markRead(req.user!.id, id);
    }),
    markAllRead: handler((req) => notifications.markAllRead(req.user!.id)),
    deliveries: handler((req) => {
        const status = req.query.status as string | undefined;
        if (status !== undefined && !['pending', 'sent', 'failed', 'skipped'].includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status');
        return notifications.deliveries({ status, limit: req.query.limit as string | undefined });
    }),
};
