import { apiFetch } from './apiClient';
export type ListingDraft = {
  requestId: string; inputHash: string;
  draft: { title: string; descriptionText: string; categoryId: number | null };
  facts: { text: string; source: 'seller' | 'image'; imageIndex?: number }[];
  questions: string[]; warnings: string[];
};
export type Capabilities = { enabled: boolean; reason: string | null; dailyRemaining: number; maxImages: number; locales: string[] };
type Processing = { requestId: string; status: 'processing'; statusUrl: string };
export const getCapabilities = () => apiFetch<Capabilities>('/ai/listing-capabilities', { auth: 'required' });
export async function generateDraft(files: File[], notes: string, locale: string, key: string, signal: AbortSignal) {
  const body = new FormData();
  files.forEach(file => body.append('images', file));
  body.append('notes', notes); body.append('locale', locale);
  let result = await apiFetch<ListingDraft | Processing>('/ai/listing-draft', { method: 'POST', body, auth: 'required', signal, headers: { 'Idempotency-Key': key } });
  // Poll only the owner-authenticated status endpoint, never retry the paid command.
  for (let i = 0; 'status' in result && i < 30; i++) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 1000);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
    result = await apiFetch<ListingDraft | Processing>(`/ai/listing-draft/${result.requestId}`, { signal, auth: 'required' });
  }
  if ('status' in result) throw new Error('The draft is still processing. Try checking this request again.');
  return result;
}
export const assistantEvent = (id: string, event: 'applied' | 'undone' | 'published', auctionId?: number) =>
  apiFetch(`/ai/listing-draft/${id}/events`, { method: 'POST', body: { event, ...(auctionId ? { auctionId } : {}) }, auth: 'required' }).catch(() => {});
export function plainTextHtml(text: string) {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return text.split(/\n\s*\n/).map(p => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('');
}
