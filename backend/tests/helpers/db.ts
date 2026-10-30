import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import type { Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://auction:auction@localhost:55432/auction_test";

// Refuse to run destructive helpers against anything that is not an explicit *_test database.
export function assertTestDatabase(url: string = TEST_DATABASE_URL) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/_test$/.test(name)) throw new Error(`Refusing to touch non-test database "${name}"`);
}

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");

export function connect() {
  assertTestDatabase();
  return postgres(TEST_DATABASE_URL, { max: 60, onnotice: () => {} });
}

/** Drop everything and re-apply all migrations. */
export async function resetDatabase(sql: Sql) {
  assertTestDatabase();
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(sql), { migrationsFolder });
}

/** Apply migration files [from, upTo] (journal indexes) by hand, to build a "legacy" schema for upgrade rehearsals. */
export async function applyMigrations(sql: Sql, { from = 0, upTo = Infinity } = {}) {
  assertTestDatabase();
  const fs = await import("node:fs/promises");
  const journal = JSON.parse(await fs.readFile(path.join(migrationsFolder, "meta/_journal.json"), "utf8"));
  for (const entry of (journal.entries as { idx: number; tag: string }[]).filter((e) => e.idx >= from && e.idx <= upTo)) {
    const text = await fs.readFile(path.join(migrationsFolder, `${entry.tag}.sql`), "utf8");
    await sql.begin(async (tx) => {
      for (const stmt of text.split("--> statement-breakpoint")) if (stmt.trim()) await tx.unsafe(stmt);
    });
  }
}

export async function wipeDatabase(sql: Sql) {
  assertTestDatabase();
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
}
