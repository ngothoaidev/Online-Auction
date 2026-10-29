import * as moderation from "../services/moderation.js";
import { keyFrom } from "../services/idempotency.js";
import { AppError } from "../utils/errors.ts";

const handler = (fn, status = 200) => async (req, res, next) => {
    try {
        res.status(status).json(await fn(req));
    } catch (error) {
        next(error);
    }
};
const positiveId = (value) => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid id');
    return id;
};

export default {
    // POST /auction/:id/reports (signed-in, verified)
    createReport: handler((req) => moderation.createReport({ auctionId: positiveId(req.params.id), reporter: req.user, reason: req.body?.reason, details: req.body?.details }), 201),

    // admin
    listReports: handler((req) => {
        const status = req.query.status ?? 'open';
        if (!['open', 'actioned', 'dismissed', 'all'].includes(status)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid status');
        return moderation.listReports({ status, limit: req.query.limit });
    }),
    resolveReport: handler((req) => moderation.resolveReport({ actor: req.user, key: keyFrom(req), reportId: positiveId(req.params.id), action: req.body?.action, note: req.body?.note })),
    listAudit: handler((req) => moderation.listAudit({ targetType: req.query.targetType, targetId: req.query.targetId ? positiveId(req.query.targetId) : undefined, limit: req.query.limit })),
};
