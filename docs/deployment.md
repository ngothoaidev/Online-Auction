# Deployment guide (not deployed)

This project has **not** been deployed anywhere. This page lists what a production deployment needs; it is a checklist,
not a script. No secrets belong in the repository.

## Processes

| Process | Command | Scale | Health |
|---|---|---|---|
| API | `node server.js` | 1..n behind a load balancer (stateless; SSE streams are per instance) | liveness `GET /health/live`, readiness `GET /health/ready` |
| Worker | `node worker.js` | 1..n (jobs claim work with locks/leases) | `worker_heartbeats` / `worker_heartbeat_age_seconds` |
| Migrations | `npm run db:migrate` | once per release, **before** new code takes traffic | `/health/ready` reports `migrations` |
| SPA | `npm run build` → static files in `frontend/dist` | CDN / static host | — |

Order of a release: backup → migrate → start/roll API → roll worker → smoke (`/health/ready`, one bid on a test lot). Migrations are forward-only (runbook §9).

## Required configuration (API and worker)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL 16; TLS in production; size the pool for API instances + workers |
| `JWT_SECRET`, `SESSION_SECRET` | Long random values; the API refuses to start without them; never reuse values from old `.env` files |
| `NODE_ENV=production` | Secure cookies; `/metrics` hidden unless `METRICS_TOKEN` is set; mock payments off unless `PAYMENT_ADAPTER=mock` is explicit |
| `FRONTEND_URL`, `CORS_ORIGINS` | Exact SPA origin(s) |
| `EMAIL_TRANSPORT` (empty), `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM_NAME` | Brevo transactional email; leave `EMAIL_TRANSPORT=local` only in non-production |
| `CLOUDINARY_*` | Listing photos; without it photos are stored on local disk (`PUBLIC_MEDIA_DIR`, persistent volume; set `PUBLIC_API_URL` behind a proxy) |
| `MEDIA_DIR` | Private proof storage — must be a persistent, **non-public** volume (or replace the media adapter with private object storage + signed reads) |
| `METRICS_TOKEN` | Scraper bearer token |
| `PAYMENT_ADAPTER` | Empty = manual proofs only. A real provider needs T25 (adapter, webhook secret) |
| Rate limits (`*_RATE_LIMIT_MAX`), `WORKER_POLL_MS`, `OUTBOX_*`, `SSE_*`, `PAYMENT_*` | Defaults are in `backend/.env.example` |
| OAuth (`GOOGLE_*`, `FACEBOOK_*`) | Optional; callback URLs on the API origin |

## Infrastructure checklist

- Reverse proxy / load balancer: TLS, HTTP/1.1 keep-alive, **disable response buffering for `text/event-stream`** (the API also sends `X-Accel-Buffering: no`), idle timeout > 15 s (SSE heartbeat), and set Express `trust proxy` so per-IP rate limits and SSE caps see the client IP.
- SPA host: SPA fallback to `index.html`; long-cache hashed assets; add `Content-Security-Policy` (scripts from self; `connect-src` the API origin), `Referrer-Policy`, `X-Content-Type-Options`.
- PostgreSQL: automated backups + point-in-time recovery; monitor connections and lock waits.
- Logs: ship stdout/stderr JSON to a log store; they are already redacted.
- Metrics/alerts: scrape `/metrics` from every API instance; alert rules in runbook §0.
- Secrets: a secret manager or the platform's encrypted env; rotate on staff changes.
- Before the first real users: verify OAuth with real credentials, migrate legacy public proofs (runbook §7), run the e2e suite against the staging stack, and repeat the load test on the target infrastructure (`backend/scripts/loadtest.js`).
