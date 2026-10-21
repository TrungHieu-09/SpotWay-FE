# Indoor Spatial Design System

## Aurora theme

Aurora là theme mặc định: nền indigo tối, lưới không gian mờ, ánh sáng violet/cyan và bề mặt glass. Theme sáng vẫn được hỗ trợ; `ThemeProvider` lưu lựa chọn tại `ui:theme`, không tự suy ra từ hệ điều hành. `ThemeToggleButton` là điểm chuyển đổi dùng chung.

Mọi token Ant Design nằm trong `src/theme/theme.ts`, token CSS semantic nằm trong `src/styles/global.css`. Page chỉ dùng biến semantic hoặc primitive trong `src/components/ui/`. Font chính là Plus Jakarta Sans, Be Vietnam Pro là fallback.

Primitive Aurora gồm `GlassCard`, `SectionLabel`, `GradientText`, `StatusTag`, `EmptyState`, `ConfirmDelete`, `FormSection`, `DataTableToolbar`, `KeyValueList`, `FloatingChip` và `IsometricFloors`.

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

## Chuyển động và popup

Không dùng selector `*` hoặc `.ant-*` để tắt animation. Khi người dùng chọn giảm chuyển động, `ThemeProvider` lắng nghe media query và truyền `motion: false` vào ConfigProvider; CSS chỉ giảm hiệu ứng của lớp tự viết. Popup AntD giữ portal mặc định ra `document.body`, `zIndexPopupBase` là 1100 để Select, DatePicker, Dropdown, Tooltip, Popover và Modal không bị cắt.

## Route coverage

| Khu vực | Route | Thành phần giao diện chính |
| --- | --- | --- |
| Public | `/` | Hero Aurora, minh họa sàn isometric, bốn role card |
| Auth | `/login` | Form đăng nhập, chọn role demo, theme dùng chung |
| Admin | `/admin`, `/admin/tenants`, `/admin/accounts`, `/admin/plans` | PageHeader, bảng glass, filter/select portal, trạng thái tải/rỗng |
| Chủ tòa nhà | `/owner/*` | PageHeader, StatStrip, bảng tài sản/nhân sự/gói dịch vụ |
| Quản lý tòa nhà | `/manager` | EditorShell, tab canvas/geometry/3D/graph và sidebar responsive |
| Chủ gian hàng | `/store/profile`, `/store/promotions` | Chọn gian hàng, form upload, bảng khuyến mãi và trạng thái |
| Khách | `/guest` | Bản đồ 2D/3D, tìm đường, panel chỉ dẫn ưu tiên mobile |

Kiểm tra contrast tự động bằng `npm run contrast`. Chạy `npm run build` và `npm run lint`; kiểm tra giảm chuyển động bằng DevTools Rendering > Emulate CSS media feature `prefers-reduced-motion` ở cả `reduce` và `no-preference`, sau đó mở Select/DatePicker/Dropdown/Tooltip/Popover/Modal/Drawer để xác nhận popup vẫn nhìn thấy và tương tác được.

## Không được làm

- Không thêm gradient làm nền chính.
- Không dùng emoji trong giao diện.
- Không tạo card lồng card hoặc nút văn bản dài cho thao tác chỉ cần icon.
- Không dùng màu tuỳ ý ngoài token.
- Không bỏ qua trạng thái loading, empty hoặc error của một luồng dữ liệu.
