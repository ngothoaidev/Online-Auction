// Usage: node scripts/backfill-maxima.ts [--apply]   (default: dry run, prints a JSON report; never prints amounts of private maxima beyond the plan)
import dotenv from "dotenv";
import postgres from "postgres";
import { planMaximaBackfill, applyMaximaBackfill } from "../services/legacyBackfill.ts";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = postgres(url, { max: 1 });
let plan = await planMaximaBackfill(sql);
if (process.argv.includes("--apply")) plan = await applyMaximaBackfill(sql, plan);
const summary = plan.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.result]: (acc[p.result] ?? 0) + 1 }), {});
console.log(JSON.stringify({ summary, flagged: plan.filter((p) => p.result === "flagged").map(({ auctionId, status, reasons }) => ({ auctionId, status, reasons })) }, null, 2));
await sql.end();
