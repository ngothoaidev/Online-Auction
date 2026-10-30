// Usage: node scripts/resolve-reviews.ts [--apply]   (default: dry run)
import dotenv from "dotenv";
import postgres from "postgres";
import { planReviewRepair, applyReviewRepair } from "../services/reviewRepair.ts";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = postgres(url, { max: 1 });
const plan = await planReviewRepair(sql);
const out: Record<string, unknown> = { duplicateGroups: plan.duplicateGroups.length, invalid: plan.invalid.length, cancellationLikeFlagged: plan.cancellationLikeFlagged, plan };
if (process.argv.includes("--apply")) out.applied = await applyReviewRepair(sql, plan);
console.log(JSON.stringify(out, null, 2));
await sql.end();
