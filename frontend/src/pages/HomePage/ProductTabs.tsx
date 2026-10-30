import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AuctionCard from '../../components/AuctionCard';
import { EmptyState, Skeleton, Button } from '../../components/ui';
import auctionService from '../../services/auctionService';
import { searchUrl, TAB_SEARCH_SORT } from '../../utils/searchUrl';
import type { CatalogAuction } from '../../types/api';
import { loadStatus } from '../../services/queries';

const TABS = [
  { id: 'endingSoon', label: 'Ending soon' },
  { id: 'mostBids', label: 'Most active' },
  { id: 'highestPrice', label: 'Highest price' },
];

/** The three buttons filter the SAME list (aria-pressed), so they are toggle buttons rather than a tablist. */
export default function ProductTabs() {
  const [activeTab, setActiveTab] = useState('endingSoon');
  const query = useQuery({ queryKey: ['auctions', 'top', activeTab, 5], queryFn: () => auctionService.getTopAuctions({ sortBy: activeTab, limit: 5 }) });
  const state = {
    status: loadStatus(query),
    items: (Array.isArray(query.data) ? query.data : []) as CatalogAuction[],
  };

  const label = TABS.find((t) => t.id === activeTab)?.label ?? '';

  return (
    <section aria-labelledby="featured-lots" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="featured-lots" className="tracking-tight text-3xl font-semibold text-(--ink)">Lots to watch</h2>
        <div role="group" aria-label="Sort lots" className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${activeTab === tab.id ? 'border-(--ink) bg-(--ink) text-(--on-ink)' : 'border-(--input-border) bg-(--surface) text-(--ink) hover:bg-(--surface-hover)'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6" aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
            <span className="sr-only">Loading lots</span>
          </div>
        )}
        {state.status === 'error' && (
          <EmptyState title="Lots could not be loaded" action={<Button onClick={() => query.refetch()}>Try again</Button>}>Check your connection and try again.</EmptyState>
        )}
        {state.status === 'ready' && state.items.length === 0 && (
          <EmptyState title="No lots yet" action={<Link className="font-semibold text-(--brand) underline" to="/search">Browse all lots</Link>}>Nothing is open for bidding right now.</EmptyState>
        )}
        {state.status === 'ready' && state.items.length > 0 && (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {state.items.map((item) => <li key={item.id} className="flex"><AuctionCard product={item} /></li>)}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <Link to={searchUrl({ sortBy: TAB_SEARCH_SORT[activeTab] })} className="inline-flex min-h-11 items-center gap-2 font-semibold text-(--brand) hover:underline">
          View all lots · {label} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
