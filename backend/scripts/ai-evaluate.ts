// Calls only the metered application endpoint: evaluation uses the SAME permanent beta ledger.
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { draftOutput } from '../validation/ai.ts';
type Sample = { id: string; locale: 'en' | 'vi'; notes: string; images: string[]; expectedFacts: string[]; unknowns: string[]; acceptableCategoryIds: number[]; tokenEnv?: string };
const [manifestPath, outputPath] = process.argv.slice(2);
if (!manifestPath || !outputPath) throw new Error('Usage: AI_EVAL_TOKEN=... AI_EVAL_URL=http://localhost:3000 node scripts/ai-evaluate.ts manifest.json storage/ai-evaluation/report.json');
if (!process.argv.includes('--allow-metered-calls')) throw new Error('Evaluation consumes the selected provider beta budget. Add --allow-metered-calls only after that provider preflight.');
const base = new URL(process.env.AI_EVAL_URL || 'http://localhost:3000');
if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Use HTTPS outside localhost.');
if (!process.env.AI_EVAL_TOKEN) throw new Error('AI_EVAL_TOKEN is required, never commit it.');
const samples: Sample[] = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (samples.length !== 30 || samples.filter(s => s.locale === 'en').length !== 15 || samples.filter(s => s.locale === 'vi').length !== 15) throw new Error('Evaluation requires 30 samples, 15 per language.');
const rows = [];
for (const sample of samples) {
  const fd = new FormData(); fd.append('notes', sample.notes); fd.append('locale', sample.locale);
  for (const name of sample.images) {
    const bytes = await fs.readFile(path.resolve(path.dirname(manifestPath), name));
    fd.append('images', new Blob([new Uint8Array(bytes)]), path.basename(name));
  }
  const started = performance.now();
  const token = sample.tokenEnv ? process.env[sample.tokenEnv] : process.env.AI_EVAL_TOKEN;
  if (!token) throw new Error(`Missing evaluation token for ${sample.id}`);
  const response = await fetch(new URL('/ai/listing-draft', base), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': `eval-${sample.id}` }, body: fd });
  const body = await response.json();
  const output = { ...body }; delete output.requestId; delete output.inputHash;
  rows.push({ id: sample.id, locale: sample.locale, status: response.status, latencyMs: performance.now() - started, schemaValid: response.ok && draftOutput.safeParse(output).success, response: body, expectedFacts: sample.expectedFacts, unknowns: sample.unknowns, acceptableCategoryIds: sample.acceptableCategoryIds, review: { hallucinatedAuthenticationOrOrigin: null, categoryAccepted: null, notes: '' } });
  // Stop instead of automatically continuing after quotas, credit gates or provider failure.
  if (!response.ok) break;
}
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify({ createdAt: new Date().toISOString(), reviewRequired: true, realPhotoRightsReviewed: false, rows }, null, 2));
console.log(`Saved ${rows.length} results for private manual review. No quality approval is implied.`);
