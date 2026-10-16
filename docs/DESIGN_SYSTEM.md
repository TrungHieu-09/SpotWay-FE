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

`BrandLogo`, `PageHeader`, `StatStrip`, `StatusTag`, `SectionCard`, `FloorPlanIllustration` và `EditorShell` nằm trong `src/components/ui/`.

## Không gian bản đồ

`EditorShell` cung cấp khung làm việc chung cho các tab quản lý sơ đồ: thanh công cụ dọc, thanh ngữ cảnh tòa nhà/tầng, trạng thái lưu và vùng bản đồ. Các bảng thuộc từng tính năng vẫn được giữ trong tab tương ứng để không làm mất nghiệp vụ hiện có.

Màu phòng, POI và lộ trình dùng `mapTokens` trong `src/theme/theme.ts`, áp dụng thống nhất cho trình xem 2D, nhận diện sơ đồ và 3D. Trang Guest ưu tiên bản đồ trên màn hình nhỏ: bản đồ hiển thị trước, tiếp theo là tìm đường và chỉ dẫn; các vùng thao tác có thể cuộn ngang hoặc xếp một cột dưới 900px.

Các nút, liên kết và điều khiển biểu mẫu có focus ring rõ ràng để hỗ trợ điều hướng bằng bàn phím. Luồng tải dữ liệu dùng Spin hoặc loading state của Ant Design; trạng thái rỗng và lỗi dùng Empty/Alert hoặc message theo ngữ cảnh.

## Không được làm

- Không thêm gradient làm nền chính.
- Không dùng emoji trong giao diện.
- Không tạo card lồng card hoặc nút văn bản dài cho thao tác chỉ cần icon.
- Không dùng màu tuỳ ý ngoài token.
- Không bỏ qua trạng thái loading, empty hoặc error của một luồng dữ liệu.
