// Deterministic seed. Fake data only; refuses non-local databases unless SEED_ALLOW_REMOTE=yes. Idempotent.
// Remote (public demo) runs skip demo_admin: its password is in this file, so it would be a public admin login.
// Images are static SVGs served by the frontend dev server from /seed/*.svg (no external hosts).
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as s from "../db/schema.ts";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const remote = !/@(localhost|127\.0\.0\.1|db)(:|\/)/.test(url || "");
if (remote && process.env.SEED_ALLOW_REMOTE !== "yes") throw new Error("seed refuses non-local DATABASE_URL (set SEED_ALLOW_REMOTE=yes for a public demo DB)");
process.env.JWT_SECRET ||= "seed-only-secret";

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });
const pw = await bcrypt.hash("Passw0rd!demo", 10);

const people = [
  { username: "demo_admin", email: "admin@example.test", role: "admin" },
  { username: "demo_seller", email: "seller@example.test", role: "seller" },
  { username: "demo_buyer1", email: "buyer1@example.test", role: "buyer" },
  { username: "demo_buyer2", email: "buyer2@example.test", role: "buyer" },
] as const;
for (const p of people.filter((p) => !(remote && p.role === "admin"))) {
  await db.insert(s.users).values({ ...p, encryptedPassword: pw, fullName: p.username.replace("demo_", "Demo "), isVerified: true }).onConflictDoNothing();
}
const user = async (username: string) => (await db.select().from(s.users).where(eq(s.users.username, username)))[0];
const category = async (name: string, parentId: number | null = null) => {
  let [c] = await db.select().from(s.categories).where(eq(s.categories.name, name));
  if (!c) [c] = await db.insert(s.categories).values({ name, parentId }).returning();
  return c;
};
const watches = await category("Watches");
const art = await category("Art");
const jewelry = await category("Jewelry");
const sub = {
  vintage: await category("Vintage Watches", watches.id),
  paintings: await category("Paintings", art.id),
  rings: await category("Rings", jewelry.id),
};

const seller = await user("demo_seller");
const existing = await db.select().from(s.auctions).where(eq(s.auctions.sellerId, seller.id));
// re-runnable for demos: once every seeded lot has closed, add a fresh batch (closed lots stay as history)
if (!existing.some((a) => a.status === "active" && a.endTime > new Date())) {
  const { commands } = await import("../services/auctionCommands.ts");
  const hours = (h: number) => new Date(Date.now() + h * 3600 * 1000);
  const lots: [string, { id: number }, number, number, number | null, Date, boolean][] = [
    ["Omega Seamaster 1968, steel, serviced", sub.vintage, 18_000_000, 500_000, 40_000_000, hours(6), true],
    ["Longines Conquest automatic, black dial", sub.vintage, 9_500_000, 250_000, null, hours(30), false],
    ["Oil on canvas, river at dusk (signed)", sub.paintings, 6_000_000, 200_000, 15_000_000, hours(52), false],
    ["Lacquer panel, hand painted lotus", sub.paintings, 2_800_000, 100_000, null, hours(75), false],
    ["Art deco ring, 18k gold and sapphire", sub.rings, 12_000_000, 400_000, 30_000_000, hours(0.4), true],
    ["Pearl solitaire ring, size 7", sub.rings, 4_200_000, 150_000, null, hours(120), false],
    ["Seiko 5 military dial, unworn", sub.vintage, 3_900_000, 100_000, 8_000_000, hours(9), false],
    ["Watercolour, harbour at first light", sub.paintings, 1_500_000, 50_000, null, hours(160), false],
  ];
  let i = 0;
  const created: (typeof s.auctions.$inferSelect)[] = [];
  for (const [title, cat, start, step, buyNow, end, autoExtend] of lots) {
    i += 1;
    const [a] = await db.insert(s.auctions).values({
      sellerId: seller.id, categoryId: cat.id, title, description: `<p>${title}. Demo lot with fake data.</p>`,
      startingPrice: String(start), currentPrice: String(start), stepPrice: String(step), buyNowPrice: buyNow ? String(buyNow) : null,
      endTime: end, status: "active", autoExtend,
    }).returning();
    created.push(a);
    await db.insert(s.auctionImages).values([0, 1, 2].map((k) => ({ auctionId: a.id, imageUrl: `/seed/lot-${((i + k * 4 - 1) % 12) + 1}.svg`, isPrimary: k === 0 })));
  }
  // a little bidding history through the real command path
  const b1 = await user("demo_buyer1");
  const b2 = await user("demo_buyer2");
  for (const a of created.slice(0, 5)) { // only this batch: older "active" lots may be past end_time awaiting the worker
    const start = BigInt(a.startingPrice);
    await commands.placeBid({ auctionId: a.id, actor: b1, amount: (start * 13n / 10n).toString() });
    await commands.placeBid({ auctionId: a.id, actor: b2, amount: (start * 12n / 10n).toString() });
  }
}
await client.end();
console.log(`seed done (users: ${remote ? "" : "demo_admin/"}demo_seller/demo_buyer1/demo_buyer2, password: Passw0rd!demo)`);
process.exit(0);
