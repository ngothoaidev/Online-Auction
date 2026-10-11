// Usage: node scripts/resolve-reviews.js [--apply]   (default: dry run)
import dotenv from "dotenv";
import postgres from "postgres";
import { planReviewRepair, applyReviewRepair } from "../services/reviewRepair.js";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const plan = await planReviewRepair(sql);
const out = { duplicateGroups: plan.duplicateGroups.length, invalid: plan.invalid.length, cancellationLikeFlagged: plan.cancellationLikeFlagged, plan };
if (process.argv.includes("--apply")) out.applied = await applyReviewRepair(sql, plan);
console.log(JSON.stringify(out, null, 2));
await sql.end();
