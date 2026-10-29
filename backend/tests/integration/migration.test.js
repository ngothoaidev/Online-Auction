import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { connect, resetDatabase } from "../helpers/db.js";

let sql;
before(async () => { sql = connect(); await resetDatabase(sql); });
after(async () => { await sql.end(); });

test("baseline migration creates the core tables on an empty database", async () => {
  const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  const names = rows.map((r) => r.table_name);
  for (const t of ["users", "auctions", "bids", "orders", "reviews", "user_favorites", "order_messages"]) {
    assert.ok(names.includes(t), `missing table ${t}`);
  }
});

test("orders.auction_id stays unique", async () => {
  const rows = await sql`SELECT indexdef FROM pg_indexes WHERE tablename='orders'`;
  assert.ok(rows.some((r) => /UNIQUE/i.test(r.indexdef) && /auction_id/.test(r.indexdef)));
});
