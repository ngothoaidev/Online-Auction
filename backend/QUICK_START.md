# Quick Start Guide - PostgreSQL Backend

## 5-Minute Setup

### 1. Install PostgreSQL
- Download from: https://www.postgresql.org/download/
- Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

### 2. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE online_auction;
```

### 3. Configure Environment
Copy `.env.example` to `.env` and update:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/online_auction
```

### 4. Run Server
```bash
npm start
```

The server will automatically create tables on startup.

### 5. Test the API

**Create a Product:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Item",
    "price": 100,
    "sellerId": 1
  }'
```

**Get All Products:**
```bash
curl http://localhost:3000/products
```

**Get Active Products:**
```bash
curl http://localhost:3000/products/active/list
```

## File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── product.route.js         ← API routes
│   ├── controllers/
│   │   └── product.controller.js    ← Request handlers
│   ├── services/
│   │   └── product.service.js       ← Database operations
│   ├── models/
│   │   └── schema.js                ← Table definitions
│   ├── utils/
│   │   ├── initDatabase.js          ← Initialize DB
│   │   └── testDatabase.js          ← Test CRUD
│   ├── config/
│   │   └── db.js                    ← DB connection
│   └── app.js                        ← Express app
├── .env                              ← Configuration
├── .env.example                      ← Config template
├── POSTGRES_SETUP.md                 ← Full documentation
└── IMPLEMENTATION_SUMMARY.md         ← What was built
```

## Database Schema

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(256) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  starting_bid DECIMAL(10, 2),
  current_bid DECIMAL(10, 2),
  category VARCHAR(128),
  image_url VARCHAR(512),
  status VARCHAR(50) DEFAULT 'active',
  seller_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  auction_end_time TIMESTAMP
);
```

## Common Tasks

### Add Product
```javascript
import productService from './src/services/product.service.js';

const product = await productService.create({
  name: 'Vintage Watch',
  price: 150,
  sellerId: 1
});
```

### Get Products
```javascript
// All products
const all = await productService.findAll();

// Active only
const active = await productService.findActive();

// By seller
const sellerProducts = await productService.findBySellerId(1);
```

### Update Product
```javascript
const updated = await productService.update(1, {
  currentBid: 200,
  status: 'sold'
});
```

### Delete Product
```javascript
await productService.delete(1);
```

## Troubleshooting

### Connection Error
- Check DATABASE_URL in .env
- Verify PostgreSQL is running
- Test: `psql -U postgres -d online_auction`

### Table Not Found
- Run server to auto-initialize: `npm start`
- Or manually run: `node src/utils/initDatabase.js`

### CORS Issues
- Already configured in `src/app.js`
- All domains allowed (edit for production)

## Next Features

Ready to add:
- User authentication
- Bidding system
- Product reviews
- Search functionality
- Pagination

See `POSTGRES_SETUP.md` for detailed documentation.
