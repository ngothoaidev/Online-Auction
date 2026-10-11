import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, isAbort } from '../services/apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Canonical lot snapshot. Snapshots are ordered by `version`: a response (fetch OR command result) that is older than
 * what we already show is dropped, so a slow request can never move the page backwards.
 */
export function useAuction(id) {
  const { user } = useAuth() ?? {};
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const controller = useRef(null);

  const accept = useCallback((incoming) => {
    setState((s) => {
      const cur = s.data;
      if (cur && incoming.version !== undefined && cur.version !== undefined && incoming.version < cur.version) return s;
      return { status: 'ready', data: { ...(cur ?? {}), ...incoming }, error: null };
    });
  }, []);

  const refresh = useCallback(async ({ silent = true } = {}) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    if (!silent) setState((s) => ({ ...s, status: s.data ? s.status : 'loading' }));
    try {
      const data = await apiFetch(`/auction/${id}`, { signal: c.signal });
      accept(data);
      return data;
    } catch (error) {
      if (isAbort(error)) return null;
      setState((s) => (s.data ? { ...s, error } : { status: error.status === 404 ? 'missing' : 'error', data: null, error }));
      return null;
    }
  }, [id, accept]);

  useEffect(() => {
    setState({ status: 'loading', data: null, error: null });
    refresh({ silent: false });
    return () => controller.current?.abort();
  }, [id, user?.userId, user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Merge the public part of a command result immediately, then reconcile with the server snapshot. */
  const applyCommandResult = useCallback((result) => {
    const patch = {};
    for (const k of ['currentPrice', 'minimumNextBid', 'endTime', 'bidCount', 'version', 'serverTime']) if (result[k] !== undefined) patch[k] = result[k];
    accept(patch);
    return refresh();
  }, [accept, refresh]);

  return { ...state, refresh, applyCommandResult };
}
