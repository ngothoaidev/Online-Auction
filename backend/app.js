import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors";
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
import systemRoute from "./routes/system.js";

// import productRoute from "./routes/product.routes.js";

function requireEnv(name) {
    if (!process.env[name]) throw new Error(`Missing required environment variable ${name}`);
    return process.env[name];
}

const app = express();

// --- Dependencies ---
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(morgan('dev'));

app.use(bodyParser.json());

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
app.use('/system', systemRoute);
app.use('/auction', auctionRoute);
app.use('/auth', authRoute);
app.use('/categories', categoryRoute);
app.use('/search', searchRoute);
app.use('/seller', sellerRequestRoute);
app.use('/users', userRoute);
app.use('/reviews', reviewRoute);
app.use('/order', orderService);

// --- Middleware ---
app.use(error_handler);
app.use(not_found);


export default app;