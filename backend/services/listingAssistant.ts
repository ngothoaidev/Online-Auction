import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import db from '../db/index.ts';
import { AppError } from '../utils/errors.ts';
import { hashPayload } from './idempotency.ts';
import { aiConfig, availability, requireAvailable, PROMPT_VERSION } from './aiConfig.ts';
import { draftOutput } from '../validation/ai.ts';
import type { DraftInput, ListingDraft } from '../validation/ai.ts';
import { prepareImages, cleanupAiTemp } from './aiImages.ts';
import { fake } from '../adapters/ai/fake.ts';
import { bedrock } from '../adapters/ai/bedrock.ts';
import { shopaikey } from '../adapters/ai/shopaikey.ts';
import { shopaikeyConfig } from './shopaikeyConfig.ts';
import { inc, observe } from '../utils/metrics.ts';

type Row = { id: string; input_hash: string; status: string; result: ListingDraft | null; error_code: string | null; expires_at: Date };
export async function capabilities(userId: number) {
  const c = aiConfig();
  const reason = availability(userId);
  if (reason) return { enabled: false, reason, providerLabel: c.providerLabel, dailyRemaining: 0, maxImages: 3, locales: ['en', 'vi'] };
  const [quota] = await db.execute<{ used: number }>(sql`SELECT used FROM ai_daily_quota WHERE user_id=${userId} AND day=(clock_timestamp() AT TIME ZONE 'UTC')::date`);
  const [budget] = await db.execute<{ reserved_cents: number; limit_cents: number }>(sql`SELECT * FROM ai_beta_budget WHERE id=${c.budgetId}`);
  const budgetAvailable = (budget?.reserved_cents ?? 0) + c.reserveCents <= Math.min(budget?.limit_cents ?? c.budgetCents, c.budgetCents);
  return { enabled: budgetAvailable && (quota?.used ?? 0) < c.daily, reason: !budgetAvailable ? 'AI_BUDGET_EXHAUSTED' : (quota?.used ?? 0) >= c.daily ? 'AI_RATE_LIMITED' : null, providerLabel: c.providerLabel, dailyRemaining: Math.max(0, c.daily - (quota?.used ?? 0)), maxImages: 3, locales: ['en', 'vi'] };
}
function present(row: Row) {
  if (new Date(row.expires_at).getTime() <= Date.now()) throw new AppError(410, 'AI_RESULT_EXPIRED', 'This draft expired. Start a new request.');
  if (row.status === 'succeeded' && row.result) return { status: 200, body: row.result };
  if (row.status === 'preparing' || row.status === 'running') return { status: 202, body: { requestId: row.id, status: 'processing', statusUrl: `/ai/listing-draft/${row.id}` } };
  throw new AppError(row.status === 'unknown' ? 504 : 503, row.error_code || 'AI_UNAVAILABLE', 'The draft could not be completed. You can still publish manually.');
}
export async function readDraft(userId: number, id: string) {
  await expireStale();
  const [row] = await db.execute<Row>(sql`SELECT * FROM ai_draft_requests WHERE id=${id} AND user_id=${userId}`);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Draft not found.');
  return present(row);
}
export async function expireStale() {
  // Sent but uncertain calls retain quota/budget. Preparing requests have not reserved either yet.
  await db.execute(sql`UPDATE ai_draft_requests SET status='unknown', error_code='AI_OUTCOME_UNKNOWN' WHERE status IN ('preparing','running') AND lease_until < clock_timestamp()`);
  await db.execute(sql`UPDATE ai_draft_requests SET result=NULL WHERE expires_at <= clock_timestamp() AND result IS NOT NULL`);
}

