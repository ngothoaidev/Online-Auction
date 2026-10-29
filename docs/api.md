# API reference

Base URL (local): `http://localhost:3000`. JSON in and out unless stated. Inventory generated from `backend/routes/*` at T24.
The public read endpoints are also published as OpenAPI 3.1 at `/openapi.json` on the SPA host (`frontend/public/openapi.json`, checked against the real routes by `backend/tests/integration/openapi.test.js`).

## Conventions

| | |
|---|---|
| **Auth** | `Authorization: Bearer <JWT>` from `POST /auth/login`. Tokens carry `av` (auth version): password reset/change and bans invalidate previously issued tokens. Invalid/expired token → `401` (even on public routes); banned → `403`. `Bearer null` is treated as a guest. |
| **Roles** | `buyer`, `seller`, `admin` (+ `unauthorized` before email verification). Bidding, Buy Now, comments and reports also require a verified account. |
| **Errors** | Always `{ "code": "STABLE_CODE", "message": "...", "requestId": "...", "details"?: {...} }`. Business refusals are `4xx` with a stable `code` (e.g. `BID_TOO_LOW` + `details.minimumNextBid`, `AUCTION_ENDED`, `INVALID_TRANSITION`, `PAYMENT_WINDOW_CLOSED`, `ALREADY_REPORTED`). Unexpected errors are `500 INTERNAL_ERROR` without internals. |
| **Request id** | Every response has `X-Request-Id`; a well-formed incoming `X-Request-Id` (8–64 of `[A-Za-z0-9._:-]`) is kept. |
| **Idempotency** | Commands accept `Idempotency-Key` (8–100 of `[A-Za-z0-9._:-]`). Same key + same payload → stored result replayed with `Idempotent-Replayed: true`; same key + different payload → `409 IDEMPOTENCY_CONFLICT`. Keys are per user and per operation. |
| **Money** | Strings of digits (VND, integer, ≤ 15 digits). |
| **Rate limits** | Per IP for auth; per user for bid/Buy Now, comments/reports, uploads (`*_RATE_LIMIT_MAX`) → `429`. |

## Health and metrics

| Method | Path | |
|---|---|---|
| GET | `/health/live` | `200 {status:"ok"}` while the process answers |
| GET | `/health/ready` | `200` when the DB answers and all migrations are applied, else `503`; body lists `database`, `migrations`, `worker` (`ok`/`stale`/`missing`, informational) |
| GET | `/metrics` | Prometheus text. `Authorization: Bearer $METRICS_TOKEN` when set; without a token open in development, `404` in production |

## Auth — `/auth`

`POST /register`, `POST /login`, `POST /validate` (email OTP), `POST /resend-verification`, `POST /forgot-password`, `POST /verify-reset-otp` (→ single-use reset grant), `POST /reset-password` (needs the grant), `GET /me`, `POST /change-password/request-otp`, `POST /change-password/verify` (returns a new token), `GET /google`, `/google/callback`, `/facebook`, `/facebook/callback` (OAuth, needs provider credentials).
Responses never reveal whether an email exists.

## Catalog — public

| Method | Path | Notes |
|---|---|---|
| GET | `/categories` | Tree: `[{id, name, subcategories:[...]}]` |
| GET | `/search` | `q`, `category` (parent includes children), `minPrice`, `maxPrice`, `sortBy`, `page`, `limit` (capped) |
| GET | `/auction/top` | `sortBy=newest|endingSoon|mostBids|highestPrice`, `limit` |
| GET | `/auction/:id` | Lot snapshot: `version`, `serverTime`, `minimumNextBid`, `capabilities {canBid, canBuyNow, reasons}`, seller rating (`null` without reviews) |
| GET | `/auction/:id/events` | **SSE** live updates (below) |
| GET | `/auction/bids/:id` | Public price history (`invalidated` rows marked); `f=all|mine|recent` |
| GET | `/auction/images/:id`, `/auction/description/:id`, `/auction/comments/:id` | |
| GET | `/users/profile?username=` | Public profile; `rating.percentage` is `null` without reviews; own email only for the owner/admin |
| GET | `/reviews`, `/reviews/stats`, `/reviews/:id` | |

### SSE: `GET /auction/:id/events[?since=<version>]`

```
retry: 3000

id: 42:17
data: {"type":"auction.bid_placed","auctionId":42,"version":17,"status":"active","currentPrice":"1500000","bidCount":9,"endTime":"…","serverTime":"…"}

event: reset
data: {"auctionId":42,"version":30}

: ping
```
Reconnects send `Last-Event-ID` (wins over `since`). Versions may skip (some changes publish nothing) — clients refetch `GET /auction/:id`. `reset` = too far behind or cursor in the future → refetch. Limits: `SSE_MAX_PER_IP`, `SSE_MAX_CONNECTIONS` → `429 TOO_MANY_STREAMS`.

