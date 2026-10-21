# AURUM Auctions — online auction for collectibles

A full-stack auction site built to behave correctly under concurrency: proxy bidding that is serialized per lot,
auctions that close by themselves, an order lifecycle with a real state machine, live prices, notifications,
moderation with an audit trail — and the tests, measurements and runbooks that show it.

**Stack:** React 19 + Vite + Tailwind 4 (SPA) · Node.js + Express · PostgreSQL 16 + Drizzle ORM · a separate worker
process · Server-Sent Events · Playwright, Vitest, `node:test` against a real PostgreSQL.

> Portfolio project. Payments are **manual** (the buyer uploads a receipt) or go through a **mock gateway** — no real
> money is processed anywhere. Emails stay in memory in development.

## What it does

| | |
|---|---|
| **Bidding** | Private maximum ("proxy") bids, raised one step at a time; ties go to the earlier maximum; anti-sniping extension. Every bid on a lot is serialized by a row lock and decided on the database clock; retries are idempotent. |
| **Closing** | A worker settles due auctions with nobody watching, creates exactly one order, and skips banned/disqualified bidders. Buy Now ends a lot atomically. |
| **Orders** | One state machine for every change: manual proof or mock-gateway payment, payment deadline + expiry, shipping, receipt, two-sided reviews; private proof uploads. |
| **Live** | Per-lot Server-Sent Events from committed events; the countdown follows the server clock; honest "offline/paused" labels and automatic catch-up. |
| **Notifications** | In-app + email from a transactional outbox (outbid, won, sold, payment, shipped, completed, reminders), deduplicated per recipient. |
| **Moderation** | Listing reports, ban/role/seller approval/category/listing actions as audited, idempotent admin commands; append-only audit log. |
| **Operations** | JSON logs with redaction, `/health/live`, `/health/ready`, Prometheus `/metrics`, worker heartbeat, runbooks. |

Full list with evidence: [docs/feature-matrix.md](docs/feature-matrix.md).

## Quick start

### Option A — Docker Compose (everything in containers)

```bash
docker compose up            # db + api (migrate + seed) + worker + frontend
```
Open http://localhost:5173 when `api` is healthy (first start installs packages; a few minutes).

### Option B — local Node (faster inner loop)

Requires Node ≥ 20 (developed on 24) and Docker for PostgreSQL.

```bash
docker compose up -d db                       # PostgreSQL on localhost:55432 (databases auction + auction_test)

cd backend
cp .env.example .env                          # placeholders are fine for local use
npm ci
npm run db:migrate && npm run db:seed         # seed is idempotent; re-run it to get fresh lots when all have closed
npm run dev                                   # API  -> http://localhost:3000
npm run worker                                # in a second terminal: settlement, payments, reminders, outbox

cd ../frontend
cp .env.example .env                          # VITE_API_URL=http://localhost:3000
npm ci
npm run dev                                   # SPA  -> http://localhost:5173
```

### Demo accounts (seed)

| Role | Username | Password |
|---|---|---|
| Buyer | `demo_buyer1`, `demo_buyer2` | `Passw0rd!demo` |
| Seller | `demo_seller` | `Passw0rd!demo` |
| Admin | `demo_admin` | `Passw0rd!demo` |

A guided 10-minute walkthrough (two bidders, disconnect/retry, automatic close, payment, shipping, reviews, one
concurrency and one crash/recovery proof): **[docs/demo.md](docs/demo.md)**.

## Tests and checks

| | Command | Notes |
|---|---|---|
| Backend lint / unit | `cd backend && npm run lint && npm run test:unit` | |
| Backend integration | `npm run test:integration` | Real PostgreSQL, database `auction_test`; refuses any DB not named `*_test`. Includes 50-way concurrent bidding, races, real worker process kills. |
| Frontend lint / unit / build | `cd frontend && npm run lint && npm test && npm run build` | |
| End-to-end | `cd frontend && npx playwright test` | Needs API + worker + Vite running; start the API with `AUTH_/BID_/UPLOAD_/COMMENT_RATE_LIMIT_MAX` raised. |
| Accessibility / reflow / screenshots | `node scripts/qa-a11y.mjs`, `qa-reflow.mjs`, `qa-screenshots.mjs <label>` | Real Chromium; see `docs/validation/`. |
| Load | `cd backend && node scripts/loadtest.js` | Use a dedicated DB; see the header of the script. |

CI (`.github/workflows/ci.yml`): backend (lint, unit, integration on PostgreSQL), frontend (lint, unit, build), e2e (full stack + Playwright).
Latest measured results: [docs/validation/report-t23.md](docs/validation/report-t23.md).

## Documentation

| | |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Components, data model, command/transaction flow, outbox, realtime, worker, state machines |
| [docs/api.md](docs/api.md) | Endpoints, auth, error envelope, idempotency, SSE format, webhooks, health/metrics |
| [docs/security.md](docs/security.md) | Threat model notes and the controls in place |
| [docs/runbook.md](docs/runbook.md) | Worker lag, stuck outbox, payment exceptions, legacy proofs, recovery, cutover/rollback |
| [docs/deployment.md](docs/deployment.md) | What a production deployment needs (not deployed) |
| [docs/adr/](docs/adr/) | Business policies (0001) and architecture decisions (0002) |
| [docs/validation/](docs/validation/) | Test/QA/performance evidence and screenshots |
| `.kiro/specs/online-auction-upgrade/` | Requirements, design and task plan of the upgrade (kept outside version control) |

## Repository layout

```
backend/   Express API (app.js, server.js), worker (worker.js, jobs/), domain/ (pure rules), services/ (commands),
           db/schema.js + drizzle/ (migrations), adapters/payments/, scripts/, tests/{unit,integration}
frontend/  React SPA: pages/, components/ui (accessible primitives), hooks/ (useAuction, useAuctionEvents), services/, e2e/
docs/      architecture, API, security, runbook, ADRs, validation evidence
```

## Status and known limits

All 24 planned tasks of the upgrade are implemented; the optional real payment-provider sandbox (T25) and P2 features
(T26) are not. Open items are tracked honestly in [docs/feature-matrix.md](docs/feature-matrix.md) — notably: CI has not run on
GitHub yet, OAuth needs real credentials to verify, performance numbers come from one laptop, and older public proof
links need the storage owner to migrate.
