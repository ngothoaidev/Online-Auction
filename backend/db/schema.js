import { pgTable, serial, varchar, text, decimal, timestamp, boolean, integer, pgEnum, date, primaryKey, foreignKey, index, bigint, jsonb, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['unauthorized', 'buyer', 'seller', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned']);
export const auctionStatusEnum = pgEnum('auction_status', ['active', 'sold', 'ended', 'cancelled']);
export const orderStatusEnum = pgEnum('order_status', ['pending_payment', 'pending_confirmation', 'pending_delivery', 'pending_receipt', 'pending_review', 'completed', 'cancelled', 'payment_expired']);
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
  version: integer('version').notNull().default(0), // bumped on every state change; clients/SSE use it to order snapshots
  commandSequence: bigint('command_sequence', { mode: 'number' }).notNull().default(0), // monotonic per-auction ordering for bids
  settledAt: timestamp('settled_at', { withTimezone: true }),
  closeReason: varchar('close_reason', { length: 32 }), // ended | buy_now | no_bids | cancelled | ...
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  dueIdx: index('auctions_status_end_time_idx').on(t.status, t.endTime, t.id),
}));


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
  auctionSequence: bigint('auction_sequence', { mode: 'number' }), // per-auction order assigned under the auction lock
  type: varchar('type', { length: 16 }).notNull().default('bid'), // bid | auto | buy_now (legacy rows stay 'bid')
  invalidatedAt: timestamp('invalidated_at', { withTimezone: true }), // set when the bidder is disqualified; row is kept for audit
}, (t) => ({
  seqIdx: index('bids_auction_sequence_idx').on(t.auctionId, t.auctionSequence),
}));

export const reviews = pgTable('reviews', {
  id: serial('review_id').primaryKey(),
  reviewerId: integer('reviewer_id').notNull().references(() => users.id),
  targetId: integer('target_user_id').notNull().references(() => users.id),
  auctionId: integer('auction_id').notNull().references(() => auctions.id),
  isGoodRating: boolean('is_good_rating'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
  source: varchar('source', { length: 24 }).notNull().default('participant'), // participant | legacy_cancellation (auto-created by the old cancel flow)
}, (t) => ({
  onePerReviewer: uniqueIndex('reviews_auction_reviewer_uniq').on(t.auctionId, t.reviewerId),
  byTarget: index('reviews_target_idx').on(t.targetId),
}));

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
  finalPrice: decimal('final_price', { precision: 15, scale: 0 }).notNull(),
  
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

  // State machine (T10)
  version: integer('version').notNull().default(0),
  paymentDueAt: timestamp('payment_due_at', { withTimezone: true }), // B08: createdAt + PAYMENT_WINDOW_HOURS
  paymentMode: varchar('payment_mode', { length: 16 }).notNull().default('manual'), // manual | mock | sandbox (T20)
  closeReason: varchar('close_reason', { length: 32 }),
});

// Payment adapter (T20). One row per checkout attempt; amount/currency are copied from the order at creation (server truth).
// `status` is OUR processing state; `providerStatus` is what the provider reports (for the mock adapter it is the
// provider's own store, so a lost webhook can be recovered by reconciliation).
export const paymentAttempts = pgTable('payment_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  buyerId: integer('buyer_id').notNull().references(() => users.id),
  provider: varchar('provider', { length: 16 }).notNull(),
  reference: varchar('reference', { length: 64 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 0 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('VND'),
  status: varchar('status', { length: 16 }).notNull().default('created'), // created | succeeded | failed | exception
  providerStatus: varchar('provider_status', { length: 16 }).notNull().default('pending'), // pending | succeeded | failed
  exceptionReason: varchar('exception_reason', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  reference: uniqueIndex('payment_attempts_reference_uniq').on(t.provider, t.reference),
  byOrder: index('payment_attempts_order_idx').on(t.orderId, t.createdAt),
  open: index('payment_attempts_open_idx').on(t.updatedAt).where(sql`status = 'created'`),
}));

// Every provider event ever received, deduplicated by the provider's event id (duplicates are acknowledged, never re-applied).
export const paymentEvents = pgTable('payment_events', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 16 }).notNull(),
  eventId: varchar('event_id', { length: 100 }).notNull(),
  reference: varchar('reference', { length: 64 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 0 }),
  currency: varchar('currency', { length: 3 }),
  outcome: varchar('outcome', { length: 64 }), // applied | failed_recorded | ignored | exception:<reason>
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventId: uniqueIndex('payment_events_event_uniq').on(t.provider, t.eventId),
}));

