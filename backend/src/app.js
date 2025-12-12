import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import productRouter from './routes/product.route.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();

const cors = require('cors');


// CORS, open for all domain
app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173'
}))

// Log
app.use(morgan('dev'));
app.use(express.json());
// Parse JSON body
app.use(bodyParser.json());

// Hello world
app.get('/', (req, res) => {
  res.json({
    message: 'Hello world',
  });
});

// Route handlers
app.use('/products', productRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;