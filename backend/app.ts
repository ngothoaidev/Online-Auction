import express from "express";
import { STATUS_CODES } from "node:http";
import cors from "cors";
import helmet from "helmet";
import requestId from "./middleware/request_id.ts";
import observeRequests from "./middleware/observe.ts";
import healthRoute from "./routes/health.ts";
import session from "express-session";
import passport from "./config/passport.ts";
import auctionRoute from "./routes/auction.ts";
import authRoute from "./routes/auth.ts";
import categoryRoute from "./routes/category.ts";
import searchRoute from "./routes/search.ts";
import sellerRequestRoute from "./routes/sellerRequest.ts"
import userRoute from "./routes/user.ts"
import not_found from "./middleware/not_found.ts";
import error_handler from "./middleware/error_handler.ts";
import reviewRoute from "./routes/review.ts"
import orderService from "./routes/order.ts";
import authenticate from "./middleware/auth.ts";
import { servePublicMedia } from "./middleware/localUpload.ts";
import systemRoute from "./routes/system.ts";
import paymentRoute from "./routes/payments.ts";
import notificationRoute from "./routes/notifications.ts";
import moderationRoute from "./routes/moderation.ts";
import paymentsController from "./controllers/payments.ts";


function requireEnv(name: string) {
    if (!process.env[name]) throw new Error(`Missing required environment variable ${name}`);
    return process.env[name];
}

const app = express();
// Behind a TLS proxy (Render, nginx): number of proxy hops to trust, so secure session cookies and per-IP limits work.
if (Number(process.env.TRUST_PROXY_HOPS)) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));

// --- Dependencies ---
app.use(requestId);
// Older handlers answer errors with a bare { message } / { error }: give every 4xx/5xx JSON object the documented
// envelope { code, message, requestId } so clients and agents can branch on `code`. Bodies that already have a code pass through.
app.use((req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => json(res.statusCode >= 400 && body?.constructor === Object && !body.code ? {
        code: (STATUS_CODES[res.statusCode] ?? 'Error').toUpperCase().replace(/[^A-Z]+/g, '_'),
        message: body.message ?? body.error ?? STATUS_CODES[res.statusCode],
        requestId: req.id,
        ...body,
    } : body);
    next();
});
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // API is consumed cross-origin by the SPA
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// JSON access log + HTTP metrics; liveness/readiness/metrics before sessions/auth (cheap, no cookies)
app.use(observeRequests);
app.use(healthRoute);

// Payment webhooks need the exact raw bytes for signature verification, so they are mounted before the JSON parser.
app.post('/payments/webhook/:provider', express.raw({ type: '*/*', limit: '64kb' }), paymentsController.webhook);

app.use(express.json({ limit: '100kb' }));

// Session for Passport
app.use(session({
    secret: requireEnv('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());

app.use(authenticate);

// --- Routes ---   
app.use('/media/public', servePublicMedia());
app.use('/system', systemRoute);
app.use('/auction', auctionRoute);
app.use('/auth', authRoute);
app.use('/categories', categoryRoute);
app.use('/search', searchRoute);
app.use('/seller', sellerRequestRoute);
app.use('/users', userRoute);
app.use('/reviews', reviewRoute);
app.use('/order', orderService);
app.use('/payments', paymentRoute);
app.use('/notifications', notificationRoute);
app.use('/admin', moderationRoute);

// --- Middleware ---
app.use(not_found);
app.use(error_handler);


export default app;