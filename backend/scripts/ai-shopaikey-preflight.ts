// Offline evidence gate. Never calls an inference endpoint or enables the feature.
import 'dotenv/config';
import { shopaikeyConfig } from '../services/shopaikeyConfig.ts';
const c = shopaikeyConfig();
const verified = Date.parse(process.env.SHOPAIKEY_EVIDENCE_VERIFIED_AT || '');
if (!c.valid || !process.env.SHOPAIKEY_API_KEY) throw new Error('Missing or unsafe ShopAIKey model/group/pricing configuration.');
if (!Number.isFinite(verified) || verified > Date.now() || Date.now() - verified > 86400000) throw new Error('Verify current balance, group, prices and model context first.');
if (!(Number(process.env.SHOPAIKEY_BALANCE_USD) >= c.budgetCents / 100)) throw new Error('Insufficient verified balance.');
for (const key of ['SHOPAIKEY_MODEL_ACCESS_VERIFIED', 'SHOPAIKEY_VISION_VERIFIED', 'SHOPAIKEY_JSON_VERIFIED']) {
  if (process.env[key] !== 'true') throw new Error(`Verify ${key} first. A model list is insufficient evidence.`);
}
const checkedAt = new Date().toISOString();
console.log(JSON.stringify({ model: c.model, group: c.group, maximumInputTokens: c.maxInputTokens, maximumOutputTokens: c.maxOutputTokens, upperBoundUsd: c.upperBoundUsd, reserveUsd: c.reserveCents / 100, betaBudgetUsd: c.budgetCents / 100, pricingSource: process.env.SHOPAIKEY_PRICING_SOURCE, checkedAt, inferenceCalled: false }, null, 2));
console.log(`SHOPAIKEY_PREFLIGHT_FINGERPRINT=${c.fingerprint}\nSHOPAIKEY_PREFLIGHT_VERIFIED_AT=${checkedAt}\nSHOPAIKEY_PREFLIGHT_APPROVED=true`);
