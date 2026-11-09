import type { ListingAiProvider } from './provider.ts';
import { shopaikeyConfig } from '../../services/shopaikeyConfig.ts';
import { listingPrompt } from '../../prompts/listingDraft.ts';
import { AppError } from '../../utils/errors.ts';

export const shopaikey: ListingAiProvider = {
  async generate(input, signal) {
    const c = shopaikeyConfig();
    if (!c.valid || !process.env.SHOPAIKEY_API_KEY) throw new AppError(503, 'AI_CONFIGURATION_REQUIRED', 'AI provider setup is incomplete.');
    const prompt = listingPrompt(input, input.categories);
    const response = await fetch(`${c.base}/chat/completions`, {
      method: 'POST', signal, redirect: 'error',
      headers: { Authorization: `Bearer ${process.env.SHOPAIKEY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: c.model, stream: false, [c.tokenParameter]: c.maxOutputTokens,
        ...(c.temperature ? { temperature: 0.1 } : {}),
        ...(c.jsonMode === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: [{ type: 'text', text: prompt.text }, ...input.images.map(bytes => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${bytes.toString('base64')}` } }))] }],
      }),
    });
    // Never expose upstream bodies: gateways can echo prompts, image data or credential details.
    if (!response.ok) {
      const code = response.status === 401 || response.status === 403 ? 'AI_PROVIDER_AUTH' : response.status === 402 ? 'AI_PROVIDER_BALANCE' : response.status === 429 ? 'AI_PROVIDER_RATE_LIMITED' : 'AI_UNAVAILABLE';
      await response.body?.cancel();
      throw new AppError(503, code, 'AI provider is unavailable. You can still publish manually.');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned an empty response.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength;
        if (size > 100000) { await reader.cancel(); throw new Error('oversized'); }
        chunks.push(next.value);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!Array.isArray(body.choices) || body.choices.length !== 1) throw new Error('choices');
      const choice = body.choices[0];
      if (choice.finish_reason !== 'stop' || typeof choice.message?.content !== 'string' || choice.message?.tool_calls?.length || choice.message?.refusal) throw new Error('incomplete');
      const output: unknown = JSON.parse(choice.message.content);
      const u = body.usage;
      const validUsage = u && Number.isSafeInteger(u.prompt_tokens) && u.prompt_tokens >= 0 && u.prompt_tokens <= c.maxInputTokens && Number.isSafeInteger(u.completion_tokens) && u.completion_tokens >= 0 && u.completion_tokens <= c.maxOutputTokens;
      return { output, usage: validUsage ? { inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens } : null };
    } catch (error) {
      if (signal.aborted) throw error;
      throw new AppError(502, 'AI_INVALID_OUTPUT', 'AI returned an invalid or incomplete draft.');
    } finally { reader.releaseLock(); }
  },
};
