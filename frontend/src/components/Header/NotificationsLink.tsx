import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import notificationService, { CHANGED } from '../../services/notificationService';

const POLL_MS = 30_000;

/** Bell with the unread count; the count is in the accessible name, the badge is decoration. Refreshes on poll, focus and local reads. */
export default function NotificationsLink() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let controller: AbortController | null = null;
    const load = () => {
      controller?.abort();
      controller = new AbortController();
      notificationService.unreadCount(controller.signal).then((r) => setUnread(r.unread)).catch(() => {});
    };
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    window.addEventListener(CHANGED, load);
    return () => {
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(CHANGED, load);
    };
  }, []);

  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  return (
    <Link to="/notifications" aria-label={label} title={label} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-(--ink) hover:bg-(--surface-hover)">
      <Bell size={22} aria-hidden="true" />
      {unread > 0 && (
        <span aria-hidden="true" className="absolute right-1 top-1 min-w-5 rounded-full bg-(--danger) px-1 text-center text-xs font-semibold leading-5 text-(--on-ink)">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
