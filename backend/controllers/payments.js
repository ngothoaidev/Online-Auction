import * as payments from "../services/payments.js";

export default {
    // Provider webhook: raw body (signature first), no auth; duplicates are acknowledged with 200.
    webhook: async function(req, res, next) {
        try {
            const result = await payments.handleWebhook(req.params.provider, Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0), req.headers);
            res.status(200).json({ received: true, ...result });
        } catch (error) {
            next(error);
        }
    },

    // Mock-only demo control (buyer of the attempt): the "provider" reports success/failure, optionally losing the webhook.
    simulate: async function(req, res, next) {
        try {
            const result = await payments.simulate({ reference: req.params.reference, actor: req.user, outcome: req.body?.outcome, deliver: req.body?.deliver !== false });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },
};
