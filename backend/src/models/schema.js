import { pgTable, serial, integer, varchar, text, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  recipient: varchar('recipient', { length: 256 }).notNull(),
  houseNumber: varchar('house_number', { length: 256 }).notNull(),
  street: varchar('street', { length: 256 }).notNull(),
  provinceId: integer('province_id').notNull(),
  wardId: integer('ward_id').notNull(),
});

export const wards = pgTable('wards', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  nameWithType: varchar('name_with_type', { length: 256 }).notNull(),
  provinceId: integer('province_id').notNull(),
});

export const provinces = pgTable('provinces', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  nameWithType: varchar('name_with_type', { length: 256 }).notNull(),
});