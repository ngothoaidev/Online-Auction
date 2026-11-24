import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { shopaikey } from '../../adapters/ai/shopaikey.ts';
import { shopaikeyAvailability, shopaikeyConfig } from '../../services/shopaikeyConfig.ts';
import { configureShop } from '../helpers/shopaikey.ts';
const input = { notes: 'Seller notes', locale: 'en' as const, images: [Buffer.from('image')], categories: [] };
const completion = (extra = {}) => ({ choices: [{ finish_reason: 'stop', message: { content: '{"draft":{}}' } }], usage: { prompt_tokens: 100, completion_tokens: 20 }, ...extra });
test('ShopAIKey approval binds key, model, group and effective prices; unsafe bounds fail closed', () => {
  const saved = { ...process.env };
  try {
    configureShop(); assert.equal(shopaikeyAvailability(), null);
    delete process.env.AWS_BEARER_TOKEN_BEDROCK; assert.equal(shopaikeyAvailability(), null);
    for (const [key, value] of Object.entries({ SHOPAIKEY_API_KEY: 'changed', SHOPAIKEY_MODEL_ID: 'changed', SHOPAIKEY_MODEL_GROUP: 'changed', SHOPAIKEY_INPUT_USD_PER_MILLION: '1', SHOPAIKEY_IMAGE_USD_PER_IMAGE: '', SHOPAIKEY_REQUEST_FEE_USD: '', SHOPAIKEY_BASE_URL: 'https://example.com/v1', SHOPAIKEY_BALANCE_USD: '1', SHOPAIKEY_PREFLIGHT_VERIFIED_AT: '2020-01-01' })) {
      configureShop(); process.env[key] = value; assert.equal(shopaikeyAvailability(), 'AI_CONFIGURATION_REQUIRED', key);
    }
    configureShop(); process.env.SHOPAIKEY_BETA_BUDGET_USD = '100'; assert.equal(shopaikeyConfig().budgetCents, 300);
  } finally { process.env = saved; }
});
test('ShopAIKey sends private JPEG bytes once, limits tokens and preserves missing usage as unknown', async () => {
  const saved = { ...process.env }, original = globalThis.fetch;
  try {
    configureShop(); let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++; assert.equal(url, 'https://api.shopaikey.com/v1/chat/completions'); assert.equal(init?.redirect, 'error');
      const body = JSON.parse(String(init?.body)); assert.equal(body.max_tokens, 2048); assert.equal(body.stream, false);
      assert.match(body.messages[1].content[1].image_url.url, /^data:image\/jpeg;base64,/);
      assert.equal(body.response_format, undefined);
      return Response.json(completion(calls === 2 ? { usage: undefined } : {}));
    };
    assert.deepEqual((await shopaikey.generate(input, new AbortController().signal)).usage, { inputTokens: 100, outputTokens: 20 });
    assert.equal((await shopaikey.generate(input, new AbortController().signal)).usage, null);
    assert.equal(calls, 2);
  } finally { process.env = saved; globalThis.fetch = original; }
});
test('ShopAIKey rejects truncation, malformed/oversized output, tools and provider errors without retry or body disclosure', async () => {
  const saved = { ...process.env }, original = globalThis.fetch;
  try {
    configureShop();
    for (const response of [Response.json(completion({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] })), Response.json(completion({ choices: [{ finish_reason: 'stop', message: { content: '{}', tool_calls: [{}] } }] })), Response.json({ choices: [] }), new Response('not json'), new Response('x'.repeat(100001)), ...[401, 402, 403, 429, 500].map(status => new Response('secret-key-and-notes', { status }))]) {
      let calls = 0; globalThis.fetch = async () => { calls++; return response; };
      await assert.rejects(shopaikey.generate(input, new AbortController().signal), error => { assert.doesNotMatch(String(error), /secret-key-and-notes/); return true; });
      assert.equal(calls, 1);
    }
  } finally { process.env = saved; globalThis.fetch = original; }
});
test('ShopAIKey offline preflight requires evidence and produces a configuration fingerprint', () => {
  const saved = { ...process.env };
  try {
    configureShop();
    const run = () => spawnSync(process.execPath, ['scripts/ai-shopaikey-preflight.ts'], { env: process.env, encoding: 'utf8' });
    assert.equal(run().status, 0); assert.match(run().stdout, /SHOPAIKEY_PREFLIGHT_FINGERPRINT=/);
    process.env.SHOPAIKEY_VISION_VERIFIED = 'false'; assert.notEqual(run().status, 0);
  } finally { process.env = saved; }
});
