import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import productRouter from './routes/product.route.js';

const app = express();

// CORS, open for all domain
app.use(cors());

// Log
app.use(morgan('dev'));

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
// app.use(notFound);
// app.use(errorHandler);

export default app;