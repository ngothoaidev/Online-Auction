import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const run = (overrides: Record<string, string | undefined> = {}) => spawnSync(process.execPath, ['scripts/ai-preflight.ts'], {
  encoding: 'utf8', env: { ...process.env, AI_MODEL_ID: 'amazon.nova-lite-v1:0', AWS_REGION: 'us-east-1', AI_INPUT_USD_PER_MILLION: '0.06', AI_OUTPUT_USD_PER_MILLION: '0.24', AI_CREDIT_EXPIRES_AT: new Date(Date.now() + 86400000).toISOString(), AI_CREDIT_VERIFIED_AT: new Date().toISOString(), AI_CREDIT_APPLIES: 'true', AI_MODEL_ACCESS_VERIFIED: 'true', AI_CREDIT_BALANCE_USD: '5', AI_PRICING_SOURCE: 'synthetic-test-fixture', ...overrides },
});
test('offline preflight computes a bound without inference and refuses insufficient evidence/cost', () => {
  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /"inferenceCalled": false/);
  for (const overrides of [{ AI_INPUT_USD_PER_MILLION: '100' }, { AI_CREDIT_APPLIES: 'false' }, { AI_CREDIT_BALANCE_USD: '1' }, { AI_CREDIT_EXPIRES_AT: '2020-01-01' }, { AI_MODEL_ID: 'different-model' }]) {
    assert.notEqual(run(overrides).status, 0);
  }
});
