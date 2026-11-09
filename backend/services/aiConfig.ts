import { AppError } from '../utils/errors.ts';
import { shopaikeyConfig, shopaikeyAvailability } from './shopaikeyConfig.ts';

export const PROMPT_VERSION = 'listing-v1';
export const MODEL = 'amazon.nova-lite-v1:0';
const bounded = (name: string, fallback: number, max: number) => {
  const n = Number(process.env[name] ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
};
export const aiConfig = () => {
  const shop = process.env.AI_PROVIDER === 'shopaikey';
  const s = shopaikeyConfig();
  return {
    enabled: process.env.AI_LISTING_ENABLED === 'true',
    provider: process.env.AI_PROVIDER || 'bedrock',
    model: shop ? s.model : process.env.AI_MODEL_ID || MODEL,
    budgetId: shop ? 2 : 1,
    providerLabel: shop ? 'ShopAIKey' : process.env.AI_PROVIDER === 'fake' ? 'the local test provider' : 'Amazon Bedrock',
    configurationId: shop ? s.fingerprint : 'bedrock-v1',
    region: process.env.AWS_REGION || 'us-east-1',
    daily: bounded('AI_DAILY_LIMIT', 5, 5), concurrency: bounded('AI_MAX_CONCURRENCY', 2, 2),
    timeout: bounded('AI_TIMEOUT_MS', 25000, 25000),
    // Integer cents: configuration can lower, never silently expand the approved beta budget.
    budgetCents: shop ? s.budgetCents : Math.min(500, Math.max(0, Math.floor(Number(process.env.AI_BETA_BUDGET_USD ?? 5) * 100) || 0)),
    reserveCents: shop ? s.reserveCents : 5,
    allowlist: (process.env.AI_BETA_SELLER_IDS || '').split(',').map(Number).filter(n => Number.isSafeInteger(n) && n > 0),
  };
};

export function availability(userId: number): string | null {
  const c = aiConfig();
  if (!c.enabled) return 'AI_DISABLED';
  if (!c.allowlist.includes(userId)) return 'AI_NOT_ELIGIBLE';
  if (c.provider === 'fake') return process.env.NODE_ENV === 'production' ? 'AI_DISABLED' : null;
  if (c.provider === 'shopaikey') return shopaikeyAvailability();
  if (c.provider !== 'bedrock' || c.model !== MODEL || c.region !== 'us-east-1') return 'AI_CONFIGURATION_REQUIRED';
  const inputRate = Number(process.env.AI_INPUT_USD_PER_MILLION), outputRate = Number(process.env.AI_OUTPUT_USD_PER_MILLION);
  if (![inputRate, outputRate].every(n => Number.isFinite(n) && n > 0) ||
      (300000 * inputRate + 2048 * outputRate) / 1000000 > 0.05 ||
      process.env.AI_CREDIT_APPLIES !== 'true' || process.env.AI_MODEL_ACCESS_VERIFIED !== 'true' || !(Number(process.env.AI_CREDIT_BALANCE_USD) >= 5)) return 'AI_CONFIGURATION_REQUIRED';
  const expiry = Date.parse(process.env.AI_CREDIT_EXPIRES_AT || '');
  const verified = Date.parse(process.env.AI_PREFLIGHT_VERIFIED_AT || '');
  if (!process.env.AWS_BEARER_TOKEN_BEDROCK || !Number.isFinite(expiry) || expiry <= Date.now() ||
      !Number.isFinite(verified) || verified > Date.now() || Date.now() - verified > 7 * 86400000 ||
      process.env.AI_PREFLIGHT_APPROVED !== 'true') return 'AI_CONFIGURATION_REQUIRED';
  return null;
}
export function requireAvailable(userId: number) {
  const reason = availability(userId);
  if (reason) throw new AppError(reason === 'AI_NOT_ELIGIBLE' ? 403 : 503, reason, 'AI assistance is unavailable. You can still publish manually.');
}
