import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './apiClient';
import type { CategoryNode, MySellerRequest, UserProfile } from '../types/api';

// Reads used by several screens share one cache entry, so they live here under one key.

/** GET /categories. The tree rarely changes; one request serves the header, filters and forms. */
export const useCategories = () => useQuery({
  queryKey: ['categories'],
  queryFn: () => apiFetch<CategoryNode[]>('/categories', { auth: 'none' }),
  staleTime: 5 * 60_000,
});

/**
 * The three states the pages render. Data already on screen stays on screen while it refreshes (or if a background
 * refresh fails); with nothing to show, a retry after an error shows the loading state again.
 */
export const loadStatus = (q: { data: unknown; isError: boolean; isFetching: boolean }): 'loading' | 'error' | 'ready' =>
  q.data !== undefined ? 'ready' : q.isError && !q.isFetching ? 'error' : 'loading';

/** Public profile by username (the owner also gets their own email). */
export const useProfile = (username: string | undefined) => useQuery({
  queryKey: ['profile', username],
  queryFn: () => apiFetch<UserProfile>(`/users/profile?username=${encodeURIComponent(username ?? '')}`),
  enabled: Boolean(username),
});

/** The signed-in user's seller request (header badge and the Become a seller page). */
export const useSellerRequest = (enabled = true) => useQuery({
  queryKey: ['seller-request'],
  queryFn: () => apiFetch<MySellerRequest>('/seller/my-request', { auth: 'required' }),
  enabled,
});
