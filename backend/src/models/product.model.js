import { pgTable, serial, integer, varchar, text, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  startingBid: decimal('starting_bid', { precision: 10, scale: 2 }),
  currentBid: decimal('current_bid', { precision: 10, scale: 2 }),
  category: varchar('category', { length: 128 }),
  imageUrl: varchar('image_url', { length: 512 }),
  status: varchar('status', { length: 50 }).default('active'), // active, sold, unsold
  sellerId: integer('seller_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  auctionEndTime: timestamp('auction_end_time'),
});