# PostgreSQL Backend - API Reference

## Base URL
```
http://localhost:3000/products
```

---

## Endpoints

### 1. GET All Products

**Endpoint:** `GET /products`

**Query Parameters:**
- `status` (optional) - Filter by status: `active`, `sold`, `unsold`
- `category` (optional) - Filter by category
- `sellerId` (optional) - Filter by seller ID

**Example:**
```bash
GET /products?status=active&category=Antiques
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Vintage Camera",
      "description": "Beautiful retro camera",
      "price": 250.00,
      "startingBid": 200.00,
      "currentBid": 225.00,
      "category": "Photography",
      "imageUrl": "https://example.com/camera.jpg",
      "status": "active",
      "sellerId": 1,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z",
      "auctionEndTime": "2025-02-15T23:59:59Z"
    }
  ],
  "count": 1
}
```

---

### 2. GET Active Products

**Endpoint:** `GET /products/active/list`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Active products retrieved successfully",
  "data": [...],
  "count": 5
}
```

---

### 3. GET Product by ID

**Endpoint:** `GET /products/:id`

**Parameters:**
- `id` (path) - Product ID

**Example:**
```bash
GET /products/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": 1,
    "name": "Vintage Camera",
    "description": "Beautiful retro camera",
    "price": 250.00,
    "startingBid": 200.00,
    "currentBid": 225.00,
    "category": "Photography",
    "imageUrl": "https://example.com/camera.jpg",
    "status": "active",
    "sellerId": 1,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "auctionEndTime": "2025-02-15T23:59:59Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

### 4. GET Products by Seller

**Endpoint:** `GET /products/seller/:sellerId`

**Parameters:**
- `sellerId` (path) - Seller ID

**Example:**
```bash
GET /products/seller/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Seller products retrieved successfully",
  "data": [...],
  "count": 3
}
```

---

### 5. POST Create Product

**Endpoint:** `POST /products`

**Request Body:**
```json
{
  "name": "Vintage Watch",
  "description": "Beautiful vintage watch from 1950s",
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

**Required Fields:**
- `name` - Product name (string)
- `price` - Current/final price (number)
- `sellerId` - Seller ID (integer)

**Optional Fields:**
- `description` - Product description (string)
- `startingBid` - Starting bid amount (number)
- `currentBid` - Current highest bid (number)
- `category` - Product category (string)
- `imageUrl` - Product image URL (string)
- `status` - Product status (string, default: "active")
- `auctionEndTime` - Auction end time (ISO 8601 string)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 5,
    "name": "Vintage Watch",
    "description": "Beautiful vintage watch from 1950s",
    "price": 150.00,
    "startingBid": 100.00,
    "currentBid": 120.00,
    "category": "Antiques",
    "imageUrl": "https://example.com/watch.jpg",
    "status": "active",
    "sellerId": 1,
    "createdAt": "2025-01-15T11:00:00Z",
    "updatedAt": "2025-01-15T11:00:00Z",
    "auctionEndTime": "2025-12-31T23:59:59Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Name, price, and sellerId are required"
}
```

---

### 6. PUT Update Product

**Endpoint:** `PUT /products/:id`

**Parameters:**
- `id` (path) - Product ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Product Name",
  "currentBid": 300.00,
  "status": "sold",
  "category": "Updated Category"
}
```

**Updatable Fields:**
- `name` - Product name
- `description` - Product description
- `price` - Current/final price
- `startingBid` - Starting bid
- `currentBid` - Current bid
- `category` - Product category
- `imageUrl` - Image URL
- `status` - Product status
- `auctionEndTime` - Auction end time

**Example:**
```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{"currentBid": 300.00, "status": "sold"}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 1,
    "name": "Vintage Camera",
    "description": "Beautiful retro camera",
    "price": 250.00,
    "startingBid": 200.00,
    "currentBid": 300.00,
    "category": "Photography",
    "imageUrl": "https://example.com/camera.jpg",
    "status": "sold",
    "sellerId": 1,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T12:00:00Z",
    "auctionEndTime": "2025-02-15T23:59:59Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

### 7. DELETE Product

**Endpoint:** `DELETE /products/:id`

**Parameters:**
- `id` (path) - Product ID

**Example:**
```bash
curl -X DELETE http://localhost:3000/products/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "id": 1,
    "name": "Vintage Camera",
    ...
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

## Error Responses

All endpoints return error responses in this format:

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Name, price, and sellerId are required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Product not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error message describing the issue"
}
```

---

## Status Values

Products can have the following status values:
- `active` - Auction is currently active
- `sold` - Product has been sold
- `unsold` - Auction ended without a sale

---

## Data Types

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Auto-generated, primary key |
| name | string | Max 256 characters |
| description | string | No limit |
| price | decimal | 10 digits, 2 decimal places |
| startingBid | decimal | 10 digits, 2 decimal places |
| currentBid | decimal | 10 digits, 2 decimal places |
| category | string | Max 128 characters |
| imageUrl | string | Max 512 characters |
| status | string | Max 50 characters |
| sellerId | integer | Foreign key reference |
| createdAt | timestamp | ISO 8601 format |
| updatedAt | timestamp | ISO 8601 format |
| auctionEndTime | timestamp | ISO 8601 format |

---

## Example cURL Commands

**Create:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Vintage Watch",
    "price":150,
    "sellerId":1
  }'
```

**Read All:**
```bash
curl http://localhost:3000/products
```

**Read One:**
```bash
curl http://localhost:3000/products/1
```

**Update:**
```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{"currentBid":200}'
```

**Delete:**
```bash
curl -X DELETE http://localhost:3000/products/1
```

---

## Rate Limits

No rate limits currently implemented. Add middleware as needed for production.

## Authentication

No authentication currently required. Add JWT middleware to `src/routes/product.route.js` for protected endpoints.
