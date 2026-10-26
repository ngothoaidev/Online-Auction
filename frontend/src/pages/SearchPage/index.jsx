import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import AuctionCard from '../../components/AuctionCard';
import Pagination from '../../components/Pagination.jsx';
import FilterPanel from './FilterPanel.jsx';
import { Button, Dialog, EmptyState, Skeleton } from '../../components/ui';
import { apiFetch, isAbort } from '../../services/apiClient.js';

const FILTER_KEYS = ['category', 'minPrice', 'maxPrice', 'sortBy'];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [state, setState] = useState({ status: 'loading', items: [], totalPages: 1, totalItems: 0 });
  const [attempt, setAttempt] = useState(0);

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const paramString = searchParams.toString();

  useEffect(() => {
    apiFetch('/categories', { auth: 'none' }).then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // One request per URL state; an older response can never overwrite a newer one (AbortController).
  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    apiFetch(`/search?${paramString}`, { signal: controller.signal })
      .then((res) => { if (!controller.signal.aborted) setState({ status: 'ready', items: res.data ?? [], totalPages: res.metadata?.totalPages ?? 1, totalItems: res.metadata?.totalItems ?? 0 }); })
      .catch((error) => { if (!controller.signal.aborted && !isAbort(error)) setState({ status: 'error', items: [], totalPages: 1, totalItems: 0, message: error.message }); });
    return () => controller.abort();
  }, [paramString, attempt]);

  const apply = useCallback((draft) => {
    const next = new URLSearchParams(searchParams);
    FILTER_KEYS.forEach((k) => { if (draft[k]) next.set(k, draft[k]); else next.delete(k); });
    next.delete('page'); // a new filter always starts at page 1
    setSearchParams(next);
    setFiltersOpen(false);
  }, [searchParams, setSearchParams]);

  const reset = useCallback(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    setSearchParams(next);
    setFiltersOpen(false);
  }, [query, setSearchParams]);

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  };

  const heading = query ? `Results for “${query}”` : category || 'All lots';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="text-sm text-(--muted)">
        <Link to="/" className="hover:underline">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page" className="text-(--ink)">Search</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="tracking-tight text-3xl font-semibold text-(--ink)">{heading}</h1>
        <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} aria-hidden="true" /> Filters</Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 rounded-(--radius-card) border border-(--line) bg-(--surface) p-4">
            <FilterPanel params={searchParams} categories={categories} onApply={apply} onReset={reset} idPrefix="side" />
          </div>
        </aside>

        <section aria-live="polite" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
              <span className="sr-only">Loading lots</span>
            </div>
          )}
          {state.status === 'error' && (
            <EmptyState title="Search failed" action={<Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}>{state.message || 'Please try again.'}</EmptyState>
          )}
          {state.status === 'ready' && state.items.length === 0 && (
            <EmptyState title="No lots match" action={<Button variant="secondary" onClick={reset}>Clear filters</Button>}>Try a broader search or remove a filter.</EmptyState>
          )}
          {state.status === 'ready' && state.items.length > 0 && (
            <>
              <p className="mb-4 text-sm text-(--muted)">{state.totalItems} {state.totalItems === 1 ? 'lot' : 'lots'}</p>
              <h2 className="sr-only">Results</h2>{/* cards are h3: keep the heading outline h1 -> h2 -> h3 */}
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {state.items.map((item) => <li key={item.id} className="flex"><AuctionCard product={item} /></li>)}
              </ul>
              <Pagination currentPage={page} totalPages={state.totalPages} onPageChange={goToPage} />
            </>
          )}
        </section>
      </div>

      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" variant="drawer">
        <FilterPanel params={searchParams} categories={categories} onApply={apply} onReset={reset} idPrefix="dlg" />
      </Dialog>
    </div>
  );
}
