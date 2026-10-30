import { apiFetch } from './apiClient';

// In-app notifications of the signed-in user. CHANGED is broadcast after a local read so the header count refreshes at once.
export const CHANGED = 'notifications:changed';
const changed = <T,>(r: T) => { window.dispatchEvent(new Event(CHANGED)); return r; };

const notificationService = {
  list: (signal?: AbortSignal) => apiFetch('/notifications', { auth: 'required', signal }),
  unreadCount: (signal?: AbortSignal) => apiFetch('/notifications/unread-count', { auth: 'required', signal }),
  markRead: (id: number) => apiFetch(`/notifications/${id}/read`, { method: 'POST', auth: 'required' }).then(changed),
  markAllRead: () => apiFetch('/notifications/read-all', { method: 'POST', auth: 'required' }).then(changed),
};

export default notificationService;
