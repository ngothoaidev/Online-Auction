import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/apiClient';
import type { AuctionPatch } from '../types/api';

const POLL_MS = 10_000;
const backoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000);

/**
 * Public live updates for one lot (SSE). Handlers are read through refs so callers can pass inline functions.
 * - onEvent(data): every pushed event; the caller drops stale versions.
 * - onResync(): refetch the canonical snapshot (server reset, reconnect after a gap, polling while the stream is down).
 * Returns 'connecting' | 'live' | 'stale' | 'offline'. While not live, the snapshot is polled every 10s; when the
 * stream comes back the caller refetches BEFORE we report 'live', so the "may be out of date" label is honest.
 */
export type Connection = 'connecting' | 'live' | 'stale' | 'offline';
type Handlers = {
  getVersion?: () => number | null;
  onEvent?: (data: AuctionPatch) => void;
  onResync?: () => unknown;
};

export function useAuctionEvents(auctionId: number | string | null, { getVersion, onEvent, onResync }: Handlers) {
  const [connection, setConnection] = useState<Connection>('connecting');
  const handlers = useRef({ getVersion, onEvent, onResync });
  handlers.current = { getVersion, onEvent, onResync };

  useEffect(() => {
    if (!auctionId) return undefined;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let attempt = 0;
    let down = false;
    let disposed = false;

    const resync = () => Promise.resolve(handlers.current.onResync?.()).catch(() => {});
    const startPolling = () => { if (!pollTimer) pollTimer = setInterval(resync, POLL_MS); };
    const stopPolling = () => { if (pollTimer) clearInterval(pollTimer); pollTimer = null; };
    const markDown = (state: Connection) => { down = true; setConnection(state); startPolling(); };

    const open = () => {
      if (disposed || typeof EventSource === 'undefined') { markDown('stale'); return; }
      const since = handlers.current.getVersion?.();
      es = new EventSource(`${API_URL}/auction/${auctionId}/events${since != null ? `?since=${since}` : ''}`);
      es.onopen = async () => {
        attempt = 0;
        if (down) { await resync(); down = false; }
        if (!disposed) { stopPolling(); setConnection('live'); }
      };
      es.onmessage = (m) => {
        let data;
        try { data = JSON.parse(m.data); } catch { return; }
        handlers.current.onEvent?.(data);
      };
      es.addEventListener('reset', resync);
      es.onerror = () => {
        if (disposed) return;
        markDown(navigator.onLine === false ? 'offline' : 'stale');
        // CONNECTING = the browser retries by itself (with Last-Event-ID); CLOSED (HTTP error, 429…) = we retry with backoff
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          clearTimeout(retryTimer);
          retryTimer = setTimeout(open, backoff(attempt++));
        }
      };
    };

    const onOffline = () => { es?.close(); markDown('offline'); };
    const onOnline = () => { es?.close(); clearTimeout(retryTimer); attempt = 0; setConnection('connecting'); open(); };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    open();

    return () => {
      disposed = true;
      es?.close();
      clearTimeout(retryTimer);
      stopPolling();
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [auctionId]);

  return connection;
}
