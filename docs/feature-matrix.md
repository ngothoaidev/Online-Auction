# Feature matrix

Status: **Done** = implemented and covered by automated evidence · **Partial** = implemented, evidence or scope incomplete (stated) · **Planned** = not built.
Test paths are relative to `backend/tests/integration/` (API, real PostgreSQL), `frontend/tests/unit/` (components) and `frontend/e2e/` (browser). Measurements: `docs/validation/`.

| # | Requirement | Status | What exists | Evidence | Open |
|---|---|---|---|---|---|
| R01 | Baseline & reproducibility | Done | Baseline doc, ADRs, migrations 0000–0011 with preflights, idempotent seed, Compose, env examples | `docs/baseline.md`, `migration.test.js`, `foundation.test.js` | Full `docker compose up` not re-run after T24 changes (validated with `docker compose config`) |
| R02 | Identity, reset, authorization | Partial | Reset grants, token revocation, ban effect on issued tokens, role/ownership matrix, rate limits | `auth.test.js`, `access.test.js` | OAuth untested without provider credentials |
| R03 | Validation, data privacy, content | Done | DTO allowlists, Zod validation, sanitization read/write/render, private uploads, error envelope | `privacy.test.js`, `media.test.js`, `safehtml.test.jsx` | Legacy public proof URLs need the storage owner (runbook §7) |
| R04 | Exact, private proxy bidding | Done | Pure engine, BigInt money, private maxima, tie by priority, anti-sniping | `tests/unit/bidding.test.js` (500 random sequences), `bidding.test.js` (50 concurrent) | — |
| R05 | Retries, Buy Now, reject | Done | Idempotency keys, Buy Now races → one order, disqualification + recompute | `bidding.test.js`, `moderation.test.js`, `e2e/bidding.spec.js` | — |
| R06 | Automatic settlement | Done | Worker with SKIP LOCKED, banned-winner rule, legacy reconciliation, read-only GET | `settlement.test.js`, `faults.test.js` (real process kill), `e2e/journey.spec.js`; lag `load-t23.json` | — |
| R07 | Order state machine | Done | Central transitions, deadline + expiry, B09 cancel rules, append-only transitions | `tests/unit/orderTransitions.test.js`, `orders.test.js` | — |
| R08 | Proofs, messages, reviews | Done | Private proofs, read-state, review rules + exact counters | `media.test.js`, `reviews.test.js`, `e2e/order.spec.js`, `e2e/journey.spec.js` | — |
| R09 | AURUM design system & accessibility | Partial | Semantic tokens (contrast-tested), accessible primitives, no native dialogs, responsive shell | axe 0 violations (`a11y-t23.json`), reflow/zoom/focus 18/18 (`reflow-t23.json`), `ui.test.jsx`, `contrast.test.js`, screenshots | Manual screen-reader pass not done; 200 % zoom approximated by viewport |
| R10 | Home, browse, search, watchlist | Done | Real-lot hero, parent/child categories, URL-driven search, watchlist desired state | `catalog.test.js`, `catalog.test.jsx` | — |
| R11 | Navigation & identity regressions | Done | View All, mobile category links, admin logout | `navigation.test.jsx`, `e2e/admin.spec.js` | — |
| R12 | Lot detail & review-before-commit | Done | Bid/Buy Now review dialogs, server minimum/capabilities, retry with the same key, honest outbid | `bidding.test.jsx`, `e2e/bidding.spec.js` | — |
| R13 | Auth, profile, seller UI | Partial | Login/register/create-listing on primitives, 3–10 photos, exact money input | `e2e/listing.spec.js`, `listing.test.js` | Profile/Verify/BecomeSeller pages only accessibility-fixed, not redesigned |
| R14 | Admin & moderation | Done | Nested admin routes, reports, audited idempotent admin commands, append-only audit log | `adminModeration.test.js`, `e2e/moderation.spec.js`, `e2e/admin.spec.js` | No admin screens yet for payment exceptions / email deliveries (APIs + runbook exist) |
| R15 | Realtime & recovery | Partial | SSE by version, replay/reset, server clock, offline label + catch-up | `realtime.test.js`, `realtime.test.jsx`, `e2e/realtime.spec.js`; p95 1.2 s at 1 s poll (`load-t23.json`) | Multi-instance behaviour reasoned, not measured |
| R16 | Payment mock (provider optional) | Partial | Mock adapter, signed webhooks, dedupe, exceptions, reconciliation, UI labels | `payments.test.js`, `e2e/payment.spec.js` | Real provider sandbox (T25*) not built — optional |
| R17 | Notifications & trust | Done | Outbox consumer, in-app + email, reminders, dedupe, delivery status | `notifications.test.js`, `outbox.test.js`, `faults.test.js`, `e2e/notifications.spec.js` | Email is at least once by design |
| R18 | Tests, operations, docs | Partial | CI (backend, frontend, e2e), JSON logs, health/ready, metrics, heartbeat, runbook, demo, this matrix | `observability.test.js`, `docs/validation/report-t23.md`, `docs/runbook.md` | CI not yet run on GitHub; performance numbers from one machine; no field Core Web Vitals |

## Planned (not built)

| Item | Note |
|---|---|
| T25* real payment-provider sandbox | Adapter boundary is ready (`adapters/payments/`); needs a provider choice and sandbox credentials |
| T26* reserve price, second-chance offers, saved searches, fraud heuristics | Need their own spec before code |
| Admin UI for payment exceptions and email delivery | APIs exist (`/notifications/admin/deliveries`) / SQL in the runbook |
| Refunds | Out of scope (mock payments only) |
