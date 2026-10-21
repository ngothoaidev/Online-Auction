# Demo script (≈ 10 minutes)

Shows the core loop end to end, then proves one concurrency guarantee and one crash recovery.
Setup: README "Quick start" (API on :3000, worker running, SPA on :5173, seeded DB). Use two browser windows
(one normal, one private) so two buyers can be signed in at once. Password for every demo user: `Passw0rd!demo`.

## 1. Two buyers, one lot (live prices)
1. Window A: log in as **demo_seller** → *Create listing* → 3 photos, starting price 1.000.000, step 100.000, end time **~4 minutes from now** → publish. (Or use any seeded lot ending soon.)
2. Window A: log out, log in as **demo_buyer1**, open the lot. Window B: **demo_buyer2**, same lot.
3. buyer1: enter a maximum of 2.000.000 → *Review bid* → note the summary (nothing is sent yet) → *Place bid* → "You are the highest bidder". The price shows 1.000.000: proxy bidding only raises as far as needed.
4. buyer2: bid 1.500.000 → the result says **"You were outbid"** (accepted, but buyer1's private maximum is higher). Window A updates the price to 1.600.000 **without reloading**; buyer1's maximum is never shown anywhere.
5. buyer2 bids 2.500.000 → buyer2 now leads at 2.100.000, and buyer1's bell shows **"You were outbid on …"** (sent only to the bidder who lost the lead).

## 2. Disconnect and retry
1. In window B open DevTools → Network → *Offline*. The panel says **"You are offline. The price shown may be out of date."**
2. In window A, bid again with a higher maximum.
3. Window B back *Online*: the page refetches and shows the new price, then the label disappears.
4. Retry safety: each confirmed bid carries an `Idempotency-Key` (DevTools → request headers). Replaying the same request returns the stored result with `Idempotent-Replayed: true` and never bids twice.

## 3. The lot closes by itself
1. Close both lot tabs (nobody watching). When the end time passes, the worker settles the lot within one poll (`WORKER_POLL_MS`, 5 s by default).
2. The winner gets "You won …" (bell + email in the dev mail sink), the seller gets "… sold".
3. Winner: click the "You won" notification (or open `/order/<lot id>`) → the order page shows the amount from the server and the payment deadline (48 h).

## 4. Payment, shipping, receipt, reviews
1. Winner: **Pay with the mock gateway** (labelled: no real money) → address + phone → *Start mock payment* → *Simulate successful payment* → "Payment Recorded". (Alternative: manual receipt upload — the file is private; only the two participants can open it.)
2. Seller: open the order → *Payment Recorded: Ship the Item* → upload an invoice image + tracking number → *Send Shipping Info*.
3. Buyer: *I Have Received the Item* → confirmation dialog → review form → Positive + comment → submit.
4. Seller: review the buyer → **Transaction Completed**. Ratings update exactly once.
   Variant worth showing: *Simulate a lost confirmation* — the order stays unpaid until the worker's reconciliation (≤ `PAYMENT_RECONCILE_AFTER_MS`) records it, exactly once.

## 5. Proof: concurrency
```bash
cd backend
node --test --test-concurrency=1 --test-name-pattern="50 concurrent bids" tests/integration/bidding.test.js
```
50 users bid on the same lot at the same instant against real PostgreSQL. The test checks that command sequence numbers are contiguous (no two commands interleaved), that replaying the committed order through the pure bidding engine gives the same winner and price, that every public event has its own sequence and that prices never go down. Load version: `node scripts/loadtest.js` (see `docs/validation/load-t23.json`: 0 errors, invariants hold).

## 6. Proof: crash and recovery
```bash
cd backend
# create a lot that has ended with a bid on it (or let one expire), then:
FAULT_POINT=settle.before_commit WORKER_ONCE=1 npm run worker   # the worker dies inside the settlement transaction (exit 86)
# -> the lot is still active, no order, no event: the transaction rolled back
WORKER_ONCE=1 npm run worker                                    # a fresh worker settles it exactly once
```
Automated version: `node --test --test-concurrency=1 tests/integration/faults.test.js` (also kills the dispatcher after a side effect and shows the at-least-once email window).

## 7. Operations view
```bash
curl -s localhost:3000/health/ready     # database, migrations, worker heartbeat
curl -s localhost:3000/metrics | grep -E "^(auctions_overdue|outbox_backlog|payment_exceptions|worker_heartbeat|sse_connections)"
```
Stop the worker for a minute and watch `/health/ready` report it `stale` and `auctions_overdue_unsettled` rise; start it again and they recover.
