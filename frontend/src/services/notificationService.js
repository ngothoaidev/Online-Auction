import { apiFetch } from './apiClient.js';

// In-app notifications of the signed-in user. CHANGED is broadcast after a local read so the header count refreshes at once.
export const CHANGED = 'notifications:changed';
const changed = (r) => { window.dispatchEvent(new Event(CHANGED)); return r; };

const notificationService = {
  list: (signal) => apiFetch('/notifications', { auth: 'required', signal }),
  unreadCount: (signal) => apiFetch('/notifications/unread-count', { auth: 'required', signal }),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'POST', auth: 'required' }).then(changed),
  markAllRead: () => apiFetch('/notifications/read-all', { method: 'POST', auth: 'required' }).then(changed),
};

export default notificationService;
