import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { formatTimeAgo } from '../../utils/format';

/** The signed-in user's in-app notifications: newest first, unread marked in text (not only colour), opening one marks it read. */
export default function Notifications() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', items: [], unread: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await notificationService.list();
      setState({ status: 'ready', items: r.items, unread: r.unread });
    } catch {
      setState((s) => ({ ...s, status: 'error' }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.read) await notificationService.markRead(n.id).catch(() => {});
    if (n.link) navigate(n.link); else load();
  };
  const readAll = async () => {
    setBusy(true);
    try { await notificationService.markAllRead(); await load(); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-(--ink)">Notifications</h1>
        {state.unread > 0 && <Button variant="secondary" size="sm" loading={busy} onClick={readAll}>Mark all as read</Button>}
      </div>
      <p role="status" className="sr-only">{state.status === 'ready' ? `${state.unread} unread` : ''}</p>

      {state.status === 'loading' && <div aria-busy="true" className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      {state.status === 'error' && <EmptyState title="Notifications could not be loaded" action={<Button onClick={load}>Try again</Button>}>Check your connection and try again.</EmptyState>}
      {state.status === 'ready' && state.items.length === 0 && (
        <EmptyState title="No notifications yet" action={<Link to="/search" className="font-semibold text-(--brand) underline">Browse lots</Link>}>
          Outbid alerts, wins, payment reminders and shipping updates will appear here.
        </EmptyState>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="divide-y divide-(--line) rounded-(--radius-card) border border-(--line) bg-(--surface)">
          {state.items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} className={`flex w-full items-start gap-3 p-4 text-left hover:bg-(--surface-hover) ${n.read ? '' : 'bg-(--brand-soft)'}`}>
                <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-(--brand)'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-(--ink)">{!n.read && <span className="sr-only">Unread: </span>}{n.title}</span>
                  <span className="mt-0.5 block text-sm text-(--muted)">{n.body}</span>
                  <span className="mt-1 block text-xs text-(--muted)"><time dateTime={n.createdAt}>{formatTimeAgo(n.createdAt)}</time></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
