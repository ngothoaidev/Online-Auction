import { apiFetch } from './apiClient';
import type { AppNotification } from '../types/api';

// In-app notifications of the signed-in user. Both reads live under the ['notifications'] query key, so a local read
// that invalidates it refreshes the page and the header count together.
const notificationService = {
  list: (signal?: AbortSignal) => apiFetch<{ items: AppNotification[]; unread: number }>('/notifications', { auth: 'required', signal }),
  unreadCount: (signal?: AbortSignal) => apiFetch<{ unread: number }>('/notifications/unread-count', { auth: 'required', signal }),
  markRead: (id: number) => apiFetch(`/notifications/${id}/read`, { method: 'POST', auth: 'required' }),
  markAllRead: () => apiFetch('/notifications/read-all', { method: 'POST', auth: 'required' }),
};

export default notificationService;
