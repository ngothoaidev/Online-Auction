# Validation report — T23 (end-to-end gates, faults, quality measurements)

Branch `feature/auction-upgrade`, commit: the T23 commit that adds this file (`git log --oneline -1 -- docs/validation/report-t23.md`).
Machine for every number below: AMD Ryzen 7 8845H (16 threads), 14 GB RAM, Windows 11, Node v24.18.0, PostgreSQL 16.14 in Docker Desktop.
API, worker, database and the load generator / browsers all ran on that **one** machine. Nothing here was measured on production infrastructure.

## 1. Commands and results

| Gate | Command (from the app folder) | Result |
|---|---|---|
| Backend lint | `backend: npm run lint` | 0 errors (10 legacy warnings) |
| Backend unit | `backend: npm run test:unit` | 28 / 28 |
| Backend integration (real PostgreSQL, `*_test` DB guard) | `backend: npm run test:integration` | 154 / 154 |
| Frontend lint | `frontend: npm run lint` | 0 errors (37 legacy warnings) |
| Frontend unit/component | `frontend: npm test` | 118 / 118 |
| Frontend build | `frontend: npm run build` | OK |
| E2E, real Chromium + API + worker + DB | `frontend: npx playwright test` (API/worker/Vite running, see `playwright.config.js`) | 13 / 13, twice in a row |
| axe WCAG 2.1 A/AA, 12 pages × 390/1440 × light/dark | `frontend: node scripts/qa-a11y.mjs` | 0 violations → `a11y-t23.json` |
| Reflow 320 px + 200 % zoom proxy + keyboard focus, 9 pages | `frontend: node scripts/qa-reflow.mjs` | 18 / 18 → `reflow-t23.json` |
| Screenshots 7 pages × 4 widths × 2 themes | `frontend: node scripts/qa-screenshots.mjs after-t23` | 56 images, 0 page errors → `screenshots/after-t23/` (clean seeded DB) |
| Lighthouse 12.6.1 (lab) | see §4 | → `lighthouse-t23.json` |
| Load | `backend: node scripts/loadtest.js --out=...` | → `load-t23.json`, §5 |

CI (`.github/workflows/ci.yml`) now has a third job, `e2e`: PostgreSQL service → migrate → seed → API + worker → Playwright with failure artifacts.
**Not yet executed on GitHub** (the branch has not been pushed); it parses as valid YAML and mirrors the local procedure above.

## 2. Cross-module journeys (browser, real stack)

| Journey | Spec |
|---|---|
| Guest browses, cannot bid | `e2e/bidding.spec.js`, `e2e/smoke.spec.js` |
| Buyer bid review → cancel (0 requests) → confirm (1 keyed request) → outbid shown honestly | `e2e/bidding.spec.js` |
| Seller creates a listing with 3 photos | `e2e/listing.spec.js` |
| **List → bid in UI → lot closes → worker settles with nobody watching → mock payment → seller ships → buyer confirms receipt → both review → completed** | `e2e/journey.spec.js` (new) |
| Buy Now → manual proof upload (private) → seller opens it, anonymous 401 | `e2e/order.spec.js` |
| Buy Now → mock gateway → seller ships | `e2e/payment.spec.js` |
| Two browsers converge on the live price; offline → honest label → catch up | `e2e/realtime.spec.js` |
| Outbid → bell → notification → lot | `e2e/notifications.spec.js` |
| Report → admin cancels with note → audit log | `e2e/moderation.spec.js` |
| Admin routes, mobile drawer, logout, confirmations | `e2e/admin.spec.js` |

Every spec lists its own lots (`e2e/fixtures.js`); specs no longer depend on or exhaust seeded data, and run serially because they share one DB.

## 3. Concurrency, faults and negative security (PostgreSQL, real transactions)

| Risk | Evidence |
|---|---|
| 50 concurrent bids; equal maxima; leader raise × challenger; lock wait past deadline | `bidding.test.js` |
| Buy Now × Buy Now, Buy Now × bid (30 rounds), key replay | `bidding.test.js` |
| Reject × bid (25), reject × Buy Now, reject × settlement (20) | `moderation.test.js`, `settlement.test.js` |
| 3 workers × 30 due lots; Buy Now × settlement; deadline extension × settlement | `settlement.test.js` |
| Payment × expiry (25 manual + 20 gateway rounds), cancel × shipping, 2 expiry workers | `orders.test.js`, `payments.test.js` |
| Simultaneous reviews (20 rounds), randomised edits keep counters exact | `reviews.test.js` |
| Duplicate webhooks ×8, forged/malformed webhook, lost webhook + reconciliation | `payments.test.js` |
| Outbox: rollback ⇒ no event, lease expiry, fencing of a stale dispatcher, 2 dispatchers × 200 events, dead letter | `outbox.test.js` |
| **Real process kills** (`node worker.js` child, `FAULT_POINT`): before settlement commit; after consumer before mark; after email send before record | `faults.test.js` (new) |
| Guest/role/ownership matrix, token revocation, private fields, mass assignment, XSS, admin-only APIs | `access.test.js`, `privacy.test.js`, `adminModeration.test.js` |
| Load-time invariants: no duplicate orders, every leader has a live maximum, no price above the leader's maximum | `scripts/loadtest.js` (all 0 after load) |

Delivery guarantees that are deliberately **at least once** (and tested as such): outbox → consumers, and email (a crash after the provider accepted a message resends it; `faults.test.js` shows the unrecorded first send).

