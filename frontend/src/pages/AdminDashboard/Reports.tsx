import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../services/apiClient';
import { loadStatus } from '../../services/queries';
import { Button, EmptyState, Skeleton, StatusBadge } from '../../components/ui';
import { useFeedback } from '../../components/ui/Feedback';
import { formatTimeAgo } from '../../utils/format';
import type { ApiError } from '../../services/apiClient';
import type { Tone } from '../../components/ui/StatusBadge';
import type { ReportRow } from '../../types/api';

const FILTERS = [['open', 'Open'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed'], ['all', 'All']];
const REASONS: Record<string, string> = { counterfeit: 'Counterfeit', prohibited: 'Prohibited item', misleading: 'Misleading', offensive: 'Offensive', other: 'Other' };
const TONE: Record<string, Tone> = { open: 'warning', actioned: 'danger', dismissed: 'neutral' };

/** Listing reports. A decision closes every open report of that lot; cancelling goes through the listing domain command. */
export default function Reports() {
  const { confirm, notify } = useFeedback();
  const [status, setStatus] = useState('open');
  const [busy, setBusy] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: () => apiFetch<{ items: ReportRow[] }>(`/admin/reports?status=${status}`, { auth: 'required' }),
  });
  const load = loadStatus(query);
  const state = { loading: load === 'loading', error: load === 'error', items: query.data?.items ?? [] };

  const resolve = async (report: ReportRow, action: 'dismiss' | 'cancel_listing') => {
    const cancel = action === 'cancel_listing';
    const decision = await confirm({
      title: cancel ? 'Cancel this listing?' : 'Dismiss these reports?',
      message: cancel
        ? `"${report.lotTitle}" stops accepting bids. Bids and history are kept, the leading bidder is notified, and every open report on this lot is closed.`
        : `Every open report on "${report.lotTitle}" is closed. The listing is not changed.`,
      confirmLabel: cancel ? 'Cancel listing' : 'Dismiss',
      tone: cancel ? 'danger' : 'primary',
      reason: { label: 'Decision note', required: true },
    });
    if (!decision) return;
    setBusy(report.id);
    try {
      const r = await apiFetch(`/admin/reports/${report.id}/resolve`, {
        method: 'POST', auth: 'required', body: { action, note: decision.reason }, headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      notify(r.message);
      await query.refetch();
    } catch (err) {
      notify((err as ApiError).message || 'Could not resolve the report', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="reports-title" className="space-y-4">
      <div>
        <h1 id="reports-title" className="text-2xl font-semibold text-(--ink)">Listing reports</h1>
        <p className="text-sm text-(--muted)">Reports from users. Every decision is recorded in the audit log with your note.</p>
      </div>
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Button key={value} size="sm" variant={status === value ? 'primary' : 'secondary'} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</Button>
        ))}
      </div>

      {state.loading && <div aria-busy="true" className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
      {!state.loading && state.error && <EmptyState title="Reports could not be loaded" action={<Button onClick={() => query.refetch()}>Try again</Button>} />}
      {!state.loading && !state.error && state.items.length === 0 && <EmptyState title="No reports here">Nothing to review for this filter.</EmptyState>}
      {!state.loading && !state.error && state.items.length > 0 && (
        <div className="overflow-x-auto rounded-(--radius-card) border border-(--line) bg-(--surface)" tabIndex={0} role="region" aria-labelledby="reports-title">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Listing reports, newest first</caption>
            <thead className="bg-(--surface-sunken) text-(--muted)">
              <tr>
                <th scope="col" className="p-3 font-medium">Lot</th>
                <th scope="col" className="p-3 font-medium">Reason</th>
                <th scope="col" className="p-3 font-medium">Reporter</th>
                <th scope="col" className="p-3 font-medium">Status</th>
                <th scope="col" className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--line)">
              {state.items.map((r) => (
                <tr key={r.id} className="align-top text-(--ink)">
                  <td className="p-3">
                    <Link to={`/auction/${r.auctionId}`} className="font-semibold underline">{r.lotTitle}</Link>
                    <div className="text-(--muted)">by @{r.seller} · {r.lotStatus} · {r.lotBidCount} {r.lotBidCount === 1 ? 'bid' : 'bids'}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{REASONS[r.reason] ?? r.reason}</div>
                    {r.details && <div className="max-w-xs text-(--muted)">{r.details}</div>}
                  </td>
                  <td className="p-3">@{r.reporter}<div className="text-(--muted)"><time dateTime={r.createdAt}>{formatTimeAgo(r.createdAt)}</time></div></td>
                  <td className="p-3">
                    <StatusBadge tone={TONE[r.status]}>{r.status}</StatusBadge>
                    {r.resolution && <div className="mt-1 max-w-xs text-(--muted)">{r.resolution}</div>}
                  </td>
                  <td className="p-3">
                    {r.status === 'open' ? (
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="secondary" disabled={busy !== null} loading={busy === r.id} aria-label={`Dismiss reports on ${r.lotTitle}`} onClick={() => resolve(r, 'dismiss')}>Dismiss</Button>
                        {r.lotStatus === 'active' && (
                          <Button size="sm" variant="danger" disabled={busy !== null} aria-label={`Cancel listing ${r.lotTitle}`} onClick={() => resolve(r, 'cancel_listing')}>Cancel listing</Button>
                        )}
                      </div>
                    ) : <span className="text-(--muted)">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
