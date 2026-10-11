# ADR 0001 — Chính sách nghiệp vụ B01–B12

Trạng thái: **áp dụng tạm thời theo default trong requirement.md §B; chưa được chủ sản phẩm phê duyệt.**

| ID | Default đang dùng | Phụ thuộc | Trạng thái |
|---|---|---|---|
| B01 | VND, số nguyên dương ≤ 999999999999999, API dùng chuỗi | T05 | tạm áp dụng |
| B02 | bid đầu ≥ starting; sau đó ≥ current+step | T06 | tạm áp dụng |
| B03 | tie: người đạt max trước thắng; leader chỉ tăng max, giá giữ nguyên | T06 | tạm áp dụng |
| B04 | hợp lệ nếu DB-time < endTime; gia hạn +5 phút trong 5 phút cuối nếu autoExtend | T06 | tạm áp dụng |
| B05 | eligibility active/verified/non-seller/rating≥80% hoặc newbie cho phép | T06 | tạm áp dụng |
| B06 | Buy Now khi active, chưa hết hạn, current < buyNow | T06 | tạm áp dụng |
| B07 | active→ended sau settlement; sold khi đã thanh toán; cancelled có lý do | T09/T10 | chờ xác nhận |
| B08 | hạn thanh toán 48h, cấu hình được | T10 | chờ xác nhận |
| B09 | seller hủy pending_payment; admin hủy trước giao; không tự tạo review xấu | T10 | chờ xác nhận |
| B10 | review từ pending_review; hai bên review → completed; vẫn sửa được | T12 | chờ xác nhận |
| B11 | reject = vô hiệu hóa bidder, giữ lịch sử, tính lại leader | T07 | chờ xác nhận |
| B12 | winner bị ban → tính lại; không ai → ended không order | T09 | chờ xác nhận |

Mọi thay đổi sau khi chủ sản phẩm quyết định sẽ cập nhật bảng này.
