import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import notificationService from '../../services/notificationService';

const POLL_MS = 30_000;

/** Bell with the unread count; the count is in the accessible name, the badge is decoration. Refreshes on poll, focus and local reads. */
export default function NotificationsLink() {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: ({ signal }) => notificationService.unreadCount(signal),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: 'always',
  });
  const unread = data?.unread ?? 0;

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
