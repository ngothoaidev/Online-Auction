import { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { useNav } from '../hooks/useNavigate';
import ImageUploadModal from '../components/ImageUploadModal';
import RichTextEditor from '../components/RichTextEditor';
import auctionService from '../services/auctionService';
import { validateListing } from '../utils/listing';
import { formatVnd } from '../utils/money';
import { Button, Field, IconButton } from '../components/ui';
import type { ApiError } from '../services/apiClient';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import type { CategoryNode } from '../types/api';

type CreateForm = {
  title: string; description: string; categoryId: string; startingPrice: string; stepPrice: string; buyNowPrice: string;
  endTime: string; autoExtend: boolean; allowNewbies: boolean; images: { file: File; preview: string }[];
};

const Section = ({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) => (
  <fieldset className="rounded-(--radius-card) border border-(--line) bg-(--surface) p-5">
    <legend className="px-1 text-lg font-semibold text-(--ink)">{title}</legend>
    {hint && <p className="mb-4 text-sm text-(--muted)">{hint}</p>}
    <div className="space-y-4">{children}</div>
  </fieldset>
);

export default function CreateAuction() {
  const nav = useNav();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateForm>({ title: '', description: '', categoryId: '', startingPrice: '', stepPrice: '', buyNowPrice: '', endTime: '', autoExtend: true, allowNewbies: true, images: [] });
  const set = (k: keyof CreateForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  useEffect(() => {
    auctionService.getCategories().then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => setFormError('Categories could not be loaded. Refresh the page.'));
  }, []);

  const addImage = async (file: File) => setForm((f) => ({ ...f, images: [...f.images, { file, preview: URL.createObjectURL(file) }] }));
  const removeImage = (i: number) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const check = validateListing(form);
    setErrors(check.errors);
    if (!check.ok) {
      document.getElementById('listing-errors')?.focus();
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('title', check.value.title);
      payload.append('description', form.description);
      payload.append('categoryId', form.categoryId);
      payload.append('startingPrice', check.value.startingPrice);
      payload.append('stepPrice', check.value.stepPrice);
      payload.append('buyNowPrice', check.value.buyNowPrice ?? '');
      payload.append('endTime', check.value.endTime);
      payload.append('autoExtend', String(form.autoExtend));
      payload.append('allowNewbies', String(form.allowNewbies));
      form.images.forEach((img) => payload.append('images', img.file));
      await auctionService.create(payload);
      nav.home();
    } catch (err) {
      setFormError((err as ApiError).message || 'The listing could not be created.');
      document.getElementById('listing-errors')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const errorList = Object.values(errors);
  const summary = [
    ['Starting price', form.startingPrice ? formatVnd(form.startingPrice.replace(/\D/g, '')) : '—'],
    ['Bid step', form.stepPrice ? formatVnd(form.stepPrice.replace(/\D/g, '')) : '—'],
    ['Buy Now', form.buyNowPrice ? formatVnd(form.buyNowPrice.replace(/\D/g, '')) : 'Not offered'],
    ['Ends', form.endTime ? new Date(form.endTime).toLocaleString() : '—'],
    ['Photos', `${form.images.length} of 3–10`],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="tracking-tight text-3xl font-semibold text-(--ink)">Create a listing</h1>
      <p className="mt-1 text-(--muted)">Prices are whole amounts in ₫. Bids and the deadline cannot be changed after the first bid.</p>

      <div id="listing-errors" tabIndex={-1} role="alert" className="outline-none">
        {(formError || errorList.length > 0) && (
          <div className="mt-4 rounded-(--radius-control) bg-(--danger-soft) p-4 text-sm text-(--danger)">
            {formError && <p>{formError}</p>}
            {errorList.length > 0 && <><p className="font-semibold">Please fix {errorList.length} {errorList.length === 1 ? 'field' : 'fields'}:</p><ul className="ml-5 list-disc">{errorList.map((m) => <li key={m}>{m}</li>)}</ul></>}
          </div>
        )}
      </div>

      <form onSubmit={submit} noValidate className="mt-6 space-y-6">
        <Section title="Photos" hint="3 to 10 photos. The first one is the cover.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {form.images.map((img, i) => (
              <li key={img.preview} className="relative aspect-square overflow-hidden rounded-(--radius-control) border border-(--line)">
                <img src={img.preview} alt={`Photo ${i + 1}${i === 0 ? ' (cover)' : ''}`} className="h-full w-full object-cover" />
                <IconButton label={`Remove photo ${i + 1}`} onClick={() => removeImage(i)} className="absolute right-1 top-1 h-11 w-11 bg-(--surface)/90"><X size={16} /></IconButton>
              </li>
            ))}
            {form.images.length < 10 && (
              <li>
                <button type="button" onClick={() => setUploadOpen(true)} className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-(--radius-control) border-2 border-dashed border-(--input-border) text-(--ink) hover:bg-(--surface-hover)">
                  <Upload size={22} aria-hidden="true" /><span className="text-sm font-medium">Add photo</span>
                </button>
              </li>
            )}
          </ul>
          {errors.images && <p className="text-sm font-medium text-(--danger)">{errors.images}</p>}
        </Section>

        <Section title="Item details">
          <Field label="Title" error={errors.title}><input type="text" maxLength={255} value={form.title} onChange={set('title')} /></Field>
          <Field label="Category" error={errors.categoryId}>
            <select value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Choose a category</option>
              {categories.map((c) => (c.subcategories?.length
                ? <optgroup key={c.id} label={c.name}><option value={c.id}>{c.name} (general)</option>{c.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                : <option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </Field>
          <div>
            <p id="desc-label" className="mb-1.5 text-sm font-medium text-(--ink)">Description</p>
            <RichTextEditor labelledBy="desc-label" value={form.description} onChange={(html) => setForm((f) => ({ ...f, description: html }))} />
          </div>
        </Section>

        <Section title="Pricing" hint="Whole amounts in ₫. Bidders must beat the current price by at least the bid step.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Starting price (₫)" error={errors.startingPrice}><input inputMode="numeric" value={form.startingPrice} onChange={set('startingPrice')} /></Field>
            <Field label="Bid step (₫)" error={errors.stepPrice}><input inputMode="numeric" value={form.stepPrice} onChange={set('stepPrice')} /></Field>
            <Field label="Buy Now price (₫), optional" error={errors.buyNowPrice}><input inputMode="numeric" value={form.buyNowPrice} onChange={set('buyNowPrice')} /></Field>
          </div>
        </Section>

        <Section title="Timing and rules">
          <Field label="Ends at" hint="Your local time. At least 1 hour from now." error={errors.endTime}><input type="datetime-local" value={form.endTime} onChange={set('endTime')} /></Field>
          <label className="flex min-h-11 items-start gap-3 text-sm text-(--ink)"><input type="checkbox" className="mt-1 h-5 w-5" checked={form.autoExtend} onChange={set('autoExtend')} /><span><strong>Extend the deadline by 5 minutes</strong> when a bid arrives in the last 5 minutes.</span></label>
          <label className="flex min-h-11 items-start gap-3 text-sm text-(--ink)"><input type="checkbox" className="mt-1 h-5 w-5" checked={form.allowNewbies} onChange={set('allowNewbies')} /><span><strong>Allow bidders without reviews.</strong> Bidders with a rating below 80% are always excluded.</span></label>
        </Section>

        <section aria-labelledby="review-title" className="rounded-(--radius-card) border border-(--line) bg-(--surface-sunken) p-5">
          <h2 id="review-title" className="text-lg font-semibold text-(--ink)">Review before publishing</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {summary.map(([k, v]) => <div key={k} className="flex justify-between gap-3 text-sm"><dt className="text-(--muted)">{k}</dt><dd className="font-lot font-semibold text-(--ink)">{v}</dd></div>)}
          </dl>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => nav.back()} disabled={loading}>Cancel</Button>
          <Button type="submit" size="lg" loading={loading}>{loading ? 'Publishing…' : 'Publish listing'}</Button>
        </div>
      </form>

      <ImageUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={addImage} title="Add a photo" />
    </div>
  );
}
