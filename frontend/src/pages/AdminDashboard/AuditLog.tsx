import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../services/apiClient';
import { Button, EmptyState, Field, Skeleton } from '../../components/ui';
import type { AuditEntry } from '../../types/api';

const TYPES = [['', 'All targets'], ['user', 'Users'], ['seller_request', 'Seller requests'], ['listing', 'Listings'], ['report', 'Reports'], ['category', 'Categories']];

/** "status: active → banned" from the allowlisted before/after snapshots. */
function changes(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const diff = keys.filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]))
    .map((k) => `${k}: ${before?.[k] ?? '—'} → ${after?.[k] ?? '—'}`);
  return diff.length ? diff.join(', ') : '—';
}

/** Read-only, append-only record of admin actions (who, when, what, why). Entries are never edited. */
export default function AuditLog() {
  const [type, setType] = useState('');
  const [state, setState] = useState<{ loading: boolean; error: boolean; items: AuditEntry[] }>({ loading: true, error: false, items: [] });

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/admin/audit${type ? `?targetType=${type}` : ''}`, { auth: 'required' });
      setState({ loading: false, error: false, items: r.items });
    } catch {
      setState({ loading: false, error: true, items: [] });
    }
  }, [type]);
  useEffect(() => { load(); }, [load]);

  return (
    <section aria-labelledby="audit-title" className="space-y-4">
      <div>
        <h1 id="audit-title" className="text-2xl font-semibold text-(--ink)">Audit log</h1>
        <p className="text-sm text-(--muted)">Every admin action, newest first. Entries cannot be edited or deleted.</p>
      </div>
      <Field label="Target" className="max-w-xs">
        <select value={type} onChange={(e) => { setState((s) => ({ ...s, loading: true })); setType(e.target.value); }}>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>

      {state.loading && <div aria-busy="true" className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
      {!state.loading && state.error && <EmptyState title="The audit log could not be loaded" action={<Button onClick={() => { setState((s) => ({ ...s, loading: true })); load(); }}>Try again</Button>} />}
      {!state.loading && !state.error && state.items.length === 0 && <EmptyState title="No admin actions recorded yet" />}
      {!state.loading && !state.error && state.items.length > 0 && (
        <div className="overflow-x-auto rounded-(--radius-card) border border-(--line) bg-(--surface)" tabIndex={0} role="region" aria-labelledby="audit-title">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Admin actions, newest first</caption>
            <thead className="bg-(--surface-sunken) text-(--muted)">
              <tr>
                <th scope="col" className="p-3 font-medium">When</th>
                <th scope="col" className="p-3 font-medium">Admin</th>
                <th scope="col" className="p-3 font-medium">Action</th>
                <th scope="col" className="p-3 font-medium">Target</th>
                <th scope="col" className="p-3 font-medium">Change</th>
                <th scope="col" className="p-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--line) text-(--ink)">
              {state.items.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap p-3"><time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString()}</time></td>
                  <td className="p-3">@{e.actor ?? `user ${e.actorId}`}</td>
                  <td className="p-3 font-lot">{e.action}</td>
                  <td className="p-3">{e.targetType.replace('_', ' ')} #{e.targetId}</td>
                  <td className="p-3">{changes(e.before, e.after)}</td>
                  <td className="max-w-xs p-3 text-(--muted)">{e.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