// Notifications (T21): one row per (recipient, channel, logical notification). `dedupe_key` is `<outbox eventId>:<kind>`,
// so a redelivered event never creates a second row. in_app rows are read by their recipient only; email rows carry
// delivery status (pending | sent | failed | skipped) and the last error.
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientId: integer('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 8 }).notNull(), // in_app | email
  kind: varchar('kind', { length: 32 }).notNull(),
  dedupeKey: varchar('dedupe_key', { length: 160 }).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  body: text('body').notNull(),
  link: varchar('link', { length: 200 }),
  status: varchar('status', { length: 12 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
}, (t) => ({
  logical: uniqueIndex('notifications_logical_uniq').on(t.recipientId, t.channel, t.dedupeKey),
  inbox: index('notifications_inbox_idx').on(t.recipientId, t.channel, t.createdAt),
  delivery: index('notifications_delivery_idx').on(t.status, t.createdAt).where(sql`channel = 'email'`),
}));

// Admin audit trail (T22). Append-only: a trigger (migration 0010) rejects UPDATE/DELETE. No FK on actor/target ids so
// the trail outlives accounts. before/after hold an allowlisted subset of fields (services/adminAudit.js), never secrets.
export const adminAudit = pgTable('admin_audit', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').notNull(),
  action: varchar('action', { length: 40 }).notNull(),
  targetType: varchar('target_type', { length: 24 }).notNull(),
  targetId: integer('target_id').notNull(),
  reason: text('reason'),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byTarget: index('admin_audit_target_idx').on(t.targetType, t.targetId, t.createdAt),
  byTime: index('admin_audit_time_idx').on(t.createdAt),
}));

// Listing reports (T22): one OPEN report per reporter per lot; an admin resolves all open reports of a lot together.
export const listingReports = pgTable('listing_reports', {
  id: serial('id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 24 }).notNull(), // counterfeit | prohibited | misleading | offensive | other
  details: text('details'),
  status: varchar('status', { length: 12 }).notNull().default('open'), // open | actioned | dismissed
  resolution: text('resolution'),
  resolvedBy: integer('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  oneOpen: uniqueIndex('listing_reports_open_uniq').on(t.auctionId, t.reporterId).where(sql`status = 'open'`),
  byStatus: index('listing_reports_status_idx').on(t.status, t.createdAt),
}));

// Uploaded proofs / message images. Never public: read only through the order's participant-checked endpoint.
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey(),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  purpose: varchar('purpose', { length: 16 }).notNull(), // payment | shipping | message
  storageKey: varchar('storage_key', { length: 64 }).notNull(),
  mime: varchar('mime', { length: 32 }).notNull(),
  size: integer('size').notNull(),
  accessScope: varchar('access_scope', { length: 24 }).notNull().default('order_participants'),
  state: varchar('state', { length: 16 }).notNull().default('pending'), // pending -> attached
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  attachedAt: timestamp('attached_at', { withTimezone: true }),
}, (t) => ({
  byOrder: index('media_assets_order_idx').on(t.orderId, t.ownerId, t.purpose, t.state),
  pendingIdx: index('media_assets_pending_idx').on(t.createdAt).where(sql`state = 'pending'`),
}));

