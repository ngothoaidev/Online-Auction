import type { ListingAiProvider } from './provider.ts';
// Non-production only. Fault controls are server env, never user input.
export const fake: ListingAiProvider = {
  async generate(input, signal) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, Number(process.env.AI_FAKE_DELAY_MS || 0));
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); }, { once: true });
    });
    if (process.env.AI_FAKE_MODE === 'error') throw new Error('fake provider failure');
    if (process.env.AI_FAKE_MODE === 'invalid') return { output: {}, usage: { inputTokens: 1, outputTokens: 1 } };
    const vi = input.locale === 'vi';
    return { output: { draft: { title: vi ? 'Vật phẩm do người bán cung cấp' : 'Seller-described collectible', descriptionText: vi ? `Theo người bán: ${input.notes || 'Chưa cung cấp thông tin tình trạng.'}` : `Seller reports: ${input.notes || 'Condition details not supplied.'}`, categoryId: input.categories[0]?.id ?? null }, facts: input.notes ? [{ text: input.notes.slice(0, 400), source: 'seller' }] : [], questions: [vi ? 'Có phụ kiện hoặc giấy tờ đi kèm không?' : 'Are accessories or documents included?'], warnings: [vi ? 'Hãy xác nhận thông tin trước khi đăng.' : 'Verify all details before publishing.'] }, usage: { inputTokens: 100, outputTokens: 100 } };
  },
};
