import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://auction:auction@localhost:55432/auction_test";

// Refuse to run destructive helpers against anything that is not an explicit *_test database.
export function assertTestDatabase(url = TEST_DATABASE_URL) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/_test$/.test(name)) throw new Error(`Refusing to touch non-test database "${name}"`);
}

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");

export function connect() {
  assertTestDatabase();
  return postgres(TEST_DATABASE_URL, { max: 60, onnotice: () => {} });
}

/** Drop everything and re-apply all migrations. */
export async function resetDatabase(sql) {
  assertTestDatabase();
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(sql), { migrationsFolder });
}
