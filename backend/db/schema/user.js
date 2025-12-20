import { pgTable, serial, integer, varchar, text, timestamp, pgEnum, uniqueIndex, date } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum('user_role', ['buyer', 'seller', 'admin'])

export const users = pgTable('users', {
    userId: serial('user_id').primaryKey(),
    username: varchar('username', { length: 50 }).notNull(),
    email: varchar('email', { length: 100 }).notNull(),
    encryptedPassword: varchar('encrypted_password', { length: 255 }).notNull(),
    fullName: text('full_name'),
    role: userRoleEnum('role').default('buyer'),
    avatarUrl: text('avatar_url'),
    birthday: date('birthday'),
    bio: text('bio'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    ratingCount: integer('rating_count').default(0),
    positiveRatingCount: integer('positive_rating_count').default(0)
});

