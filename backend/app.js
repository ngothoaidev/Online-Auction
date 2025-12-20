import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors";
import auctionRoute from "./routes/auction.js";
import not_found from "./middleware/not_found.js";
import error_handler from "./middleware/error_handler.js";

const app = express();

// --- Dependencies ---
app.use(cors());

app.use(morgan('dev'));

app.use(bodyParser.json());

// --- Routes ---
app.use('/auctions', auctionRoute);

// --- Middleware ---
app.use(not_found);
app.use(error_handler);

export default app;