export async function generateDraft(userId: number, key: string, input: DraftInput, files: Express.Multer.File[]) {
  requireAvailable(userId);
  const c = aiConfig();
  const hashes: string[] = [];
  for (const f of files) hashes.push(crypto.createHash('sha256').update(await fs.readFile(f.path)).digest('hex'));
  const inputHash = hashPayload({ hashes, ...input, provider: c.provider, configuration: c.configurationId, model: c.model, prompt: PROMPT_VERSION });
  const id = crypto.randomUUID();
  const claim = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(74921301)`);
    await tx.execute(sql`INSERT INTO ai_beta_budget (id,limit_cents) VALUES (${c.budgetId},${c.budgetCents}) ON CONFLICT DO NOTHING`);
    // One global lock serializes slot, quota and budget claims across all API replicas.
    await tx.execute(sql`SELECT id FROM ai_beta_budget WHERE id=${c.budgetId} FOR UPDATE`);
    await tx.execute(sql`UPDATE ai_draft_requests SET status='unknown', error_code='AI_OUTCOME_UNKNOWN' WHERE status IN ('preparing','running') AND lease_until < clock_timestamp()`);
    const [prior] = await tx.execute<Row>(sql`SELECT * FROM ai_draft_requests WHERE user_id=${userId} AND idempotency_key=${key}`);
    if (prior) {
      if (prior.input_hash !== inputHash) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This key belongs to a different input.');
      return prior;
    }
    const active = await tx.execute<{ user_id: number }>(sql`SELECT user_id FROM ai_draft_requests WHERE status IN ('preparing','running')`);
    if (active.length >= c.concurrency || active.some(r => r.user_id === userId)) throw new AppError(429, 'AI_BUSY', 'AI is busy. Please try later or publish manually.');
    await tx.execute(sql`INSERT INTO ai_draft_requests (id,user_id,idempotency_key,input_hash,status,provider,budget_id,model,prompt_version,expires_at,lease_until) VALUES (${id},${userId},${key},${inputHash},'preparing',${c.provider},${c.budgetId},${c.model},${PROMPT_VERSION},clock_timestamp()+interval '24 hours',clock_timestamp()+interval '60 seconds')`);
    return null;
  });
  if (claim) return present(claim);
  const started = performance.now();
  let sent = false;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const images = await prepareImages(files);
    const categories = await db.execute<{ id: number; name: string }>(sql`SELECT category_id AS id, name FROM categories ORDER BY category_id LIMIT 501`);
    if (categories.length > 500 || JSON.stringify(categories).length > 30000) throw new AppError(503, 'AI_CONFIGURATION_REQUIRED', 'Catalog is too large for this assistant configuration.');
    // Inputs and images are valid before consuming paid-call quota. Re-check the kill switch/credit expiry.
    requireAvailable(userId);
    await db.transaction(async tx => {
      const [budget] = await tx.execute<{ limit_cents: number; reserved_cents: number }>(sql`SELECT * FROM ai_beta_budget WHERE id=${c.budgetId} FOR UPDATE`);
      const [own] = await tx.execute<{ status: string }>(sql`SELECT status FROM ai_draft_requests WHERE id=${id} AND lease_until > clock_timestamp() FOR UPDATE`);
      if (own?.status !== 'preparing') throw new AppError(503, 'AI_OUTCOME_UNKNOWN', 'AI preparation expired.');
      if (budget.reserved_cents + c.reserveCents > Math.min(budget.limit_cents, c.budgetCents)) throw new AppError(429, 'AI_BUDGET_EXHAUSTED', 'The AI beta budget is exhausted.');
      await tx.execute(sql`INSERT INTO ai_daily_quota (user_id,day,used) VALUES (${userId},(clock_timestamp() AT TIME ZONE 'UTC')::date,0) ON CONFLICT DO NOTHING`);
      const [quota] = await tx.execute<{ used: number }>(sql`SELECT used FROM ai_daily_quota WHERE user_id=${userId} AND day=(clock_timestamp() AT TIME ZONE 'UTC')::date FOR UPDATE`);
      if (quota.used >= c.daily) throw new AppError(429, 'AI_RATE_LIMITED', 'Your daily AI allowance is exhausted.');
      await tx.execute(sql`UPDATE ai_daily_quota SET used=used+1 WHERE user_id=${userId} AND day=(clock_timestamp() AT TIME ZONE 'UTC')::date`);
      await tx.execute(sql`UPDATE ai_beta_budget SET reserved_cents=reserved_cents+${c.reserveCents} WHERE id=${c.budgetId}`);
      await tx.execute(sql`UPDATE ai_draft_requests SET status='running', sent_at=clock_timestamp(), lease_until=clock_timestamp()+interval '60 seconds' WHERE id=${id}`);
    });
    sent = true;
    inc('ai_listing_reserved_cents_total', {}, c.reserveCents);
    timer = setTimeout(() => controller.abort(), c.timeout);
    const provider = c.provider === 'fake' ? fake : c.provider === 'shopaikey' ? shopaikey : bedrock;
    const result = await provider.generate({ ...input, images, categories: [...categories] }, controller.signal);
    if (controller.signal.aborted) throw new Error('timed out');
    const parsed = draftOutput.safeParse(result.output);
    if (!parsed.success) throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned an invalid draft.');
    const output = parsed.data;
    if ((output.draft.categoryId !== null && !categories.some(cat => cat.id === output.draft.categoryId)) || output.facts.some(f => f.source === 'image' ? f.imageIndex === undefined || f.imageIndex >= images.length : f.imageIndex !== undefined)) throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned invalid evidence or category.');
    const body: ListingDraft = { ...output, requestId: id, inputHash };
    const shop = c.provider === 'shopaikey' ? shopaikeyConfig() : null;
    const inputRate = shop?.inputRate ?? Number(process.env.AI_INPUT_USD_PER_MILLION), outputRate = shop?.outputRate ?? Number(process.env.AI_OUTPUT_USD_PER_MILLION);
    const estimatedCostUsd = result.usage && [inputRate, outputRate].every(n => Number.isFinite(n) && n > 0) ? (result.usage.inputTokens * inputRate + result.usage.outputTokens * outputRate) / 1000000 + (shop ? shop.imageFee * images.length + shop.requestFee : 0) : null;
    // Successful ShopAIKey responses with bounded usage settle at the reviewed effective rates,
    // rounded up to a whole cent. Unknown usage/errors keep the entire original reservation.
    const chargedCents = shop && estimatedCostUsd !== null && Number.isFinite(estimatedCostUsd) && estimatedCostUsd >= 0
      ? Math.min(c.reserveCents, Math.max(1, Math.ceil(estimatedCostUsd * 100))) : c.reserveCents;
    const refundCents = c.reserveCents - chargedCents;
    const usage = result.usage ? { ...result.usage, estimatedCostUsd, ...(shop ? { reservedCents: c.reserveCents, chargedCents } : {}) } : null;
    await db.transaction(async tx => {
      if (refundCents > 0) await tx.execute(sql`SELECT id FROM ai_beta_budget WHERE id=${c.budgetId} FOR UPDATE`);
      const completed = await tx.execute(sql`UPDATE ai_draft_requests SET status='succeeded',result=${JSON.stringify(body)}::jsonb,usage=${JSON.stringify(usage)}::jsonb WHERE id=${id} AND status='running' RETURNING id`);
      // The status transition and release commit together; replay and expired requests cannot release twice.
      if (refundCents > 0 && completed.length) await tx.execute(sql`UPDATE ai_beta_budget SET reserved_cents=reserved_cents-${refundCents} WHERE id=${c.budgetId}`);
    });
    inc('ai_listing_calls_total', { outcome: 'succeeded', provider: c.provider });
    if (result.usage) {
      inc('ai_listing_tokens_total', { kind: 'input', provider: c.provider }, result.usage.inputTokens);
      inc('ai_listing_tokens_total', { kind: 'output', provider: c.provider }, result.usage.outputTokens);
    }
    if (estimatedCostUsd !== null) inc('ai_listing_estimated_cost_usd_total', {}, estimatedCostUsd);
    return { status: 200, body };
  } catch (error) {
    const code = controller.signal.aborted ? 'AI_TIMEOUT' : error instanceof AppError ? error.code : 'AI_UNAVAILABLE';
    await db.execute(sql`UPDATE ai_draft_requests SET status=${controller.signal.aborted || (sent && !(error instanceof AppError)) ? 'unknown' : 'failed'}, error_code=${code} WHERE id=${id} AND status IN ('preparing','running')`);
    inc('ai_listing_calls_total', { outcome: code, provider: c.provider });
    // Only safe, fixed error messages reach logging/Sentry. Never propagate raw provider exceptions.
    if (error instanceof AppError) throw error;
    throw new AppError(controller.signal.aborted ? 504 : 503, code, 'AI assistance could not finish. You can still publish manually.');
  } finally { if (timer) clearTimeout(timer); observe('ai_listing_duration_ms', { provider: c.provider }, performance.now() - started); }
}

export async function recordEvent(userId: number, id: string, event: 'applied' | 'undone' | 'published', auctionId?: number) {
  if (event === 'published') {
    const [auction] = await db.execute(sql`SELECT auction_id FROM auctions WHERE auction_id=${auctionId ?? 0} AND seller_id=${userId}`);
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Listing not found.');
  }
  const column = sql.identifier(event);
  const rows = await db.execute(sql`UPDATE ai_draft_requests SET ${column}=true WHERE id=${id} AND user_id=${userId} AND status='succeeded' AND ${column}=false RETURNING id`);
  if (rows.length) inc('ai_listing_events_total', { event });
}
export async function cleanupAi() { await expireStale(); await cleanupAiTemp(); }
