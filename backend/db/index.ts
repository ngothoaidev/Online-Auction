import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import dotenv from "dotenv"
import * as schema from './schema.ts'

dotenv.config();

const connectionString = process.env.DATABASE_URL

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = connectionString ? postgres(connectionString, { prepare: false }) : postgres({ prepare: false })
const db = drizzle(client, { schema });

export type Db = typeof db;
/** The transaction handle passed to db.transaction callbacks. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Anything that can run queries: the pool or an open transaction. */
export type Executor = Db | Tx;

export type UserRow = typeof schema.users.$inferSelect;
export type AuctionRow = typeof schema.auctions.$inferSelect;
export type OrderRow = typeof schema.orders.$inferSelect;

export default db;