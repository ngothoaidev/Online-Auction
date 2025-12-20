import { pgTable, serial, varchar, text, decimal, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['buyer', 'seller', 'admin']);
export const auctionStatusEnum = pgEnum('auction_status', ['active', 'sold', 'ended', 'cancelled']);

// --- 1. USERS TABLE ---
export const users = pgTable('users', {
  id: serial('user_id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('encrypted_password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }),
  role: userRoleEnum('role').default('buyer'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  birthday: timestamp('birthday', { mode: 'string' }), // or date mode
  createdAt: timestamp('created_at').defaultNow(),
  ratingCount: integer('rating_count').default(0),
  positiveRatingCount: integer('positive_rating_count').default(0),
});

// --- 2. CATEGORIES TABLE ---
export const categories = pgTable('categories', {
  id: serial('category_id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: integer('parent_id'), // Self-referencing FK
  description: text('description'),
});

// --- 3. AUCTIONS TABLE ---
export const auctions = pgTable('auctions', {
  id: serial('auction_id').primaryKey(),
  sellerId: integer('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  winnerId: integer('winner_id').references(() => users.id), // Nullable until won

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  
  // Prices (Use decimal for money)
  startingPrice: decimal('starting_price', { precision: 10, scale: 2 }).notNull(),
  buyNowPrice: decimal('buy_now_price', { precision: 10, scale: 2 }),
  currentPrice: decimal('current_price', { precision: 10, scale: 2 }),
  stepPrice: decimal('step_price', { precision: 10, scale: 2 }).default('1.00'),
  
  // Timing
  createdAt: timestamp('created_at').defaultNow(),
  endTime: timestamp('end_time').notNull(),
  
  // Status
  status: auctionStatusEnum('status').default('active'),
  autoExtend: boolean('auto_extend').default(false),
  bidCount: integer('bid_count').default(0),
});

// --- 4. AUCTION IMAGES TABLE ---
export const auctionImages = pgTable('auction_images', {
  id: serial('image_id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').default(false),
});

// --- 5. BIDS TABLE ---
export const bids = pgTable('bids', {
  id: serial('bid_id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  bidderId: integer('bidder_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  bidTime: timestamp('bid_time').defaultNow(),
});

// --- 6. REVIEWS TABLE (Based on your dashboard requirements) ---
export const reviews = pgTable('reviews', {
  id: serial('review_id').primaryKey(),
  reviewerId: integer('reviewer_id').notNull().references(() => users.id), // Who wrote it
  targetId: integer('target_id').notNull().references(() => users.id),   // Who received it (Seller)
  auctionId: integer('auction_id').notNull().references(() => auctions.id), // Context
  isGoodRating: boolean('is_good_rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});


// --- ADVANCED: RELATIONS (For easier querying) ---

// export const usersRelations = relations(users, ({ many }) => ({
//   auctions: many(auctions, { relationName: 'sellerAuctions' }),
//   bids: many(bids),
//   reviewsWritten: many(reviews, { relationName: 'reviewsWritten' }),
//   reviewsReceived: many(reviews, { relationName: 'reviewsReceived' }),
// }));

// export const categoriesRelations = relations(categories, ({ one, many }) => ({
//   parent: one(categories, {
//     fields: [categories.parentId],
//     references: [categories.id],
//     relationName: 'subcategories',
//   }),
//   children: many(categories, { relationName: 'subcategories' }),
//   auctions: many(auctions),
// }));

// export const auctionsRelations = relations(auctions, ({ one, many }) => ({
//   seller: one(users, {
//     fields: [auctions.sellerId],
//     references: [users.id],
//     relationName: 'sellerAuctions',
//   }),
//   winner: one(users, {
//     fields: [auctions.winnerId],
//     references: [users.id],
//   }),
//   category: one(categories, {
//     fields: [auctions.categoryId],
//     references: [categories.id],
//   }),
//   images: many(auctionImages),
//   bids: many(bids),
// }));

// export const bidsRelations = relations(bids, ({ one }) => ({
//   auction: one(auctions, {
//     fields: [bids.auctionId],
//     references: [auctions.id],
//   }),
//   bidder: one(users, {
//     fields: [bids.bidderId],
//     references: [users.id],
//   }),
// }));

// export const auctionImagesRelations = relations(auctionImages, ({ one }) => ({
//   auction: one(auctions, {
//     fields: [auctionImages.auctionId],
//     references: [auctions.id],
//   }),
// }));