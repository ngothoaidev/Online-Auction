# Frontend — AURUM Auctions SPA

React 19 + Vite 7 + Tailwind CSS 4, React Router 7, Zod 4. Talks to the API in `../backend` (see the root README).

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm ci
npm run dev               # http://localhost:5173
npm run lint && npm test && npm run build
npx playwright test       # needs API + worker + this dev server; see playwright.config.js
```

## Structure

| Path | What lives there |
|---|---|
| `src/components/ui/` | Accessible primitives: `Button` (loading blocks double submit), `IconButton` (label required), `Field` (label/hint/error wiring), `Dialog` (focus trap, Escape, restore focus, `pending`), `StatusBadge`, `EmptyState`, `Skeleton`, `ReviewDialog`, `Feedback` (`useFeedback().confirm/notify` — no `window.alert/confirm` anywhere) |
| `src/hooks/useAuction.js` | Canonical lot snapshot ordered by `version`: older responses/events never overwrite newer state; server clock offset |
| `src/hooks/useAuctionEvents.js` | SSE client: drops duplicates/out-of-order, refetches on `reset`/gap, backoff reconnect, 10 s polling while down, honest `stale/offline` status |
| `src/services/apiClient.js` | The one fetch wrapper: bearer token, JSON, `AbortSignal`, `ApiError {status, code, requestId}`; never retries commands by itself |
| `src/contexts/` | `AuthContext`, `WatchlistContext` (desired-state PUT, optimistic + rollback), `ThemeContext` |
| `src/pages/` | Home, Search, ProductDetail (bid/Buy Now review dialogs, report), OrderCompletion (manual + mock payment, shipping, receipt, reviews), Notifications, Profile, CreateAuction, Auth/*, AdminDashboard/* (lazy-loaded) |
| `src/styles/main.css` | AURUM semantic tokens (light/dark), contrast-tested by `tests/unit/contrast.test.js`; `fonts.css` self-hosts subsets with `font-display: optional` |
| `tests/unit/` | Vitest + Testing Library: components, hooks, money formatting, validation |
| `e2e/` | Playwright journeys; `fixtures.js` lists each spec's own lots so specs never share data |
| `scripts/` | `qa-a11y.mjs` (axe), `qa-reflow.mjs` (320 px reflow, 200 % zoom proxy, keyboard focus), `qa-screenshots.mjs` |

## Conventions

- Money is a **string of digits** end to end (`utils/money.js#formatVnd`); never `Number` for amounts.
- Commands (bid, Buy Now, payments, admin actions) send an `Idempotency-Key` per user intent; a retry reuses the key.
- Permission checks in the UI are for UX only — the API enforces every rule.
- Core journeys (home, search, lot, auth) are in the main bundle; everything else is route-split with `React.lazy`.
