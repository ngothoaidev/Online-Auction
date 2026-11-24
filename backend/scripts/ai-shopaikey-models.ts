// Authenticated discovery only. This script never invokes an inference endpoint.
import 'dotenv/config';
import { SHOPAIKEY_BASE } from '../services/shopaikeyConfig.ts';
try {
  if (!process.env.SHOPAIKEY_API_KEY) throw new Error('Missing SHOPAIKEY_API_KEY');
  const response = await fetch(`${SHOPAIKEY_BASE}/models`, {
    headers: { Authorization: `Bearer ${process.env.SHOPAIKEY_API_KEY}` },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Model discovery HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.data)) throw new Error('Invalid model list');
  const models = body.data.map((m: { id?: unknown }) => m.id).filter((id: unknown): id is string => typeof id === 'string');
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), models, inferenceCalled: false, note: 'Model IDs do not verify vision, JSON support, context, group, balance or effective prices.' }, null, 2));
} catch {
  console.error('ShopAIKey model discovery failed. Check key and connectivity; no inference was attempted.');
  process.exitCode = 1;
}
