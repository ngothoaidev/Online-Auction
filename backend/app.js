import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import requestId from "./middleware/request_id.js";
import observeRequests from "./middleware/observe.js";
import healthRoute from "./routes/health.js";
import session from "express-session";
import passport from "./config/passport.js";
import auctionRoute from "./routes/auction.js";
import authRoute from "./routes/auth.js";
import categoryRoute from "./routes/category.js";
import searchRoute from "./routes/search.js";
import sellerRequestRoute from "./routes/sellerRequest.js"
import userRoute from "./routes/user.js"
import not_found from "./middleware/not_found.js";
import error_handler from "./middleware/error_handler.js";
import reviewRoute from "./routes/review.js"
import orderService from "./routes/order.js";
import authenticate from "./middleware/auth.js";
import { servePublicMedia } from "./middleware/localUpload.js";
import systemRoute from "./routes/system.js";
import paymentRoute from "./routes/payments.js";
import notificationRoute from "./routes/notifications.js";
import moderationRoute from "./routes/moderation.js";
import paymentsController from "./controllers/payments.js";


function requireEnv(name) {
    if (!process.env[name]) throw new Error(`Missing required environment variable ${name}`);
    return process.env[name];
}

const app = express();
// Behind a TLS proxy (Render, nginx): number of proxy hops to trust, so secure session cookies and per-IP limits work.
if (Number(process.env.TRUST_PROXY_HOPS)) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));

// --- Dependencies ---
app.use(requestId);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // API is consumed cross-origin by the SPA
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// JSON access log + HTTP metrics; liveness/readiness/metrics before sessions/auth (cheap, no cookies)
app.use(observeRequests);
app.use(healthRoute);

// Payment webhooks need the exact raw bytes for signature verification, so they are mounted before the JSON parser.
app.post('/payments/webhook/:provider', express.raw({ type: '*/*', limit: '64kb' }), paymentsController.webhook);

app.use(bodyParser.json({ limit: '100kb' }));

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