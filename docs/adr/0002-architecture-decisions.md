# ADR 0002 — Architecture decisions of the upgrade

Status: accepted (implemented T05–T24). Each decision lists the alternative that was rejected and why.

## 1. Serialize commands per auction with a row lock; decide on the database clock
`SELECT … FOR UPDATE` on the auction row inside one transaction; deadline and eligibility are evaluated on `clock_timestamp()` **after** the lock.
- Rejected: optimistic retries on version conflicts — under a bidding war most attempts would retry; rejected: app-server clocks — skew decides deadline races.
- Consequence: throughput on one hot lot is bounded (≈67 bids/s on a laptop, `docs/validation/load-t23.json`), but outcomes equal a serial replay (tested with 50 concurrent bidders).

## 2. Private maxima in their own table; public history only records price/leader changes
`bidder_maxima` holds ceilings; `bids` is the public history.
- Rejected: storing maxima in `bids` (the legacy design) — it leaked losing bidders' maxima and made "who leads" a query over rows.

## 3. Idempotency keys claimed in the same transaction as the business write
`command_requests` row inserted with `ON CONFLICT DO NOTHING` first; the stored result is written before commit.
- Rejected: a separate key store checked before the transaction — a crash between check and write would either lose or duplicate the command.

## 4. Transactional outbox, at-least-once delivery, consumers dedupe
Events are rows written in the business transaction; a worker dispatcher leases them (`attempts` as fencing token), retries with backoff, dead-letters.
- Rejected: publishing to a broker/email inside or after the transaction — either lost events on crash or side effects for rolled-back changes. No broker is needed at this scale.
- Consequence: email is at least once (documented and tested); in-app notifications are exactly once per logical notification thanks to unique keys.

## 5. Server-Sent Events, each API instance reading committed events by version
- Rejected: WebSockets (bidding stays plain HTTP; only server→client push is needed); a shared queue consumed by API instances (each event would reach only one instance).
- Consequence: one small indexed query per connection per second (`ponytail:` note in `services/realtime.js`); the client refetches on gaps, so correctness never depends on the stream.

## 6. A separate worker process for time-driven work
Settlement, payment expiry/reconciliation/reminders, cleanup and dispatch run outside the API.
- Rejected: settling on read (the legacy `GET` created orders) — lots without viewers never closed and reads had side effects; rejected: in-API timers — multiple API instances would race and HTTP latency would suffer.

## 7. Order state machine as a pure function + one command service
`domain/orderTransitions.js#planTransition` decides; `services/orderCommands.js#applyTransition` locks, writes, audits, emits.
- Rejected: per-endpoint status updates (legacy) — illegal transitions and missing audit.

## 8. Payment adapter with a mock implementation and reconciliation
Interface `createAttempt / verifyEvent / getAttemptStatus`; the mock keeps provider state in `payment_attempts.provider_status` so lost webhooks are recoverable; late or mismatched payments become exceptions.
- Rejected: integrating a real provider in the core scope (credentials, sandbox availability); the adapter boundary keeps T25 additive.

## 9. Exact money as integers end to end
`numeric(15,0)` ↔ `BigInt` ↔ digit strings.
- Rejected: JS numbers/floats — precision loss above 2^53 and rounding in formatting (the legacy UI rounded to "K/M/B").

## 10. Append-only audit enforced by the database
`admin_audit` has a trigger rejecting `UPDATE`/`DELETE`; `order_transitions` is append-only by convention and tests.
- Rejected: application-only immutability — a later code path could rewrite history silently.

## 11. Observability without new dependencies
JSON logger with redaction, Prometheus text rendered by ~80 lines, DB-derived gauges computed at scrape time.
- Rejected: adding `pino` + `prom-client` for this size of service; easy to swap later because call sites use `log.*`, `inc`, `observe`.
