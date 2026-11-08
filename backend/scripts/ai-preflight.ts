// Offline gate: no inference, credentials creation, cloud resources or paid API calls.
// Verify the evidence in the operator runbook before supplying these values.
import dotenv from 'dotenv';
dotenv.config();
const required = ['AI_INPUT_USD_PER_MILLION', 'AI_OUTPUT_USD_PER_MILLION', 'AI_CREDIT_EXPIRES_AT', 'AI_CREDIT_VERIFIED_AT', 'AI_PRICING_SOURCE', 'AI_CREDIT_BALANCE_USD'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
const inputRate = Number(process.env.AI_INPUT_USD_PER_MILLION);
const outputRate = Number(process.env.AI_OUTPUT_USD_PER_MILLION);
const expiry = Date.parse(process.env.AI_CREDIT_EXPIRES_AT!);
const creditVerified = Date.parse(process.env.AI_CREDIT_VERIFIED_AT!);
if (![inputRate, outputRate].every(n => Number.isFinite(n) && n > 0)) throw new Error('Rates must be positive verified USD prices.');
if (!(Number(process.env.AI_CREDIT_BALANCE_USD) >= 5)) throw new Error('At least $5 of applicable remaining credit must be confirmed for this beta.');
if (!Number.isFinite(expiry) || expiry <= Date.now() || !Number.isFinite(creditVerified) || creditVerified > Date.now() || Date.now() - creditVerified > 86400000) throw new Error('Verify current applicable credits and expiry first.');
if (process.env.AI_MODEL_ID && process.env.AI_MODEL_ID !== 'amazon.nova-lite-v1:0') throw new Error('Unreviewed model; do not silently switch.');
if (process.env.AWS_REGION && process.env.AWS_REGION !== 'us-east-1') throw new Error('Unreviewed region.');
// Conservative bound: the full Nova Lite v1 context, not a character/token approximation.
// Operator must verify the model context/pricing against the linked official model card.
const maximumInputTokens = 300000, maximumOutputTokens = 2048;
const upperBoundUsd = (maximumInputTokens * inputRate + maximumOutputTokens * outputRate) / 1000000;
if (upperBoundUsd > 0.05) throw new Error('Worst-case call exceeds approved $0.05 reserve. Keep feature disabled.');
if (process.env.AI_CREDIT_APPLIES !== 'true' || process.env.AI_MODEL_ACCESS_VERIFIED !== 'true') throw new Error('Credit applicability and model access must be explicitly verified.');
const report = { model: 'amazon.nova-lite-v1:0', region: 'us-east-1', checkedAt: new Date().toISOString(), creditExpiresAt: new Date(expiry).toISOString(), pricingSource: process.env.AI_PRICING_SOURCE, maximumInputTokens, maximumOutputTokens, upperBoundUsd, reserveUsd: 0.05, betaBudgetUsd: 5, inferenceCalled: false };
console.log(JSON.stringify(report, null, 2));
console.log('After confirming this evidence, configure AI_PREFLIGHT_APPROVED=true and AI_PREFLIGHT_VERIFIED_AT=' + report.checkedAt + '. This script does not enable AI or prove account access.');
