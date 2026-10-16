# Indoor Spatial Design System

## Nguyên tắc

- Giao diện tiếng Việt, rõ ràng và hướng nghiệp vụ.
- Màu chủ đạo xanh dương nhạt; champagne chỉ dùng làm điểm nhấn nhỏ.
- Font giao diện là Be Vietnam Pro; tiêu đề lớn dùng Cormorant Garamond.
- Card chỉ dùng để nhóm nội dung hoặc thao tác thực sự, không dùng làm vật trang trí.
- Khoảng cách theo bội số 4px; điều khiển bo 8px, card bo 12px.
- Ưu tiên đường kẻ nhẹ thay cho bóng; bóng chỉ dành cho lớp nổi.
- Mọi trạng thái tải, rỗng, lỗi và thao tác đang gửi phải có phản hồi rõ ràng.

## Token

Token được định nghĩa tập trung trong `src/theme/theme.ts` và `src/styles/global.css`. Component không tự khai báo màu hex mới.

## Thành phần dùng chung

`BrandLogo`, `PageHeader`, `StatStrip`, `StatusTag`, `SectionCard` và `FloorPlanIllustration` nằm trong `src/components/ui/`.

## Không được làm

- Không thêm gradient làm nền chính.
- Không dùng emoji trong giao diện.
- Không tạo card lồng card hoặc nút văn bản dài cho thao tác chỉ cần icon.
- Không dùng màu tuỳ ý ngoài token.
- Không bỏ qua trạng thái loading, empty hoặc error của một luồng dữ liệu.
