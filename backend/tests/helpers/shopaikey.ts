import { shopaikeyConfig } from '../../services/shopaikeyConfig.ts';
/** Synthetic prices/model, never a claim about the live service. */
export function configureShop() {
  Object.assign(process.env, {
    AI_PROVIDER: 'shopaikey', SHOPAIKEY_API_KEY: 'synthetic-test-key', SHOPAIKEY_BASE_URL: '',
    SHOPAIKEY_MODEL_ID: 'test-vision', SHOPAIKEY_MODEL_GROUP: 'synthetic',
    SHOPAIKEY_INPUT_USD_PER_MILLION: '0.1', SHOPAIKEY_OUTPUT_USD_PER_MILLION: '0.4',
    SHOPAIKEY_MAX_INPUT_TOKENS: '128000', SHOPAIKEY_IMAGE_USD_PER_IMAGE: '0', SHOPAIKEY_REQUEST_FEE_USD: '0',
    SHOPAIKEY_REQUEST_RESERVE_USD: '0.05', SHOPAIKEY_BETA_BUDGET_USD: '3.00', SHOPAIKEY_BALANCE_USD: '4',
    SHOPAIKEY_PRICING_SOURCE: 'https://shopaikey.com/synthetic-test-fixture',
    SHOPAIKEY_JSON_MODE: 'prompt', SHOPAIKEY_TOKEN_PARAMETER: 'max_tokens', SHOPAIKEY_SEND_TEMPERATURE: 'false',
    SHOPAIKEY_PREFLIGHT_APPROVED: 'true', SHOPAIKEY_MODEL_ACCESS_VERIFIED: 'true',
    SHOPAIKEY_VISION_VERIFIED: 'true', SHOPAIKEY_JSON_VERIFIED: 'true',
    SHOPAIKEY_EVIDENCE_VERIFIED_AT: new Date().toISOString(), SHOPAIKEY_PREFLIGHT_VERIFIED_AT: new Date().toISOString(),
  });
  process.env.SHOPAIKEY_PREFLIGHT_FINGERPRINT = shopaikeyConfig().fingerprint;
}
