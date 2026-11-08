import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { startApp } from '../helpers/app.ts';
import type { TestApp } from '../helpers/app.ts';
import { aiTempDir } from '../../services/aiImages.ts';
let app: TestApp, seller: number, other: number, token: string, otherToken: string, buyerToken: string, unverifiedToken: string, image: Buffer;
before(async () => {
  app = await startApp({ AI_LISTING_ENABLED: 'true', AI_PROVIDER: 'fake', AI_BETA_SELLER_IDS: '1,2', AI_TEST_RATE_LIMIT: '1000' });
  const user = await app.createUser('ai_seller', { role: 'seller' }); seller = user.id; token = await app.tokenFor(user);
  const second = await app.createUser('ai_second', { role: 'seller' }); other = second.id; otherToken = await app.tokenFor(second);
  buyerToken = await app.tokenFor(await app.createUser('ai_buyer'));
  unverifiedToken = await app.tokenFor(await app.createUser('ai_unverified', { role: 'seller', isVerified: false }));
  process.env.AI_BETA_SELLER_IDS = `${seller},${other}`;
  await app.sql`INSERT INTO categories (name) VALUES ('Watches')`;
  image = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#888888' } }).png().toBuffer();
});
beforeEach(async () => {
  await app.sql`TRUNCATE ai_draft_requests, ai_daily_quota, ai_beta_budget`;
  Object.assign(process.env, { AI_PROVIDER: 'fake', AI_LISTING_ENABLED: 'true', AI_DAILY_LIMIT: '5', AI_FAKE_MODE: '', AI_FAKE_DELAY_MS: '0', AI_TIMEOUT_MS: '25000', AI_BETA_BUDGET_USD: '5', NODE_ENV: 'test' });
});
after(async () => { await app.stop(); });
const send = async ({ key = crypto.randomUUID(), who = token, photo = image, notes = 'Used, scratches on bracelet', locale = 'en', photos = 1 } = {}) => {
  const fd = new FormData(); fd.append('notes', notes); fd.append('locale', locale);
  for (let i = 0; i < photos; i++) fd.append('images', new Blob([new Uint8Array(photo)], { type: 'image/png' }), 'item.png');
  const response = await fetch(`${app.base}/ai/listing-draft`, { method: 'POST', headers: { ...(who ? { Authorization: `Bearer ${who}` } : {}), 'Idempotency-Key': key }, body: fd });
  return { status: response.status, body: await response.json() };
};
test('AI requires authentication, verified seller, allowlist, and refuses fake in production', async () => {
  assert.equal((await send({ who: '' })).status, 401);
  assert.equal((await send({ who: buyerToken })).status, 403);
  assert.equal((await send({ who: unverifiedToken })).status, 403);
  process.env.AI_BETA_SELLER_IDS = String(other);
  assert.equal((await send()).status, 403);
  process.env.AI_BETA_SELLER_IDS = `${seller},${other}`;
  process.env.NODE_ENV = 'production';
  assert.equal((await send()).status, 503);
});
test('drafts are private, validated, replayed once and do not create an auction', async () => {
  const key = crypto.randomUUID();
  const first = await send({ key, locale: 'vi' });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.match(first.body.draft.title, /Vật phẩm/);
  assert.deepEqual(await send({ key, locale: 'vi' }), first);
  assert.equal((await send({ key, locale: 'en' })).status, 409);
  const mine = await app.call('GET', `/ai/listing-draft/${first.body.requestId}`, { token });
  assert.equal(mine.status, 200);
  assert.equal((await app.call('GET', `/ai/listing-draft/${first.body.requestId}`, { token: otherToken })).status, 404);
  assert.equal(Number((await app.sql`SELECT count(*) FROM auctions`)[0].count), 0);
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 5);
  assert.equal((await app.sql`SELECT used FROM ai_daily_quota`)[0].used, 1);
});
test('three photos plus both fields fit the multipart parser and are decoded sequentially', async () => {
  const result = await send({ photos: 3 });
  assert.equal(result.status, 200, JSON.stringify(result.body));
});
test('duplicate in-flight requests return 202 without duplicate provider reservation', async () => {
  process.env.AI_FAKE_DELAY_MS = '250';
  const key = crypto.randomUUID();
  const results = await Promise.all([send({ key }), send({ key })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 202]);
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 5);
});
test('image errors are rejected before paid quota and all temporary uploads are cleaned', async () => {
  assert.equal((await send({ photo: Buffer.from('not an image') })).status, 415);
  assert.equal((await send({ photos: 4 })).status, 400);
  assert.equal((await send({ photo: Buffer.alloc(5 * 1024 * 1024 + 1) })).status, 413);
  const big = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: '#333333' } }).png().toBuffer();
  assert.equal((await send({ photo: big })).status, 415);
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 0);
  // Cleanup runs after responses; allow the file unlink callback to finish.
  await new Promise(r => setTimeout(r, 50));
  assert.deepEqual(await fs.readdir(aiTempDir()), []);
});
test('daily quota and global beta budget cannot be expanded by config', async () => {
  process.env.AI_DAILY_LIMIT = '1';
  assert.equal((await send()).status, 200);
  assert.equal((await send()).body.code, 'AI_RATE_LIMITED');
  process.env.AI_DAILY_LIMIT = '5';
  await app.sql`UPDATE ai_beta_budget SET reserved_cents=500`;
  assert.equal((await send({ who: otherToken })).body.code, 'AI_BUDGET_EXHAUSTED');
  assert.equal((await app.call('GET', '/ai/listing-capabilities', { token })).body.enabled, false);
});
test('slot claims serialize across sellers and provider failures retain reservation', async () => {
  process.env.AI_MAX_CONCURRENCY = '1'; process.env.AI_FAKE_DELAY_MS = '250';
  const results = await Promise.all([send(), send({ who: otherToken })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 429]);
  process.env.AI_MAX_CONCURRENCY = '2'; process.env.AI_FAKE_MODE = 'error';
  assert.equal((await send()).body.code, 'AI_UNAVAILABLE');
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 10);
});
test('concurrent last-budget claims reserve only one paid call', async () => {
  await app.sql`INSERT INTO ai_beta_budget (id,limit_cents,reserved_cents) VALUES (1,500,495)`;
  process.env.AI_FAKE_DELAY_MS = '100';
  const results = await Promise.all([send(), send({ who: otherToken })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 429]);
  assert.equal(results.find(r => r.status === 429)!.body.code, 'AI_BUDGET_EXHAUSTED');
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 500);
  assert.equal((await app.sql`SELECT sum(used) AS n FROM ai_daily_quota`)[0].n, '1');
});
test('timeouts become terminal and the same key is never automatically called again', async () => {
  process.env.AI_TIMEOUT_MS = '10'; process.env.AI_FAKE_DELAY_MS = '100';
  const key = crypto.randomUUID();
  assert.equal((await send({ key })).body.code, 'AI_TIMEOUT');
  assert.equal((await send({ key })).body.code, 'AI_TIMEOUT');
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 5);
});
test('invalid provider output is rejected and expired results become tombstones', async () => {
  process.env.AI_FAKE_MODE = 'invalid';
  assert.equal((await send()).body.code, 'AI_INVALID_OUTPUT');
  process.env.AI_FAKE_MODE = '';
  const key = crypto.randomUUID(); const first = await send({ key });
  await app.sql`UPDATE ai_draft_requests SET expires_at=now()-interval '1 second' WHERE id=${first.body.requestId}`;
  assert.equal((await send({ key })).status, 410);
  assert.equal((await app.call('GET', `/ai/listing-draft/${first.body.requestId}`, { token })).status, 410);
  assert.equal((await app.sql`SELECT result FROM ai_draft_requests WHERE id=${first.body.requestId}`)[0].result, null);
});
test('disabled or unverified Bedrock configuration makes no provider call', async () => {
  process.env.AI_PROVIDER = 'bedrock';
  assert.equal((await send()).body.code, 'AI_CONFIGURATION_REQUIRED');
  process.env.AI_LISTING_ENABLED = 'false';
  assert.equal((await send()).body.code, 'AI_DISABLED');
  assert.equal(Number((await app.sql`SELECT count(*) FROM ai_draft_requests`)[0].count), 0);
});
test('worker marks stale paid calls unknown and keeps their reserve', async () => {
  const first = await send();
  await app.sql`UPDATE ai_draft_requests SET status='running',lease_until=now()-interval '1 second' WHERE id=${first.body.requestId}`;
  const result = await app.call('GET', `/ai/listing-draft/${first.body.requestId}`, { token });
  assert.equal(result.status, 504);
  assert.equal(result.body.code, 'AI_OUTCOME_UNKNOWN');
  assert.equal((await app.sql`SELECT reserved_cents FROM ai_beta_budget`)[0].reserved_cents, 5);
});
