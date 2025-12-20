import auctionRoute from "./routes/auction.js";
import authRoute from "./routes/auth.js"
import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import not_found from "./middleware/not_found.js";
import error_handler from "./middleware/error_handler.js";



const app = express();

app.use(morgan('dev'));

app.use(bodyParser.json());

app.use('/auth', authRoute)

app.get('/', (req, res) => {
    res.json({
        message: 'Hello World',
    });
});

// Auction
app.use('/auctions', auctionRoute)
// app.use(not_found);
// app.use(error_handler);

export default app;