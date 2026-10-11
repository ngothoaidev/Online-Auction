# Progress — Online-Auction Upgrade

Branch: `feature/auction-upgrade` (từ main@368b114). Không push/merge/deploy. Không subagent.
Môi trường: Node 24.18, npm 11.16, Docker Desktop; PostgreSQL 16 trong Compose tại **localhost:55432** (5432/5433 trên máy đã bị DB khác chiếm — không đụng).

## Quyết định
- B01–B12: dùng default của requirement.md, ghi tại `docs/adr/0001-business-policies.md`; **chưa được chủ sản phẩm duyệt** (B07–B12 cần xác nhận trước T07/T09/T10/T12).
- Lint legacy: `no-unused-vars` hạ xuống warning (backend 16, frontend 34 warnings); mọi lỗi thật (no-undef, dupe keys…) vẫn là error và đã sửa.
- Playwright chỉ scaffold, chưa cài browser.

## T01 — XONG (với blocker ghi nhận)
Files: docs/baseline.md, docs/adr/0001-business-policies.md, backend/.env.example, frontend/.env.example.
Kết quả thật: backend npm ci OK; frontend npm ci EUSAGE (lock lệch) → `npm install` đồng bộ lock; lint FE baseline exit 1 (39 errors); build FE exit 0.
Blockers: (1) `backend/.env` từng commit trong history — đọc nội dung bị permission chặn, không lách; chủ hệ thống cần xoay vòng secret. (2) Không có DB thật → chưa kiểm kê dữ liệu; (3) chưa chụp screenshot baseline (làm ở T13).

