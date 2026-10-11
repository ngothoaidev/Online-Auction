import { useState, useEffect } from 'react';
import { Button, Field } from '../../components/ui';

export const SORT_OPTIONS = [
  ['', 'Best match'],
  ['timeEndingSoon', 'Ending soon'],
  ['timeNewlyListed', 'Newly listed'],
  ['priceLowToHigh', 'Price: low to high'],
  ['priceHighToLow', 'Price: high to low'],
  ['popularity', 'Most bids'],
  ['aToZ', 'Title A to Z'],
];

/** Category / price / sort form. State lives in the URL; Apply writes it and resets paging. */
export default function FilterPanel({ params, categories, onApply, onReset, idPrefix = 'f' }) {
  const [draft, setDraft] = useState({ category: '', minPrice: '', maxPrice: '', sortBy: '' });
  const key = params.toString();

  useEffect(() => {
    setDraft({
      category: params.get('category') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      sortBy: params.get('sortBy') || '',
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const wholeOrEmpty = (v) => v === '' || /^\d{1,15}$/.test(v);
  const priceError = !wholeOrEmpty(draft.minPrice) || !wholeOrEmpty(draft.maxPrice) ? 'Use whole numbers only'
    : draft.minPrice && draft.maxPrice && BigInt(draft.minPrice) > BigInt(draft.maxPrice) ? 'Minimum is above the maximum' : '';

  const submit = (e) => {
    e.preventDefault();
    if (priceError) return;
    onApply(draft);
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Filter lots" id={`${idPrefix}-form`}>
      <Field label="Category">
        <select value={draft.category} onChange={set('category')}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.name}>All {c.name}</option>
              {(c.subcategories ?? []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min price (₫)" error={priceError && !wholeOrEmpty(draft.minPrice) ? priceError : ''}>
          <input inputMode="numeric" value={draft.minPrice} onChange={set('minPrice')} placeholder="0" />
        </Field>
        <Field label="Max price (₫)" error={priceError}>
          <input inputMode="numeric" value={draft.maxPrice} onChange={set('maxPrice')} placeholder="Any" />
        </Field>
      </div>
      <Field label="Sort by">
        <select value={draft.sortBy} onChange={set('sortBy')}>
          {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={Boolean(priceError)}>Apply</Button>
        <Button type="button" variant="secondary" onClick={onReset}>Reset</Button>
      </div>
    </form>
  );
}
