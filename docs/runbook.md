# Runbook

Signals come from `GET /metrics` (Prometheus text), `GET /health/ready` and the JSON logs of the API (`api`) and worker (`component:"worker"`).
SQL below is read-only unless marked **WRITE**; run writes inside a transaction and keep the output in the incident notes.
Restarting a worker is always safe: every job is idempotent and claims work with row locks or leases.

## 0. Quick triage

```bash
curl -s localhost:3000/health/ready | jq          # database / migrations / worker
curl -s -H "Authorization: Bearer $METRICS_TOKEN" localhost:3000/metrics | grep -E "^(auctions_overdue|settlement_lag|outbox_|payment_|email_|worker_)"
```

| Signal | Suggested alert | Section |
|---|---|---|
| `/health/ready` 503 | 2 consecutive failures | 1 |
| `worker_heartbeat_age_seconds` | > 60 for 2 min | 2 |
| `auctions_overdue_unsettled` / `auctions_overdue_oldest_seconds` | > 0 and oldest > 60 s | 2 |
| `settlement_lag_p95_seconds` | > 10 | 2 |
| `outbox_oldest_pending_seconds`, `outbox_dead_letters` | > 300 s; any dead letter | 3 |
| `payment_exceptions` | > 0 | 4 |
| `email_deliveries{status="failed"}` | > 0 for 15 min | 5 |
| `http_request_duration_ms` p95 on `/auction/:id/bid`, `auction_lock_wait_ms` | bid p95 > 1 s; lock wait p95 > 250 ms | 6 |

## 1. API not ready

`/health/ready` body says which check failed.
- `database.ok=false`: DB unreachable or slower than `READY_DB_TIMEOUT_MS`. Check the DB container/host, `DATABASE_URL`, connection limits (`SELECT count(*) FROM pg_stat_activity`). The API stays live and will be ready again without a restart.
- `migrations.ok=false` (`applied < expected`): a deploy shipped code before migrating. Run `npm run db:migrate` (from `backend/`, same `DATABASE_URL`), then re-check. Never run new code against an un-migrated DB for writes.

## 2. Worker lag (auctions not closing, reminders/expiry late)

1. Is any worker alive? `/health/ready` → `checks.worker.status` (`missing`/`stale`), or:
   ```sql
   SELECT worker_id, last_beat_at, now() - last_beat_at AS age, last_pass_ms, last_pass_failures FROM worker_heartbeats ORDER BY last_beat_at DESC;
   ```
2. Not alive → start one: `npm run worker` (several may run). One pass on demand: `WORKER_ONCE=1 npm run worker`.
3. Alive but lagging → read its log for `settlement failure`, `crashed`, `needs review`. A pass that is slow (`last_pass_ms` large) usually waits on locks:
   ```sql
   SELECT pid, now() - xact_start AS in_tx, state, wait_event_type, left(query, 80) FROM pg_stat_activity WHERE datname = current_database() ORDER BY in_tx DESC NULLS LAST LIMIT 10;
   ```
4. `SETTLEMENT_CONFLICT` / `needs review` with `order_disagrees_with_auction`: a legacy order disagrees with the auction's computed winner/price. The lot stays open on purpose. Compare and decide with the business owner:
   ```sql
   SELECT a.auction_id, a.status, a.winner_id, a.current_price, o.order_id, o.buyer_id, o.final_price, o.status FROM auctions a JOIN orders o USING (auction_id) WHERE a.auction_id = $1;
   ```
5. Scale: lag grows only with very many lots ending together (`load-t23.json`: 30 lots settle in p95 2.2 s at a 1 s poll). Lower `WORKER_POLL_MS` or add workers.

## 3. Stuck outbox (notifications not arriving)

```sql
SELECT event_type, count(*), max(attempts) AS max_attempts, min(created_at) AS oldest, max(last_error) AS sample_error
FROM outbox_events WHERE dispatched_at IS NULL GROUP BY 1 ORDER BY oldest;
SELECT event_id, event_type, attempts, next_attempt_at, lease_until, dead_at, last_error FROM outbox_events WHERE dispatched_at IS NULL ORDER BY created_at LIMIT 20;
```
- `last_error` starts with the consumer name (e.g. `notifications: email delivery failed …`). Fix the cause first (section 5).
- Events with `lease_until` in the future are being processed; a crashed dispatcher's leases expire after `OUTBOX_LEASE_MS` and are re-claimed automatically.
- **WRITE — requeue dead letters** after the cause is fixed:
  ```sql
  UPDATE outbox_events SET dead_at = NULL, attempts = 0, next_attempt_at = now(), lease_until = NULL WHERE dead_at IS NOT NULL AND event_type = 'auction.ended';
  ```
  Delivery is at least once: in-app notifications will not duplicate; an email whose send succeeded but was not recorded may be sent again.
- The public live stream does not depend on the dispatcher (it reads committed events directly), so stuck dispatch never freezes prices on screen.

## 4. Payment exceptions

