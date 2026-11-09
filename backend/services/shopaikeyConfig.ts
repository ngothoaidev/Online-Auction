import crypto from 'node:crypto';

export const SHOPAIKEY_BASE = 'https://api.shopaikey.com/v1';
const positive = (value: string | undefined) => {
  const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0;
};
const moneyCents = (value: string | undefined) => value && /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : 0;
export function shopaikeyConfig() {
  const inputRate = positive(process.env.SHOPAIKEY_INPUT_USD_PER_MILLION);
  const outputRate = positive(process.env.SHOPAIKEY_OUTPUT_USD_PER_MILLION);
  const maxInputTokens = positive(process.env.SHOPAIKEY_MAX_INPUT_TOKENS);
  // Final effective key/group prices, including routing/group multipliers. Additional fees must be explicit, even zero.
  const explicitFee = (value: string | undefined) => value?.trim() ? Number(value) : NaN;
  const imageFee = explicitFee(process.env.SHOPAIKEY_IMAGE_USD_PER_IMAGE);
  const requestFee = explicitFee(process.env.SHOPAIKEY_REQUEST_FEE_USD);
  const reserveCents = moneyCents(process.env.SHOPAIKEY_REQUEST_RESERVE_USD);
  const budgetCents = Math.min(300, moneyCents(process.env.SHOPAIKEY_BETA_BUDGET_USD ?? '3.00'));
  const base = process.env.SHOPAIKEY_BASE_URL || SHOPAIKEY_BASE;
  const model = process.env.SHOPAIKEY_MODEL_ID || '';
  const group = process.env.SHOPAIKEY_MODEL_GROUP || '';
  const jsonMode = process.env.SHOPAIKEY_JSON_MODE || 'prompt';
  const tokenParameter = process.env.SHOPAIKEY_TOKEN_PARAMETER || 'max_tokens';
  const temperature = process.env.SHOPAIKEY_SEND_TEMPERATURE === 'true';
  const maxOutputTokens = 2048;
  const upperBoundUsd = (maxInputTokens * inputRate + maxOutputTokens * outputRate) / 1000000 + imageFee * 3 + requestFee;
  const keyHash = crypto.createHash('sha256').update(process.env.SHOPAIKEY_API_KEY || '').digest('hex');
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ base, model, group, jsonMode, tokenParameter, temperature, inputRate, outputRate, imageFee, requestFee, maxInputTokens, maxOutputTokens, reserveCents, budgetCents, keyHash, priceVersion: process.env.SHOPAIKEY_PRICING_SOURCE || '' })).digest('hex');
  const valid = base === SHOPAIKEY_BASE && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(model) && group.length > 0 && group.length <= 100 &&
    ['prompt', 'json_object'].includes(jsonMode) && ['max_tokens', 'max_completion_tokens'].includes(tokenParameter) &&
    inputRate > 0 && outputRate > 0 && Number.isSafeInteger(maxInputTokens) && maxInputTokens <= 2000000 && maxInputTokens >= maxOutputTokens &&
    Number.isFinite(imageFee) && imageFee >= 0 && Number.isFinite(requestFee) && requestFee >= 0 &&
    budgetCents > 0 && reserveCents > 0 && reserveCents <= budgetCents && upperBoundUsd > 0 && upperBoundUsd <= reserveCents / 100 &&
    (process.env.SHOPAIKEY_PRICING_SOURCE || '').startsWith('https://shopaikey.com/');
  return { base, model, group, jsonMode, tokenParameter, temperature, maxOutputTokens, inputRate, outputRate, imageFee, requestFee, maxInputTokens, upperBoundUsd, reserveCents, budgetCents, fingerprint, valid };
}
export function shopaikeyAvailability() {
  const c = shopaikeyConfig();
  const checked = Date.parse(process.env.SHOPAIKEY_PREFLIGHT_VERIFIED_AT || '');
  const balance = Number(process.env.SHOPAIKEY_BALANCE_USD);
  const ready = c.valid && !!process.env.SHOPAIKEY_API_KEY && Number.isFinite(balance) && balance >= c.budgetCents / 100 &&
    Number.isFinite(checked) && checked <= Date.now() && Date.now() - checked < 7 * 86400000 &&
    process.env.SHOPAIKEY_PREFLIGHT_APPROVED === 'true' && process.env.SHOPAIKEY_MODEL_ACCESS_VERIFIED === 'true' &&
    process.env.SHOPAIKEY_VISION_VERIFIED === 'true' && process.env.SHOPAIKEY_JSON_VERIFIED === 'true' &&
    process.env.SHOPAIKEY_PREFLIGHT_FINGERPRINT === c.fingerprint;
  return ready ? null : 'AI_CONFIGURATION_REQUIRED';
}
