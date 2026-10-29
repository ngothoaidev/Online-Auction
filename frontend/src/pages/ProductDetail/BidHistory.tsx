import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import auctionService from '../../services/auctionService';
import { formatBidderName, formatTimeAgo } from '../../utils/format';
import { formatVnd } from '../../utils/money';
import { Button, Dialog, EmptyState, StatusBadge } from '../../components/ui';
import type { ApiError } from '../../services/apiClient';

const FILTERS = [['all', 'All'], ['mine', 'Mine'], ['recent', 'Last hour']];

/** Public price history as a real table. Removed bidders stay visible (marked), the seller moderates through a confirm dialog. */
export default function BidHistory({ productId, sellerId, refreshKey = 0, active = true, onChanged }) {
  const { user } = useAuth() ?? {};
  const me = user?.userId ?? user?.id;
  const [filter, setFilter] = useState('all');
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const [attempt, setAttempt] = useState(0);
  const [reject, setReject] = useState(null); // { row, pending, error }
  const rejectBtn = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: s.rows.length ? 'ready' : 'loading' }));
    auctionService.getBidHistory(productId, filter)
      .then((rows) => { if (!cancelled) setState({ status: 'ready', rows: Array.isArray(rows) ? rows : [] }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', rows: [] }); });
    return () => { cancelled = true; };
  }, [productId, filter, user, refreshKey, attempt]);

  const isSeller = me !== undefined && me === Number(sellerId);

  const confirmReject = async () => {
    setReject((r) => ({ ...r, pending: true, error: '' }));
    try {
      await auctionService.rejectBid(productId, reject.row.id);
      setReject(null);
      onChanged?.();
    } catch (error) {
      setReject((r) => ({ ...r, pending: false, error: (error as ApiError).message || 'Could not remove this bidder' }));
    }
  };

  return (
    <section aria-labelledby="bid-history-title" className="rounded-(--radius-card) border border-(--line) bg-(--surface) p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="bid-history-title" className="text-lg font-semibold text-(--ink)">Bid history</h2>
        <div role="group" aria-label="Filter bids" className="flex gap-2">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${filter === id ? 'border-(--ink) bg-(--ink) text-(--on-ink)' : 'border-(--input-border) text-(--ink) hover:bg-(--surface-hover)'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4" aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <p className="py-8 text-center text-sm text-(--muted)">Loading bid history…</p>}
        {state.status === 'error' && <EmptyState title="Bid history could not be loaded" action={<Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />}
        {state.status === 'ready' && state.rows.length === 0 && <EmptyState title="No bids yet">{filter === 'mine' ? 'You have not bid on this lot.' : 'Be the first to bid.'}</EmptyState>}
        {state.status === 'ready' && state.rows.length > 0 && (
          <div className="max-h-[480px] overflow-auto" tabIndex={0} role="region" aria-labelledby="bid-history-title">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Price changes, newest first</caption>
              <thead className="sticky top-0 bg-(--surface) text-(--muted)">
                <tr><th scope="col" className="py-2 pr-3 font-medium">When</th><th scope="col" className="py-2 pr-3 font-medium">Bidder</th><th scope="col" className="py-2 text-right font-medium">Price</th>{isSeller && active && <th scope="col" className="py-2 pl-3"><span className="sr-only">Actions</span></th>}</tr>
              </thead>
              <tbody className="divide-y divide-(--line)">
                {state.rows.map((row, i) => {
                  const mine = me !== undefined && row.bidderId === me;
                  const name = row.bidder?.fullName || row.bidder?.username || 'Bidder';
                  return (
                    <tr key={row.id} className={row.invalidated ? 'text-(--muted)' : ''}>
                      <td className="py-2.5 pr-3 align-top">{formatTimeAgo(row.bidTime)}</td>
                      <td className="py-2.5 pr-3 align-top">
                        {formatBidderName(name, mine)}
                        {i === 0 && !row.invalidated && <StatusBadge tone="brand" className="ml-2">Latest</StatusBadge>}
                        {row.invalidated && <StatusBadge tone="neutral" className="ml-2">Removed</StatusBadge>}
                      </td>
                      <td className={`font-lot py-2.5 text-right align-top font-semibold ${row.invalidated ? 'line-through' : 'text-(--ink)'}`}>{formatVnd(row.amount)}</td>
                      {isSeller && active && (
                        <td className="py-1 pl-3 text-right align-top">
                          {!row.invalidated && row.type !== 'buy_now' && (
                            <button type="button" ref={i === 0 ? rejectBtn : undefined} onClick={() => setReject({ row })} className="min-h-9 rounded-(--radius-control) px-2 text-sm font-semibold text-(--danger) hover:bg-(--danger-soft)">
                              Remove bidder{' '}<span className="sr-only">{name}</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(reject)} onClose={() => setReject(null)} pending={reject?.pending} title="Remove this bidder?" description="Their maximum stops counting, the price is recalculated from the remaining bidders, and they cannot bid on this lot again. The history stays visible.">
        {reject?.error && <p role="alert" className="mb-3 text-sm text-(--danger)">{reject.error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setReject(null)} disabled={reject?.pending}>Keep bidder</Button>
          <Button variant="danger" onClick={confirmReject} loading={reject?.pending}>Remove bidder</Button>
        </div>
      </Dialog>
    </section>
  );
}
