# PostgreSQL Backend Implementation

This document explains the PostgreSQL integration for the Online Auction backend.

## Architecture

The implementation follows a 3-tier architecture:

```
Routes → Controllers → Services → Database
```

### Components

1. **Schema** (`src/models/schema.js`)
   - Defines database table structures using Drizzle ORM

2. **Service** (`src/services/product.service.js`)
   - Contains all database operations (CRUD)
   - Handles data validation and error handling

3. **Controller** (`src/controllers/product.controller.js`)
   - Handles HTTP requests and responses
   - Calls services for database operations
   - Formats response JSON

4. **Routes** (`src/routes/product.route.js`)
   - Maps HTTP endpoints to controller methods
   - Defines request/response structure

## Database Schema

### Products Table

```sql
products (
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

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the backend directory:

```
DATABASE_URL=postgresql://username:password@localhost:5432/online_auction
NODE_ENV=development
```

### 2. Initialize Database

Run the initialization script to create tables:

```javascript
import initializeDatabase from './src/utils/initDatabase.js';

await initializeDatabase();
```

Or call it in your server startup (`src/server.js`):

```javascript
import initializeDatabase from './src/utils/initDatabase.js';

// Initialize database on startup
try {
  await initializeDatabase();
} catch (error) {
  console.error('Database initialization failed');
  process.exit(1);
}
```

### 3. Install Dependencies

All required dependencies are already in `package.json`:
- `postgres` - PostgreSQL client
- `drizzle-orm` - ORM for type-safe queries
- `dotenv` - Environment variables

## API Endpoints

### Get All Products
```
GET /products
```

**Query Parameters:**
- `status` - Filter by status (active, sold, unsold)
- `category` - Filter by category
- `sellerId` - Filter by seller ID

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [...],
  "count": 10
}
```

### Get Active Products
```
GET /products/active/list
```

### Get Product by ID
```
GET /products/:id
```

### Get Products by Seller
```
GET /products/seller/:sellerId
```

### Create Product
```
POST /products
```

**Request Body:**
```json
{
  "name": "Vintage Watch",
  "description": "Beautiful vintage watch in great condition",
  "price": 150.00,
  "startingBid": 100.00,
  "currentBid": 120.00,
  "category": "Antiques",
  "imageUrl": "https://example.com/watch.jpg",
  "status": "active",
  "sellerId": 1,
  "auctionEndTime": "2025-12-31T23:59:59Z"
}
```

### Update Product
```
PUT /products/:id
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "currentBid": 150.00,
  "status": "sold"
}
```

### Delete Product
```
DELETE /products/:id
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

## Service Methods

The `productService` provides these methods:

```javascript
// Get all products with optional filters
await productService.findAll(filters);

// Get product by ID
await productService.findById(id);

// Create product
await productService.create(productData);

// Update product
await productService.update(id, productData);

// Delete product
await productService.delete(id);

// Get products by seller
await productService.findBySellerId(sellerId);

// Get active products
await productService.findActive();
```

## Example Usage

### Creating a Product

```javascript
const newProduct = await productService.create({
  name: "Vintage Camera",
  description: "Retro 35mm camera",
  price: 250.00,
  startingBid: 200.00,
  category: "Photography",
  sellerId: 5
});
```

### Fetching Products

```javascript
// All products
const products = await productService.findAll();

// Active products only
const active = await productService.findActive();

// By seller
const sellerProducts = await productService.findBySellerId(5);

// With filters
const filtered = await productService.findAll({
  status: 'active',
  category: 'Antiques'
});
```

### Updating a Product

```javascript
const updated = await productService.update(1, {
  currentBid: 300.00,
  status: 'sold'
});
```

## Database Connection Pool

The connection is configured in `src/config/db.js` using Drizzle ORM with postgres-js:

```javascript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);
```

The `prepare: false` option disables prepared statement prefetching as it's not supported for transaction pool mode.

## Indexes

The following indexes are created for performance:

- `idx_products_seller_id` - For filtering by seller
- `idx_products_status` - For filtering by status
- `idx_products_category` - For filtering by category

## Future Enhancements

1. Add more tables (users, bids, reviews)
2. Implement transaction support for complex operations
3. Add pagination to list endpoints
4. Add search functionality
5. Implement caching layer
6. Add data validation middleware
7. Add authentication/authorization checks
