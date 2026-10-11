import { pgTable, serial, varchar, text, decimal, timestamp, boolean, integer, pgEnum, date, primaryKey, foreignKey, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['unauthorized', 'buyer', 'seller', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned']);
export const auctionStatusEnum = pgEnum('auction_status', ['active', 'sold', 'ended', 'cancelled']);
export const orderStatusEnum = pgEnum('order_status', ['pending_payment', 'pending_confirmation', 'pending_delivery', 'pending_receipt', 'pending_review', 'completed', 'cancelled']);
export const sellerRequestStatusEnum = pgEnum('seller_request_status', ['pending', 'approved', 'rejected']);

// --- 1. USERS TABLE ---
export const users = pgTable('users', {
  id: serial('user_id').primaryKey(), // Map 'id' code -> 'user_id' DB
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  encryptedPassword: varchar('encrypted_password', { length: 255 }).notNull(),
  fullName: text('full_name'),
  role: userRoleEnum('role').default('unauthorized'),
  status: userStatusEnum('status').default('active'),
  avatarUrl: text('avatar_url'),
  birthday: date('birthday'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  ratingCount: integer('rating_count').default(0),
  positiveRatingCount: integer('positive_rating_count').default(0),
  otp: varchar('otp'),
  googleId: varchar('google_id'),
  facebookId: varchar('facebook_id'),
  isVerified: boolean('is_verified').default(false),
  authVersion: integer('auth_version').notNull().default(0), // bump to revoke every previously issued JWT
});

// Purpose-scoped, hashed, expiring one-time codes / grants (email verification, password reset, change password).
export const authChallenges = pgTable('auth_challenges', {
  id: serial('challenge_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: varchar('purpose', { length: 32 }).notNull(), // verify_email | reset_password | reset_grant | change_password
  hashedCode: varchar('hashed_code', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  byUserPurpose: index('auth_challenges_user_purpose_idx').on(t.userId, t.purpose),
}));

// --- 2. CATEGORIES TABLE ---
export const categories = pgTable('categories', {
  id: serial('category_id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: integer('parent_id'),
  description: text('description'),
});

// --- 3. AUCTIONS TABLE ---
export const auctions = pgTable('auctions', {
  id: serial('auction_id').primaryKey(), // Map 'id' -> 'auction_id'
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  
  startingPrice: decimal('starting_price', { precision: 15, scale: 0 }).notNull(),
  currentPrice: decimal('current_price', { precision: 15, scale: 0 }).notNull(),
  stepPrice: decimal('step_price', { precision: 15, scale: 0 }).default('0'),
  buyNowPrice: decimal('buy_now_price', { precision: 15, scale: 0 }),
  
  status: auctionStatusEnum('status').default('active'),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  
  allowNewbies: boolean('allow_newbies').default(true),
  winnerId: integer('winner_id').references(() => users.id),
  autoExtend: boolean('auto_extend').default(false),
  bidCount: integer('bid_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}); 

// --- 4. AUCTION IMAGES TABLE ---
export const auctionImages = pgTable('auction_images', {
  id: serial('image_id').primaryKey(), // Map 'id' -> 'image_id'
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').default(false),
});

export const comments = pgTable('comments', {
  commentId: serial('comment_id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    // Explicit foreign key definition for parent_id to itself
    parentFk: foreignKey({
        columns: [table.parentId],
        foreignColumns: [table.commentId],
        name: 'comments_parent_id_fkey'
    }).onDelete('cascade')
}));

export const descriptionLogs = pgTable('description_logs', {
  logId: serial('log_id').primaryKey(),
  auctionId: integer('auction_id'), // Assuming this links to auctions
  contentSnapshot: text('content_snapshot').notNull(),
  editedAt: timestamp('edited_at').defaultNow(),
});

// --- 5. BIDS TABLE ---
export const bids = pgTable('bids', {
  id: serial('bid_id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  bidderId: integer('bidder_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 15, scale: 0 }).notNull(),
  maxAmount: decimal('max_amount', { precision: 15, scale: 0 }),
  bidTime: timestamp('bid_time', { withTimezone: true }).defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('review_id').primaryKey(),
  reviewerId: integer('reviewer_id'),
  targetId: integer('target_user_id'),
  auctionId: integer('auction_id'),
  isGoodRating: boolean('is_good_rating'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sellerRequests = pgTable('seller_requests', {
  id: serial('request_id').primaryKey(),
  userId: integer('user_id'),
  reason: text('reason'),
  status: sellerRequestStatusEnum('status').default('pending'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  sellerExpiryDate: timestamp('seller_expiry_date', { withTimezone: true }),
});

export const orders = pgTable('orders', {
  id: serial('order_id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }).unique(),
  buyerId: integer('buyer_id').notNull().references(() => users.id),
  sellerId: integer('seller_id').notNull().references(() => users.id),
  
  // Final price
  finalPrice: decimal('final_price', { precision: 10, scale: 2 }).notNull(),
  
  // Status tracking
  status: orderStatusEnum('status').default('pending_payment'),
  
  // Step 1: Buyer payment info
  paymentProofUrl: text('payment_proof_url'),      // Payment screenshot/invoice
  shippingAddress: text('shipping_address'),
  buyerPhone: varchar('buyer_phone', { length: 20 }),
  paymentSubmittedAt: timestamp('payment_submitted_at'),
  
  // Step 2: Seller confirmation
  paymentConfirmedAt: timestamp('payment_confirmed_at'),
  shippingProofUrl: text('shipping_proof_url'),    // Shipping invoice/tracking
  trackingNumber: varchar('tracking_number', { length: 100 }),
  shippingSubmittedAt: timestamp('shipping_submitted_at'),
  
  // Step 3: Buyer confirms receipt
  receiptConfirmedAt: timestamp('receipt_confirmed_at'),
  
  // Cancellation
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: integer('cancelled_by').references(() => users.id),
  cancelReason: text('cancel_reason'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const userFavorites = pgTable('user_favorites', {
  userId: integer('user_id'),
  auctionId: integer('auction_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.auctionId] }),
}));

export const orderMessages = pgTable('order_messages', {
  id: serial('message_id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  imageUrl: text('image_url'),  // Optional image attachment
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- RELATIONS ---

export const usersRelations = relations(users, ({ many }) => ({
  auctions: many(auctions, { relationName: 'sellerAuctions' }),
  bids: many(bids),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'subcategories',
  }),
  children: many(categories, { relationName: 'subcategories' }),
  auctions: many(auctions),
}));

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  seller: one(users, {
    fields: [auctions.sellerId],
    references: [users.id],
    relationName: 'sellerAuctions',
  }),
  winner: one(users, {
    fields: [auctions.winnerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [auctions.categoryId],
    references: [categories.id],
  }),
  images: many(auctionImages),
  bids: many(bids),
}));

export const auctionImagesRelations = relations(auctionImages, ({ one }) => ({
  auction: one(auctions, {
    fields: [auctionImages.auctionId],
    references: [auctions.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),

  auction: one(auctions, {
    fields: [comments.auctionId],
    references: [auctions.id],
  }),
  // For nested comments (Replies)
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.commentId],
    relationName: 'replies',
  }),

  children: many(comments, {
    relationName: 'replies',
  }),
}));

export const descriptionLogsRelations = relations(descriptionLogs, ({ one }) => ({
  auction: one(auctions, {
    fields: [descriptionLogs.auctionId],
    references: [auctions.id],
  }),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  bidder: one(users, {
    fields: [bids.bidderId],
    references: [users.id],
  }),
}));