## Bidding and listings — `/auction` (auth)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/auction/:id/bid` | verified buyer/seller (not own lot) | `{amount}` = private maximum. `200 {outcome: success|updated|outbid, isLeading, yourMaximum, currentPrice, minimumNextBid, version, endTime, serverTime}`. `outbid` is a 200: the bid was accepted but another maximum is higher. Idempotent. |
| POST | `/auction/:id/buy-now` | verified | Ends the lot and creates the order atomically. Idempotent. |
| POST | `/auction` | seller | `multipart/form-data`: `title, description (sanitized HTML), categoryId, startingPrice, stepPrice, buyNowPrice?, endTime (ISO), autoExtend, allowNewbies`, `images` ×3–10 (JPEG/PNG/WebP, ≤5 MiB) |
| PUT | `/auction/:id` | owning seller | Only `title`, `description`, `categoryId`; title/category frozen after the first bid (`LISTING_LOCKED`) |
| PUT | `/auction/:id/description` | owning seller | Appends a dated update (history kept) |
| DELETE | `/auction/:id` | owner, or admin with `reason` | **Soft cancel** (bids kept); `409` once the lot has a transaction |
| DELETE | `/auction/reject?auctionId=&bidId=` | owning seller | Disqualifies that bidder, recomputes leader/price |
| POST | `/auction/:id/comments` | verified | |
| POST | `/auction/:id/reports` | verified, not own lot | `{reason: counterfeit|prohibited|misleading|offensive|other, details?}`; one open report per user per lot |

## Users — `/users` (auth)

`GET /favorites` (ids), `PUT /favorites/:auctionId {favorited}` (idempotent desired state), `PUT /info`, `PUT /avatar`.
Admin: `GET /`, `GET /stats`, `GET /:id`, `POST /:id/ban {reason}` (required), `POST /:id/unban {reason?}`, `PUT /:id/role {role, reason?}` — audited, idempotent.

## Seller requests — `/seller` (auth)

`POST /request` (buyer), `GET /my-request`; admin: `GET /requests`, `POST /requests/:id/approve {note?}`, `POST /requests/:id/reject {reason?}` (rejected requests are kept: 7-day reapply rule).

## Categories — admin

`GET /categories/admin`, `POST /categories {name, parentId?}`, `PUT /categories/:id`, `DELETE /categories/:id` (refused while it or a subcategory has listings) — audited.

## Orders — `/order` (participants only; outsiders `403`)

| Method | Path | Who / state | |
|---|---|---|---|
| GET | `/order/my` | | Own orders |
| GET | `/order/auction/:auctionId` | seller or winner | `200 {order, reviews, payment {mode, available, attempts}}`, `202 {status:"settlement_pending", retryAfter}` while the worker has not settled, `404` closed without a winner. Read-only. |
| GET | `/order/:id` | | Details + messages |
| POST | `/order/:id/proofs?purpose=payment|shipping|message` | buyer/seller per purpose | `multipart` `file` (JPEG/PNG/WebP ≤5 MiB; authorised **before** the body is read) → `{assetId}` |
| GET | `/order/:id/proofs/:assetId` | participants | Private file, `Cache-Control: private, no-store` |
| POST | `/order/:id/payment` | buyer, `pending_payment`, manual mode | `{paymentProofAssetId, shippingAddress, buyerPhone}` |
| POST | `/order/:id/payment-attempts` | buyer, `pending_payment` | Mock gateway: `{shippingAddress, buyerPhone}` → `201 {attempt {reference, amount, currency, status}}`; locks the order to gateway mode |
| POST | `/order/:id/confirm` | seller, `pending_confirmation` | `{trackingNumber? , shippingProofAssetId?}` (one required) |
| POST | `/order/:id/shipping` | seller, `pending_delivery` | same body |
| POST | `/order/:id/receipt` | buyer, `pending_receipt` | |
| POST | `/order/:id/review` | participants, `pending_review`/`completed` | `{isGoodRating: boolean, comment?}`; target is always the counterpart |
| POST | `/order/:id/cancel` | seller while unpaid, admin until shipped | `{reason}` required |
| GET/POST | `/order/:id/messages`, `POST /order/:id/messages/read` | participants | GET never writes |

All order commands accept `Idempotency-Key` and optional `expectedVersion` (`409 VERSION_CONFLICT`).

## Payments

| Method | Path | |
|---|---|---|
| POST | `/payments/webhook/:provider` | Provider → API. Raw body, signature checked **before** parsing (`X-Mock-Signature: sha256=<hmac>` for the mock). `200 {received, duplicate, outcome}`; outcomes `applied`, `failed_recorded`, `duplicate`, `ignored:*`, `exception:*` (late/mismatched payments never reopen an order) |
| POST | `/payments/mock/:reference/simulate` | Buyer of the attempt, **mock adapter only** (404 otherwise): `{outcome: succeeded|failed, deliver?: false}` (`deliver:false` = lost webhook, recovered by the worker) |

## Notifications — `/notifications` (auth, own only)

`GET /` (`{items, unread}`), `GET /unread-count`, `POST /:id/read` (someone else's id → `404`), `POST /read-all`; admin `GET /admin/deliveries?status=pending|sent|failed|skipped`.

## Moderation — `/admin` (admin)

`GET /admin/reports?status=open|actioned|dismissed|all`, `POST /admin/reports/:id/resolve {action: dismiss|cancel_listing, note}` (closes all open reports of that lot; cancel runs the listing command in the same transaction), `GET /admin/audit?targetType=&targetId=`.
