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
