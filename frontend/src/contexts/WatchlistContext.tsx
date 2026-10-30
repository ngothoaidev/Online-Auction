/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../services/apiClient';
import { useAuth } from './AuthContext';

type Watchlist = {
  has: (id: number) => boolean;
  pending: (id: number) => boolean;
  set: (auctionId: number, favorited: boolean) => Promise<void>;
  toggle: (auctionId: number) => Promise<void>;
  ready: boolean;
};

const WatchlistContext = createContext<Watchlist>({ has: () => false, pending: () => false, set: async () => {}, toggle: async () => {}, ready: true });

/**
 * Single source of truth for hearts. The server stores a desired state (PUT {favorited}); the UI is optimistic but
 * always converges: a failed write rolls back, repeated clicks are serialised per lot, logout clears everything.
 */
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set<number>());
  const [busy, setBusy] = useState(() => new Set<number>());
  const [ready, setReady] = useState(false);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const chain = useRef(new Map<number, Promise<void>>()); // auctionId -> promise of the last write (serialises clicks per lot)

  useEffect(() => {
    setIds(new Set());
    setBusy(new Set());
    chain.current = new Map();
    if (!user) { setReady(true); return undefined; }
    const controller = new AbortController();
    setReady(false);
    apiFetch<{ auctionIds: number[] }>('/users/favorites', { signal: controller.signal, auth: 'required' })
      .then((data) => { setIds(new Set(data.auctionIds)); setReady(true); })
      .catch(() => {}); // stays not-ready: hearts disabled rather than wrongly "unsaved"
    return () => controller.abort();
  }, [user?.userId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const write = useCallback((auctionId: number, favorited: boolean) => {
    const prior = chain.current.get(auctionId) ?? Promise.resolve();
    const next = prior.then(async () => {
      setBusy((s) => new Set(s).add(auctionId));
      try {
        await apiFetch(`/users/favorites/${auctionId}`, { method: 'PUT', body: { favorited }, auth: 'required' });
      } catch (error) {
        // roll back to the opposite of what we asked for, unless a later click already changed the intent
        setIds((s) => { const n = new Set(s); if (favorited) n.delete(auctionId); else n.add(auctionId); return n; });
        throw error;
      } finally {
        setBusy((s) => { const n = new Set(s); n.delete(auctionId); return n; });
      }
    });
    chain.current.set(auctionId, next.catch(() => {}));
    return next;
  }, []);

  const set = useCallback((auctionId: number, favorited: boolean) => {
    setIds((s) => { const n = new Set(s); if (favorited) n.add(auctionId); else n.delete(auctionId); return n; });
    return write(auctionId, favorited);
  }, [write]);

  const toggle = useCallback((auctionId: number) => set(auctionId, !idsRef.current.has(auctionId)), [set]);

  const value = useMemo(() => ({
    // Until the saved list has loaded (or if it failed) hearts are "pending": showing them as unsaved and clickable
    // would be a guess, and a click could be overwritten when the list arrives.
    has: (id: number) => ids.has(id), pending: (id: number) => !ready || busy.has(id), set, toggle, ready,
  }), [ids, busy, set, toggle, ready]);

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export const useWatchlist = () => useContext(WatchlistContext);