## 4. Lighthouse (lab only)

Production build served by `vite preview`, API on the same machine, dev dataset (lot page = seeded lot with 73 bids).
Mobile: simulated throttling, RTT 150 ms, 1.6 Mbps, CPU ×4. Desktop: RTT 40 ms, 10 Mbps, CPU ×1. Chrome 156 headless.

| Page / profile | Perf before → after | CLS before → after | LCP before → after | A11y | SEO before → after |
|---|---|---|---|---|---|
| Home, mobile | 79 → 92 | 0 → 0 | 4.0 s → 2.9 s | 100 | 83 → 100 |
| Home, desktop | 96 → 99 | 0.099 → 0 | 0.9 s → 0.8 s | 100 | 83 → 100 |
| Search, mobile | 79 → 89 | 0.001 → 0 | 3.9 s → 3.0 s | 98 → 100 | 82 → 100 |
| Search, desktop | 97 → 98 | 0.085 → 0.053 | 0.9 s → 0.8 s | 99 → 100 | 82 → 100 |
| Lot, mobile | 69 → 75 | 0 → 0 | 4.8 s → 4.1 s | 100 | 83 → 100 |
| Lot, desktop | 75 → 99 | **0.668 → 0** | 1.0 s → 0.9 s | 100 | 83 → 100 |

Changes behind the "after": route-level code splitting (main JS 993 kB → 435 kB; the 370 kB rich-text editor loads only when a seller edits), skeletons with the final layout (lot page, gallery, home hero), `font-display: optional` self-hosted subsets, meta description, `robots.txt`, search heading order.
**Field Core Web Vitals: not measured** — the app has no real-user traffic, so no CrUX/RUM data exists. Lot page on mobile (75, LCP 4.1 s) remains the weakest lab result.

## 5. Load test (after correctness)

`backend/scripts/loadtest.js`, 20 s per phase, dedicated DB `auction_load`, API with `BID_RATE_LIMIT_MAX` raised (the default 30/min/user would measure the limiter), worker poll 1 s.

| Phase | Throughput | p50 | p95 | p99 | max | 5xx/network errors |
|---|---|---|---|---|---|---|
| Catalog reads (20 concurrent: top / search / detail) | 396 req/s | 42 ms | 89 ms | 103 ms | 151 ms | 0 |
| 50 bidders on **one** lot | 67 req/s | 385 ms | 549 ms | 637 ms | 791 ms | 0 |
| 50 bidders over 20 lots | 146 req/s | 191 ms | 263 ms | 304 ms | 382 ms | 0 |
| Live update to 20 SSE subscribers (bid send → arrival, upper bound) | — | 801 ms | 1 198 ms | 1 450 ms | 1 682 ms | — |
| Settlement of 30 lots closing together (end → settled) | 30/30, 30 orders | 838 ms | 2 160 ms | 2 175 ms | 2 175 ms | — |

On the hot lot 85 % of bids were refused by rule (`BID_TOO_LOW`: the price moved between a bidder's read and write); that is correct behaviour, counted separately from errors. Single-lot throughput is bounded by the per-auction row lock by design (correctness first).
Caveats: one machine (generator competes with the server), request logging on, no TLS/proxy, small dataset. Treat as a regression baseline, not a capacity claim.

## 6. Defects found by T23 and fixed

1. **Reviews could never be submitted from the order page**: Zod 4 `z.enum([1, -1])` accepts nothing (numbers) → every review refused client-side. Found by the new journey E2E; regression unit test added.
2. **Header overflowed at 320 px** (46–94 px; worse once the T21 bell existed) → search/theme move into the menu below 640 px, smaller logo; comment input could not shrink (`min-w-0`).
3. **Lot page on phones showed the bid panel after description and Q&A** → DOM order photos → bid → history → description; desktop unchanged.
4. **Large layout shifts** (lot page desktop CLS 0.668; home hero; late web fonts) → layout-true skeletons, hero placeholder, `font-display: optional`.
5. **Native `alert`/`confirm` remained** on the order page, comments, description, profile, proof link, price filter (Playwright auto-dismisses them, so "I received the item" could never be confirmed in automation) → accessible `useFeedback` dialog/toast everywhere.
6. Public profile still reported `percentage: 100` for zero reviews → `null` (regression test).
7. Review rating toggles had no pressed state / unlabeled comment → `aria-pressed`, labelled textarea.
8. Test hygiene: outbox backoff measured on the host clock (DB clock differs by tens of ms) → measured on the DB clock; E2E fixture image was not a decodable PNG.

## 7. Open gaps (requirements stay open where noted)

- CI `e2e` job written but **not run on GitHub** (no push) — R18.2 evidence is local only.
- 200 % zoom is approximated by a 640×450 viewport (same CSS pixels as 1280×900 at 200 %), not by browser zoom; **no manual screen-reader pass** (NVDA/VoiceOver) — R09.3/R09.4 partially evidenced.
- Lighthouse is lab-only; no field CWV (§4).
- Load and latency numbers are single-machine (§5); multi-instance SSE is only reasoned about (each instance reads the outbox independently), not measured.
- `orders.test.js` payment × expiry race failed once in an earlier full run and never again (4 later full-suite runs, 12 isolated runs of which 8 under CPU stress); assertions now print full context if it recurs.
- OAuth (Google/Facebook) still untested without credentials; legacy public proof URLs still need the storage owner (see `npm run db:audit-proofs`).
