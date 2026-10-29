import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, isAbort } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useAuctionEvents } from './useAuctionEvents';
import type { AuctionDetail, AuctionPatch } from '../types/api';

type LotState =
  | { status: 'loading' | 'missing' | 'error' | 'ready'; data: AuctionDetail | null; error: unknown };

const EVENT_FIELDS = ['currentPrice', 'bidCount', 'endTime', 'status', 'version', 'closeReason'] as const;

/**
 * Canonical lot snapshot. Snapshots are ordered by `version`: a response (fetch, command result OR live event) that is
 * older than what we already show is dropped, so a slow request can never move the page backwards.
 * `clockOffset` = server clock - local clock, taken from fresh responses (never from replayed events).
 */
export function useAuction(id: number | string) {
  const { user } = useAuth();
  const [state, setState] = useState<LotState>({ status: 'loading', data: null, error: null });
  const [clockOffset, setClockOffset] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const version = useRef<number | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const accept = useCallback((incoming: AuctionPatch) => {
    if (incoming.version !== undefined && incoming.version > (version.current ?? -1)) version.current = incoming.version;
    if (incoming.serverTime) setClockOffset(Date.parse(incoming.serverTime) - Date.now());
    setState((s) => {
      const cur = s.data;
      if (cur && incoming.version !== undefined && cur.version !== undefined && incoming.version < cur.version) return s;
      return { status: 'ready', data: { ...(cur ?? {}), ...incoming } as AuctionDetail, error: null };
    });
  }, []);

  const refresh = useCallback(async ({ silent = true } = {}) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    if (!silent) setState((s) => ({ ...s, status: s.data ? s.status : 'loading' }));
    try {
      const data = await apiFetch<AuctionDetail>(`/auction/${id}`, { signal: c.signal });
      if (c.signal.aborted) return null;
      accept(data);
      return data;
    } catch (error) {
      if (isAbort(error)) return null;
      setState((s) => (s.data ? { ...s, error } : { status: (error as { status?: number }).status === 404 ? 'missing' : 'error', data: null, error }));
      return null;
    }
  }, [id, accept]);

  useEffect(() => {
    version.current = null;
    setState({ status: 'loading', data: null, error: null });
    refresh({ silent: false });
    return () => controller.current?.abort();
  }, [id, user?.userId, user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Merge the public part of a command result immediately, then reconcile with the server snapshot. */
  const applyCommandResult = useCallback((result: AuctionPatch) => {
    const patch: Record<string, unknown> = {};
    for (const k of ['currentPrice', 'minimumNextBid', 'endTime', 'bidCount', 'version', 'serverTime'] as const) if (result[k] !== undefined) patch[k] = result[k];
    accept(patch);
    return refresh();
  }, [accept, refresh]);

  /**
   * Live event: show the public fields at once, then refetch (debounced) for what events do not carry
   * (minimum next bid, capabilities, history). Duplicates and out-of-order events are dropped by version.
   */
  const onEvent = useCallback((e: AuctionPatch) => {
    if (e.auctionId !== undefined && String(e.auctionId) !== String(id)) return;
    if (version.current === null || !((e.version ?? -1) > version.current)) return;
    const patch: Record<string, unknown> = {};
    for (const k of EVENT_FIELDS) if (e[k] !== undefined) patch[k] = e[k];
    accept(patch);
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => refresh(), 250);
  }, [id, accept, refresh]);
  useEffect(() => () => clearTimeout(refetchTimer.current), []);

  const connection = useAuctionEvents(state.data ? id : null, { getVersion: () => version.current, onEvent, onResync: refresh });

  return { ...state, refresh, applyCommandResult, clockOffset, connection };
}
