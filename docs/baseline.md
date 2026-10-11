# Baseline (T01) — 2026-10-12, main@368b114

## Môi trường đo thực tế
- Node v24.18.0, npm 11.16.0, Docker 29.6.2 (daemon khởi động thủ công từ Docker Desktop). Không có `psql`/PostgreSQL cài sẵn.
- backend `npm ci`: OK (lockfile khớp).
- frontend `npm ci`: **EUSAGE** — lockfile lệch package.json (`@floating-ui/dom` missing, core/utils sai version). Đã chạy `npm install` để đồng bộ lock (18+/25− dòng trong `frontend/package-lock.json`).
- frontend `npm run lint`: exit 1 — 39 errors, 8 warnings (legacy: no-unused-vars, no-dupe-keys, no-useless-escape, hooks deps). Chủ sở hữu: T13–T17 xử lý theo từng màn hình; không hạ rule.
- frontend `npm run build`: exit 0, bundle JS 971 kB (cảnh báo chunk >500 kB; code-split cân nhắc ở T23).
- backend `npm test`: placeholder (exit 1) → T02 thay thế.

## Secret / lịch sử Git
- `frontend/.env` tracked: chỉ `VITE_RECAPTCHA_SITE_KEY` (khóa public) và `VITE_API_URL` đã comment.
- `backend/.env` **từng được commit** trong lịch sử (các commit 728935b…e964ffd; bị gỡ ở 919c1d0 "Secure backend/.env"). Nội dung KHÔNG được đọc/in trong phiên này (bị chặn bởi permission). **Hành động cho chủ hệ thống:** coi mọi credential đã từng nằm trong file đó (DB, JWT, session, Google/Facebook OAuth, Cloudinary, SMTP) là đã lộ và xoay vòng; cân nhắc làm sạch history. Chưa thể xác nhận có secret thật hay không.
- Biến môi trường backend đang dùng trong code: DATABASE_URL, PORT, NODE_ENV, JWT_SECRET, JWT_EXPIRES_IN, PASSWORD_SALT_ROUNDS, SESSION_SECRET, FRONTEND_URL, GOOGLE_*, FACEBOOK_*, CLOUDINARY_*, EMAIL_*. Đã liệt kê trong `backend/.env.example`.

## DB inventory
Chưa có DB thật được cấp → kiểm kê orphan/duplicate/fractional/legacy proof là **blocker dữ liệu riêng**; migration (T05/T12) phải có preflight báo cáo, không giả định dữ liệu sạch. Rehearsal dùng fixture legacy.

## Screenshot baseline 390/768/1280/1440
Chưa chụp (cần chạy app + DB + trình duyệt); thực hiện ở T13 trước khi sửa visual.

## Findings F01–F25
Giữ nguyên theo design.md D1.2; các điểm lệch so với source sẽ được ghi vào progress.md khi gặp.
