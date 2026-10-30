// Usage: node scripts/audit-legacy-proofs.ts
// Lists orders whose payment/shipping proof is an old public URL (not a private /order/:id/proofs/:asset path).
// Output: order ids + host only. Moving those files behind private storage needs credentials for the storage owner
// (e.g. Cloudinary admin API) and is NOT done by this script: until then those URLs remain reachable by anyone who has them.
import dotenv from "dotenv";
import postgres from "postgres";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = postgres(url, { max: 1 });
const rows = await sql`
  SELECT order_id, payment_proof_url, shipping_proof_url FROM orders
  WHERE (payment_proof_url IS NOT NULL AND payment_proof_url NOT LIKE '/order/%')
     OR (shipping_proof_url IS NOT NULL AND shipping_proof_url NOT LIKE '/order/%')
  ORDER BY order_id`;
const host = (u: string) => { try { return new URL(u).host; } catch { return "unparseable"; } };
const report = rows.map((r) => ({
  orderId: r.order_id,
  payment: r.payment_proof_url && !r.payment_proof_url.startsWith("/order/") ? host(r.payment_proof_url) : null,
  shipping: r.shipping_proof_url && !r.shipping_proof_url.startsWith("/order/") ? host(r.shipping_proof_url) : null,
}));
console.log(JSON.stringify({ legacyPublicProofs: report.length, orders: report }, null, 2));
await sql.end();
