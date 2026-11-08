import { QueryClient } from '@tanstack/react-query';

// Server state cache for the SPA. Reads are shared and deduplicated by key; a page that writes invalidates the keys it
// changed. Live auction state stays on the SSE stream (hooks/useAuction), not here.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
