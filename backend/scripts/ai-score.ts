// Offline human-review gate. No model calls, no cloud billing requests.
import fs from 'node:fs/promises';
const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/ai-score.ts storage/ai-evaluation/report.json');
const report = JSON.parse(await fs.readFile(file, 'utf8'));
type Row = { locale: string; schemaValid: boolean; status: number; latencyMs: number; review: { hallucinatedAuthenticationOrOrigin: boolean | null; categoryAccepted: boolean | null } };
const rows = report.rows as Row[];
const complete = rows.length === 30 && rows.filter(r => r.locale === 'en').length === 15 && rows.filter(r => r.locale === 'vi').length === 15;
const reviewed = rows.every(r => typeof r.review?.hallucinatedAuthenticationOrOrigin === 'boolean' && typeof r.review?.categoryAccepted === 'boolean');
const schemaRate = rows.length ? rows.filter(r => r.schemaValid && r.status === 200).length / rows.length : 0;
const categoryRate = rows.length ? rows.filter(r => r.review?.categoryAccepted === true).length / rows.length : 0;
const durations = rows.map(r => r.latencyMs).filter(Number.isFinite).sort((a, b) => a - b);
const p95Ms = durations[Math.ceil(durations.length * 0.95) - 1] ?? Infinity;
const hallucinations = rows.filter(r => r.review?.hallucinatedAuthenticationOrOrigin === true).length;
// This approval must be set by the dataset reviewer, not inferred from generated fixture names.
const passed = report.realPhotoRightsReviewed === true && complete && reviewed && schemaRate >= 0.95 && categoryRate >= 0.9 && hallucinations === 0 && durations.length === 30 && p95Ms <= 20000;
console.log(JSON.stringify({ passed, complete, reviewed, realPhotoRightsReviewed: report.realPhotoRightsReviewed === true, schemaRate, categoryRate, hallucinations, p95Ms: Number.isFinite(p95Ms) ? p95Ms : null }, null, 2));
if (!passed) process.exitCode = 1;
