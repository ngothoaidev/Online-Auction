import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Dialog } from './ui';
import SafeHtml from './SafeHtml';
import { assistantEvent, generateDraft, getCapabilities, plainTextHtml } from '../services/listingAssistant';
import type { ListingDraft } from '../services/listingAssistant';

type Field = 'title' | 'description' | 'categoryId';
type Values = Record<Field, string>;
type Photo = { file: File; preview: string };
export default function ListingAssistant({ photos, values, onApply, onDraftUsed, categories = [] }: {
  photos: Photo[]; values: Values; onApply: (field: Field, value: string) => void; onDraftUsed: (requestId: string) => void; categories?: { id: number; name: string }[];
}) {
  const caps = useQuery({ queryKey: ['listing-ai-capabilities'], queryFn: getCapabilities, retry: false, staleTime: 0 });
  const [notes, setNotes] = useState('');
  const [locale, setLocale] = useState('en');
  const [selection, setSelection] = useState<File[]>([]);
  const [manualSelection, setManualSelection] = useState(false);
  const [result, setResult] = useState<{ draft: ListingDraft; signature: string } | null>(null);
  const [history, setHistory] = useState<Partial<Record<Field, { before: string; applied: string }>>>({});
  const [confirm, setConfirm] = useState<{ field: Field; before: string; after: string } | null>(null);
  const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null);
  const request = useRef<{ signature: string; key: string } | null>(null);
  const selected = manualSelection ? selection.filter(f => photos.some(p => p.file === f)) : photos.slice(0, 3).map(p => p.file);
  // Each preview is a unique object URL created when a File is added to the form.
  const signature = JSON.stringify({ photos: photos.map(p => p.preview), selected: selected.map(f => photos.find(p => p.file === f)?.preview), notes, locale });
  const stale = result !== null && result.signature !== signature;
  const mutation = useMutation({
    mutationFn: async () => {
      controller.current?.abort();
      controller.current = new AbortController();
      if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
      const data = await generateDraft(selected, notes, locale, request.current!.key, controller.current.signal);
      return { draft: data, signature };
    },
    retry: false,
    onSuccess: data => { setResult(data); setHistory({}); setNotice('Draft ready. Review each field before applying.'); void caps.refetch(); },
  });
  useEffect(() => () => controller.current?.abort(), []);
  if (caps.isLoading) return <p className="mt-6 text-sm" role="status">Checking AI assistance availability…</p>;
  const unavailable = !caps.data?.enabled;
  const proposed = result ? { title: result.draft.draft.title, description: plainTextHtml(result.draft.draft.descriptionText), categoryId: result.draft.draft.categoryId?.toString() ?? '' } : null;
  const categoryName = (id: string) => categories.find(c => String(c.id) === id)?.name || 'Choose a category manually';
  const apply = (field: Field, after: string) => {
    setHistory(h => ({ ...h, [field]: { before: values[field], applied: after } }));
    onApply(field, after); setConfirm(null); setNotice(`${field} applied. You can edit it before publishing.`);
    onDraftUsed(result!.draft.requestId); void assistantEvent(result!.draft.requestId, 'applied');
  };
  return <section className="mt-6 rounded-(--radius-card) border border-(--line) bg-(--surface) p-5" aria-labelledby="ai-listing-title">
    <h2 id="ai-listing-title" className="text-lg font-semibold">AI listing assistant</h2>
    <p className="mt-2 text-sm">Generate an optional draft. Verify every detail; AI does not authenticate items. You can always publish manually.</p>
    {unavailable && <p role="status" className="mt-2 text-sm">AI assistance is currently unavailable ({caps.data?.reason || 'connection error'}).</p>}
    <fieldset className="mt-4" disabled={unavailable}>
      <legend className="text-sm">Choose 1–3 photos to analyse</legend>
      <div className="flex flex-wrap gap-3">{photos.map((p, i) => <label key={p.preview} className="flex items-center gap-2 p-2">
        <input type="checkbox" aria-label={`Analyse photo ${i + 1}`} checked={selected.includes(p.file)} disabled={!selected.includes(p.file) && selected.length >= 3} onChange={e => { setManualSelection(true); setSelection(e.target.checked ? [...selected, p.file] : selected.filter(f => f !== p.file)); }} />
        <img src={p.preview} alt={`Photo ${i + 1}`} className="h-14 w-14 rounded object-cover" />
      </label>)}</div>
      <label className="mt-3 block">Seller notes<textarea aria-label="Seller notes" maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block min-h-24 w-full rounded border border-(--line) bg-(--surface) p-3" placeholder="Known condition, defects, accessories and provenance…" /></label>
      <label className="mt-3 block">Draft language <select aria-label="Draft language" value={locale} onChange={e => setLocale(e.target.value)} className="ml-2 rounded border border-(--line) bg-(--surface) p-2"><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>
      <p className="my-3 text-sm">Generate sends the selected photos and notes to Amazon Bedrock. No request is sent until you click. {caps.data?.dailyRemaining ?? 0} calls remaining today.</p>
      <Button type="button" onClick={() => { setNotice(''); mutation.mutate(); }} disabled={mutation.isPending || selected.length < 1 || selected.length > 3}>{mutation.isPending ? 'Generating draft…' : 'Generate draft'}</Button>
    </fieldset>
    {mutation.isError && <p role="alert" className="mt-3 text-(--danger)">{mutation.error.message} Your listing form is unchanged.</p>}
    <p role="status" aria-live="polite" className="mt-2 text-sm">{notice}</p>
    {result && proposed && <div className="mt-4 space-y-4">
      {stale && <p role="alert">Photos, notes or language changed. Generate a new draft before applying.</p>}
      {(['title', 'description', 'categoryId'] as Field[]).map(field => <div key={field} className="rounded border border-(--line) p-3">
        <h3 className="font-semibold">{field === 'categoryId' ? 'Suggested category' : field === 'description' ? 'Suggested description' : 'Suggested title'}</h3>
        <p className="my-2 whitespace-pre-wrap">{field === 'description' ? result.draft.draft.descriptionText : field === 'categoryId' ? categoryName(proposed[field]) : proposed[field]}</p>
        <div className="flex gap-2"><Button type="button" disabled={stale || !proposed[field] || (field === 'categoryId' && !categories.some(c => String(c.id) === proposed[field]))} onClick={() => values[field] ? setConfirm({ field, before: values[field], after: proposed[field] }) : apply(field, proposed[field])}>Apply {field === 'categoryId' ? 'category' : field}</Button>
        {history[field] && <Button type="button" variant="secondary" disabled={values[field] !== history[field]!.applied} onClick={() => { onApply(field, history[field]!.before); setHistory(h => ({ ...h, [field]: undefined })); setNotice(`${field} restored.`); void assistantEvent(result.draft.requestId, 'undone'); }}>Undo {field === 'categoryId' ? 'category' : field}</Button>}</div>
      </div>)}
      <h3 className="font-semibold">Evidence to review</h3><ul className="list-disc pl-5">{result.draft.facts.map((f, i) => <li key={i}>{f.text} — {f.source === 'seller' ? 'Seller supplied' : `Photo ${(f.imageIndex ?? 0) + 1}`}</li>)}</ul>
      <h3 className="font-semibold">Information to add</h3><ul className="list-disc pl-5">{result.draft.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
      <h3 className="font-semibold">Warnings</h3><ul className="list-disc pl-5">{result.draft.warnings.map((q, i) => <li key={i}>{q}</li>)}</ul>
    </div>}
    <Dialog open={!!confirm} onClose={() => setConfirm(null)} title="Replace existing content?">
      {confirm && <><h3 className="font-semibold">Current</h3>{confirm.field === 'description' ? <SafeHtml html={confirm.before} /> : <p className="whitespace-pre-wrap break-words">{confirm.field === 'categoryId' ? categoryName(confirm.before) : confirm.before}</p>}<h3 className="mt-3 font-semibold">Suggested</h3>{confirm.field === 'description' ? <p className="whitespace-pre-wrap break-words">{result?.draft.draft.descriptionText}</p> : <p className="whitespace-pre-wrap break-words">{confirm.field === 'categoryId' ? categoryName(confirm.after) : confirm.after}</p>}<div className="mt-4 flex gap-2"><Button type="button" disabled={stale || values[confirm.field] !== confirm.before} onClick={() => apply(confirm.field, confirm.after)}>Replace content</Button><Button type="button" variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button></div></>}
    </Dialog>
  </section>;
}
