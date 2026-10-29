# Security notes

What is protected, how, and where the evidence is. Not a formal audit; known gaps are listed at the end.

| Area | Control | Evidence |
|---|---|---|
| Password reset | OTP → short-lived, single-use, purpose-scoped reset grant (HMAC-stored); consumed in the same transaction as the password change; max attempts; no account enumeration | `tests/integration/auth.test.js` |
| Sessions / tokens | JWT with `av` auth version: reset/change password and bans revoke issued tokens; invalid/expired → 401; `JWT_SECRET`/`SESSION_SECRET` required at boot | `auth.test.js`, `access.test.js` |
| Authorization | Server-side role + ownership checks on every route; participants-only orders, proofs and messages; admin-only moderation; UI checks are UX only | `access.test.js`, `adminModeration.test.js`, `media.test.js` |
| Data exposure | Explicit response DTOs: no bidder maxima, password hashes, OTPs, emails (except own/admin), provider ids; public SSE/outbox payloads carry public fields only | `privacy.test.js` (recursive scan of public JSON), `realtime.test.js`, `outbox.test.js` |
| Input | Zod validation of params/query/body/multipart; allowlisted seller edits (mass assignment refused); money as bounded integer strings; pagination caps | `privacy.test.js`, `tests/unit/validation.test.js` |
| HTML / XSS | `sanitize-html` on write and on read (legacy rows), DOMPurify on render; email templates escape user text | `privacy.test.js`, `frontend/tests/unit/safehtml.test.jsx`, `notifications.test.js` |
| Uploads | Authorised before the body is read; 1 file ≤ 5 MiB; magic-byte sniffing (JPEG/PNG/WebP only; SVG/HTML refused); server-generated names outside the static root; private reads with `no-store` + `nosniff`; IDOR checks | `media.test.js`, `listing.test.js` |
| Payments | Webhook signature verified on the raw body before parsing; provider event ids deduplicated; amount/currency/reference checked against the order; mock controls unreachable unless the mock adapter is active | `payments.test.js` |
| Abuse | Rate limits: auth per IP, bids/Buy Now, comments/reports, uploads per user; SSE connection caps; JSON body 100 kB | `rateLimit.test.js`, `realtime.test.js` |
| Integrity | Idempotency keys; row locks + DB clock for deadlines; unique constraints (one order per auction, one review per reviewer, one open report); append-only `order_transitions` and trigger-protected `admin_audit` | `bidding.test.js`, `orders.test.js`, `adminModeration.test.js` |
| Headers / transport | `helmet`, CORS allowlist (`CORS_ORIGINS`/`FRONTEND_URL`), httpOnly + sameSite session cookie (secure in production) | `privacy.test.js` |
| Logging | JSON logs with recursive redaction (password, token, secret, cookie, otp, email, phone, address, maximum, proof); no request bodies; paths logged without query strings | `tests/unit/log.test.js`, `observability.test.js` |
| Moderation | Every admin action audited with actor, reason and allowlisted before/after; reasons required for bans and listing cancellation | `adminModeration.test.js` |

## Known gaps / owner actions

- **Old secrets in Git history**: a `backend/.env` was committed before this upgrade. The owner rotated those credentials (2026-10-22); `.env` files are now ignored. Never reuse a value that was ever in that file.
- **Legacy proof URLs** uploaded before private storage existed are public Cloudinary links; migrating/locking them needs the storage owner (`npm run db:audit-proofs` lists affected orders).
- OAuth flows (`state` enabled) are untested without real provider credentials.
- Behind a reverse proxy, set Express `trust proxy` so per-IP limits see real client IPs.
- No CSRF tokens: the API uses bearer tokens from `localStorage`, not cookies, for authenticated calls (sessions are only used for the OAuth handshake). The trade-off is that an XSS bug could read the token; mitigated by sanitization on write/read/render. `helmet`'s CSP covers API responses only — the static host serving the SPA must add its own Content-Security-Policy.
- No malware scanning of uploads; images are sniffed but not re-encoded.
