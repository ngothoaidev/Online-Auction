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

export default db;