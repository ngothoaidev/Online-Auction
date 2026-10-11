// Deterministic local seed. Fake data only; refuses to run against non-local databases.
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as s from "../db/schema.js";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!/@(localhost|127\.0\.0\.1|db)(:|\/)/.test(url || "")) throw new Error("seed refuses non-local DATABASE_URL");

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });
const pw = await bcrypt.hash("Passw0rd!demo", 10);

const people = [
  { username: "demo_admin", email: "admin@example.test", role: "admin" },
  { username: "demo_seller", email: "seller@example.test", role: "seller" },
  { username: "demo_buyer1", email: "buyer1@example.test", role: "buyer" },
  { username: "demo_buyer2", email: "buyer2@example.test", role: "buyer" },
];
for (const p of people) {
  await db.insert(s.users).values({ ...p, encryptedPassword: pw, fullName: p.username, isVerified: true }).onConflictDoNothing();
}
let [cat] = await db.select().from(s.categories).where(eq(s.categories.name, "Demo Watches"));
if (!cat) [cat] = await db.insert(s.categories).values({ name: "Demo Watches" }).returning();
const [seller] = await db.select().from(s.users).where(eq(s.users.username, "demo_seller"));

const existing = await db.select().from(s.auctions).where(eq(s.auctions.sellerId, seller.id));
if (existing.length === 0) {
  const end = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  await db.insert(s.auctions).values([
    { sellerId: seller.id, categoryId: cat.id, title: "Demo vintage watch", description: "<p>Seeded lot</p>",
      startingPrice: "1000000", currentPrice: "1000000", stepPrice: "100000", buyNowPrice: "5000000", endTime: end, status: "active" },
    { sellerId: seller.id, categoryId: cat.id, title: "Demo pocket watch", description: "<p>Seeded lot</p>",
      startingPrice: "2000000", currentPrice: "2000000", stepPrice: "50000", endTime: end, status: "active", autoExtend: true },
  ]);
}
await client.end();
console.log("seed done (users: demo_admin/demo_seller/demo_buyer1/demo_buyer2, password: Passw0rd!demo)");