## T02 — XONG
Files: compose.yaml, scripts/init-test-db.sql, .github/workflows/ci.yml, README.md, backend/{drizzle/0000_baseline.sql, eslint.config.js, scripts/migrate.js, scripts/seed.js, tests/**}, frontend/{vite.config.js (vitest), tests/, e2e/, playwright.config.js, eslint.config.js}.
Commands/kết quả:
- `backend npm run lint` 0 errors/16 warnings; `test:unit` 1 pass; `test:integration` 3 pass (migration trên DB rỗng + app boot, test DB guard `*_test`).
- `frontend npm run lint` 0 errors/34 warnings; `npm test` 4 pass; `npm run build` OK.
- migrate + seed idempotent trên dev DB; API start → /categories 200, /system/live-stats 200.
- Backup/restore rehearsal (pg_dump -Fc → pg_restore vào DB tạm): 4 users/2 auctions khớp.
- CI chưa chạy trên GitHub (chưa push).
Sửa bug phát hiện: `UserService` undefined (controllers/auth.js deleteUser), case-declaration (services/auction.js), AuthCallback có effect chết gây xóa authToken, `pridoduct` typo (admin ProductList), dupe keys BidHistory, `setIsOpen` ở ProductTabs (phần sort/category của View All vẫn ở T08).
Chưa làm: baseline migration chưa rehearsal trên "schema cũ có dữ liệu" — baseline không được áp lên DB đã có bảng; dùng cutover thủ công (runbook T24).

## Tiếp theo
T03 (reset-password grants, requireAuth đúng, authVersion, bỏ logging body, secret bắt buộc, rate limit) → T04.

## T03 — XONG
Hành vi: reset-password cần reset grant (OTP → grant 5 phút, single-use, hash HMAC, tối đa 5 lần thử, consume cùng transaction với đổi mật khẩu); verify-email/change-password dùng challenge riêng theo purpose (bỏ `users.otp`); forgot/resend không lộ email tồn tại; login trả cùng lỗi cho sai tài khoản/mật khẩu; `authVersion` trong JWT (`av`), reset/change password vô hiệu hóa token cũ (change-password trả token mới); token sai/hết hạn/bị thu hồi → 401, user ban → 403 (có hiệu lực với token đã phát); `Bearer null/undefined` coi là guest. Sửa import nhầm `requireAuth` ở 4 router; thêm `requireVerified` cho bid/buy-now/comment; router `/order` có `requireAuth`, controller order dùng `req.user` (không tự verify JWT). Rate limit auth (20/15 phút/IP, cấu hình), CORS theo `CORS_ORIGINS`/`FRONTEND_URL`, bắt buộc `JWT_SECRET` + `SESSION_SECRET`, session cookie httpOnly+sameSite, OAuth `state:true`, sửa điều kiện Facebook (APP_ID), bỏ log password/body/user/hash. Local email sink (`EMAIL_TRANSPORT=local`).
Frontend: ForgetPassword gửi `resetToken`; ChangePasswordModal lưu token mới; `services/sessionGuard.js` bọc fetch để dọn token khi server báo phiên chết (tạm thời đến khi có apiClient ở T14).
Files: backend/{services/accountSecurity.js, services/authChallenges.js, services/auth.js, middleware/auth.js, middleware/rateLimit.js, controllers/auth.js, controllers/order.js, routes/*, app.js, config/passport.js, db/schema.js, drizzle/0001_auth_challenges.sql, utils/email.js, tests/**}, frontend/{main.jsx, contexts/AuthContext.jsx, pages/Auth/ForgetPassword.jsx, components/ChangePasswordModal.jsx, services/sessionGuard.js}.
Kết quả: `npm run test:integration` 20 pass (reset không grant / wrong-purpose / expired / reused / 4 reset đồng thời → đúng 1 thành công / attempts cap / token cũ bị thu hồi / guest 401 trên 38 route / ban / role matrix / unverified / outsider order 403 / OAuth guard / rate limit 429). Lint BE 0 errors; FE lint 0 errors + build OK.
Chưa kiểm chứng: OAuth thật với Google/Facebook (không có credentials; `state:true` cần session cookie giữa redirect — kiểm tay khi có credentials). Seller-expiry vẫn ghi DB trong auth path (đánh dấu `ponytail:` cho T09/T10). Token legacy không có `av` bị buộc đăng nhập lại.
Tiếp theo: T04 (DTO/ẩn maxAmount & bidder fields, input allowlist, sanitize HTML, error handler chuẩn/not_found, rate limit bid/comment/upload).

## T04 — XONG
Hành vi: DTO allowlist (`backend/serializers/index.js`) cho catalog/home/profile-tab/search/bid history/comments/self-user — bỏ `maxAmount`, toàn bộ user row của bidder (hash, OTP, email, provider ids); `/users/profile` chỉ trả email cho chủ tài khoản/admin; update profile/avatar trả `selfUser`. Validation zod server (`backend/validation/`): id/pagination/search/sort/status/bid/comment/create (boolean multipart 'true'/'false', tiền = chuỗi số nguyên ≤15 chữ số), `PUT /auction/:id` chỉ cho `title/description/categoryId` (field khác → 400, không âm thầm bỏ qua). HTML: `sanitize-html` ở ghi + đọc (description, description history, legacy dirty rows) và `DOMPurify` phía client (`SafeHtml`). Envelope lỗi chuẩn `{code,message,requestId}` + `X-Request-Id`, sửa thứ tự `not_found`/`error_handler`, lỗi nghiệp vụ trong services/auction.js dùng `AppError` (404/403/400 thay vì 500 bị che), `helmet`, JSON body 100kb, rate limit per-user cho bid/buy-now (30/phút), comment (10/phút), upload (10/10 phút). Sửa bug: `createComment` dùng `comments.id` không tồn tại → comment mới lỗi; search cho guest không còn query `= NULL`; bỏ `searchFavorites` chết.
Quyết định: giữ nguyên tên/hiển thị bidder trong history (không mask) để không đổi payload ngầm — việc mask thuộc contract mới ở T07/T15. `description` bị bỏ khỏi catalog DTO (không consumer nào dùng).
Tests: backend unit 6 pass, integration 32 pass (privacy recursion trên 13 URL × guest/auth, mass-assignment, XSS read/write, 400 envelope, rate limit 429), frontend vitest 11 pass (6 fixture XSS), lint 0 errors, build OK.
Chưa làm / ghi chú: multipart create vẫn dùng Cloudinary storage trực tiếp (upload qua adapter local + giới hạn size/MIME ở T11); `DELETE /auction/:id` vẫn hard-delete (T07); `Bearer` money vẫn là số trong DB `numeric(15,0)`, chuyển BigInt/idempotency ở T05.
Tiếp theo: T05 (money module, bidderMaxima, version/sequence, commandRequests, audit, outbox, migration `orders.final_price`).