// Append-only audit of every order state change; unique per logical command so retries cannot double-write.
export const orderTransitions = pgTable('order_transitions', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  fromStatus: varchar('from_status', { length: 32 }).notNull(),
  toStatus: varchar('to_status', { length: 32 }).notNull(),
  command: varchar('command', { length: 32 }).notNull(),
  actorType: varchar('actor_type', { length: 16 }).notNull(), // user | system | adapter
  actorId: integer('actor_id'),
  reason: text('reason'),
  commandId: varchar('command_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byOrder: index('order_transitions_order_idx').on(t.orderId, t.id),
  uniqCommand: uniqueIndex('order_transitions_command_uniq').on(t.orderId, t.commandId).where(sql`command_id IS NOT NULL`),
}));
export const userFavorites = pgTable('user_favorites', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
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

// --- Private proxy-bidding ceilings: NEVER selected by public queries or serializers ---
export const bidderMaxima = pgTable('bidder_maxima', {
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  bidderId: integer('bidder_id').notNull().references(() => users.id),
  maxAmount: decimal('max_amount', { precision: 15, scale: 0 }).notNull(),
  prioritySequence: bigint('priority_sequence', { mode: 'number' }).notNull(), // sequence at which this exact max was reached; lower wins ties
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  disqualifiedAt: timestamp('disqualified_at', { withTimezone: true }),
  disqualifiedReason: text('disqualified_reason'),
}, (t) => ({
  pk: primaryKey({ columns: [t.auctionId, t.bidderId] }),
  rankIdx: index('bidder_maxima_rank_idx').on(t.auctionId, t.maxAmount, t.prioritySequence),
}));

// --- Idempotency: claimed and completed in the SAME transaction as the business write ---
export const commandRequests = pgTable('command_requests', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').notNull(),
  operation: varchar('operation', { length: 100 }).notNull(), // e.g. "bid:42"
  idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(),
  requestHash: varchar('request_hash', { length: 64 }).notNull(),
  httpStatus: integer('http_status'),
  result: jsonb('result'), // nulled by compaction; key/hash/resource stay as a tombstone
  resourceId: varchar('resource_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('command_requests_actor_op_key_uniq').on(t.actorId, t.operation, t.idempotencyKey),
}));

// --- Private audit of every auction command (contains private maxima: restricted, never logged) ---
export const auctionCommandAudit = pgTable('auction_command_audit', {
  id: serial('id').primaryKey(),
  commandId: varchar('command_id', { length: 100 }).notNull(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  actorId: integer('actor_id'),
  sequence: bigint('sequence', { mode: 'number' }).notNull(),
  kind: varchar('kind', { length: 32 }).notNull(), // bid | raise_max | buy_now | disqualify | settle | ...
  decision: varchar('decision', { length: 32 }).notNull(), // success | outbid | updated | rejected ...
  privatePayload: jsonb('private_payload'),
  versionBefore: integer('version_before'),
  versionAfter: integer('version_after'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byAuction: index('auction_command_audit_auction_idx').on(t.auctionId, t.sequence),
}));

// --- Transactional outbox: rows are written atomically with the domain change; services/outbox.js dispatches them ---
export const outboxEvents = pgTable('outbox_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
  aggregateId: integer('aggregate_id').notNull(),
  aggregateVersion: integer('aggregate_version').notNull(),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  publicPayload: jsonb('public_payload').notNull(),
  // recipients/participants for internal consumers (notifications); never served on a public channel
  privatePayload: jsonb('private_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  deadAt: timestamp('dead_at', { withTimezone: true }),
  lastError: text('last_error'),
}, (t) => ({
  logical: uniqueIndex('outbox_events_logical_uniq').on(t.aggregateType, t.aggregateId, t.aggregateVersion, t.eventType),
  pending: index('outbox_events_pending_idx').on(t.nextAttemptAt).where(sql`dispatched_at IS NULL AND dead_at IS NULL`),
}));

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