```sql
SELECT pa.reference, pa.order_id, pa.amount, pa.exception_reason, pa.updated_at, o.status AS order_status, o.final_price, o.payment_due_at
FROM payment_attempts pa JOIN orders o ON o.order_id = pa.order_id WHERE pa.status = 'exception' ORDER BY pa.updated_at;
SELECT event_id, type, amount, outcome, received_at FROM payment_events WHERE reference = $1 ORDER BY received_at;
```
| `exception_reason` | Meaning | Action |
|---|---|---|
| `amount_mismatch` | Provider reported a different amount/currency | Do not ship. Verify with the provider; refund or collect the difference outside the system. |
| `late_payment_order_payment_expired` / `late_payment_window_closed` | Money arrived after the deadline; order not reopened (B08) | Contact the buyer; refund via the provider. To honour it instead, an admin must decide explicitly — there is no automatic reopen. |
| `late_payment_order_cancelled` | Paid after cancellation | Refund via the provider. |
| `success_after_failure` | Provider flipped a failed attempt to paid | Check the order: if another attempt already paid, refund this one. |
| `unknown_reference` (on `payment_events.outcome`) | Event for an attempt we never created | Verify the signature source; likely misrouted environment. |

This build only has the **mock** adapter (no real money); refunds are out of scope and recorded manually in the incident notes. There is no admin screen for exceptions yet.

## 5. Email delivery failing

`GET /notifications/admin/deliveries?status=failed` (admin) or:
```sql
SELECT kind, status, attempts, left(last_error, 120) FROM notifications WHERE channel = 'email' AND status IN ('failed','pending') ORDER BY created_at DESC LIMIT 20;
```
Check `EMAIL_TRANSPORT` (empty = Brevo; needs `EMAIL_USER` / `EMAIL_PASSWORD`), provider status and quota. After the fix the outbox retries by itself; requeue dead letters as in section 3. Rows with `skipped` are banned users or users without an email — expected.

## 6. Slow bidding / hot lot

`auction_lock_wait_ms` rising means many bidders on the same lot — commands on one auction are serialized by design. Confirm with `http_request_duration_ms{route="/auction/:id/bid"}` and `pg_stat_activity` (`wait_event_type = 'Lock'`). Mitigations: nothing to "fix" in data; keep transactions short (no external calls inside), scale API instances for other lots, and check the bid rate limit (`BID_RATE_LIMIT_MAX`).

## 7. Legacy public proof URLs

Proofs uploaded before T11 are public Cloudinary URLs stored in `orders.payment_proof_url` / `shipping_proof_url`.
1. `npm run db:audit-proofs` → list of affected orders.
2. With the storage owner: copy each file into private storage (or set the Cloudinary assets to authenticated delivery), create `media_assets` rows owned by the original uploader with `purpose` payment/shipping, point the order to `/order/:id/proofs/:assetId`.
3. Revoke/delete the public originals; re-run the audit until it reports zero.
Until done, treat those URLs as public data.

## 8. Backup and recovery

- Backup: `pg_dump -Fc -d "$DATABASE_URL" -f auction-$(date +%F).dump` (rehearsed in T02: restore into a scratch DB and compare row counts). Production should add continuous WAL archiving / managed PITR.
- Restore into a **new** database, point `DATABASE_URL` to it, run `npm run db:migrate` (no-op when current), start API + worker.
- After restoring to an earlier point: events after that point are gone (no notifications for them); clients holding a newer SSE cursor get `reset` and refetch; idempotency keys used after the backup can be replayed as new commands — announce a short freeze rather than letting clients retry blindly.

## 9. Cutover from the legacy app and rollback

Forward-only migrations; rollback = restore the pre-cutover backup.
1. Announce maintenance; **stop the old app** (old and new writers must never run together — they lock differently).
2. `pg_dump` (section 8).
3. Existing legacy DB only — mark the baseline as applied after checking the schema matches `drizzle/0000_baseline.sql`:
   ```sql
   -- WRITE
   CREATE SCHEMA IF NOT EXISTS drizzle;
   CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);
   INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('a0be0f2f7f53629c90c68920d1cd47f01c3c5641d3abffa732c4449a8a738e6d', 1791749635651);
   ```
   (`hash` = sha256 of `0000_baseline.sql`, `created_at` = its journal `when`; recompute if the file ever changes.)
4. `npm run db:migrate`. Preflights abort with a reason instead of guessing: fractional `orders.final_price` (fix data first), duplicate/invalid reviews (`npm run db:resolve-reviews -- --apply` archives them, then migrate again).
5. `npm run db:backfill-maxima` (dry run) → review `ambiguous_tie` / `winner_mismatch` → `-- --apply`. Active legacy lots with unconverted bids refuse new bids (`LEGACY_UNVERIFIED`) until resolved.
6. Start API, then worker: `reconcileLegacyEnded` gives old ended lots their missing orders and reports disagreements (section 2.4). Pending legacy orders got a fresh 48 h payment window in migration 0003.
7. Smoke: `/health/ready` 200, place a bid on a test lot, watch `auctions_overdue_unsettled` return to 0.
8. Rollback before step 6 is a restore of the dump; after users have written to the new schema, rollback loses those writes — decide before reopening traffic.
