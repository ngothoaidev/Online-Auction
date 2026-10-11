import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import dotenv from "dotenv"
import * as schema from './schema.js'

dotenv.config();

const connectionString = process.env.DATABASE_URL

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false })
const db = drizzle(client, { schema });

export default db;