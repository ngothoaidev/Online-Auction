import type { ListingAiProvider } from './provider.ts';
import { listingPrompt } from '../../prompts/listingDraft.ts';
import { aiConfig } from '../../services/aiConfig.ts';
import { AppError } from '../../utils/errors.ts';

export const bedrock: ListingAiProvider = {
  async generate(input, signal) {
    const c = aiConfig();
    const prompt = listingPrompt(input, input.categories);
    const response = await fetch(`https://bedrock-runtime.${c.region}.amazonaws.com/model/${encodeURIComponent(c.model)}/converse`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}` },
      body: JSON.stringify({ system: [{ text: prompt.system }], messages: [{ role: 'user', content: [{ text: prompt.text }, ...input.images.map(bytes => ({ image: { format: 'jpeg', source: { bytes: bytes.toString('base64') } } }))] }], inferenceConfig: { maxTokens: 2048, temperature: 0.1 } }),
    });
    // Do not read/log provider error bodies: they can contain seller input and credential details.
    if (!response.ok) throw new AppError(503, 'AI_UNAVAILABLE', 'AI provider is unavailable. Please use manual listing.');
    const raw = await response.text();
    if (raw.length > 100000) throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned an invalid draft.');
    try {
      const body = JSON.parse(raw);
      if (body.stopReason !== 'end_turn') throw new Error('incomplete');
      const content = body.output?.message?.content;
      if (!Array.isArray(content) || content.some(b => typeof b.text !== 'string')) throw new Error('non-text');
      return { output: JSON.parse(content.map(b => b.text).join('')), usage: { inputTokens: Number(body.usage?.inputTokens) || 0, outputTokens: Number(body.usage?.outputTokens) || 0 } };
    } catch { throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned an invalid draft. Please write the listing manually.'); }
  },
};
