# SpotWay: tổng hợp tính năng và luồng xử lý

Tài liệu mô tả những gì đã làm được trên nhánh `final` của ba repo (`SpotWay-BE`, `SpotWay-FE`, `SpotWay-Mobile`), mỗi tính năng được xử lý ra sao, và các luồng đi từ đầu đến cuối. Cập nhật 19/11/2026.

Sơ đồ đi kèm: `docs/SpotWay-Diagrams.html` (xem trực tiếp) và `docs/SpotWay-Diagrams.md` (mã Mermaid để dán vào draw.io).

---

## 1. Tổng quan

SpotWay là nền tảng chỉ đường trong nhà cho tòa nhà, trung tâm thương mại. Nền tảng đa tenant: mỗi chủ tòa nhà có không gian riêng, mỗi tòa có Manager riêng, dữ liệu mỗi tòa tách biệt.

| Thành phần | Công nghệ | Việc chính |
|---|---|---|
| **BE** (`SpotWay-BE`) | NestJS, Prisma, PostgreSQL (Supabase), MongoDB Atlas | API, phân quyền, đồ thị đường đi, báo cháy, điều hành, phân tích |
| **Web** (`SpotWay-FE`) | React, Vite, Ant Design, Zustand, react-konva | Quản trị, vẽ sơ đồ, quản lý gian hàng và điều hành, thống kê. Có trang khách `/navigate/:buildingId` không cần cài app |
| **Mobile** (`SpotWay-Mobile`) | Expo (SDK 58), expo-router, react-native-svg | App khách: quét QR, tìm đường, định vị, sơ tán |

### Vai trò

| Vai trò | Phạm vi |
|---|---|
| **Admin** | Tạo workspace (Tenant) và tài khoản Owner, khóa hoặc mở tài khoản |
| **Building Owner** | Tạo tòa nhà, tạo Manager và gán vào từng tòa, tạo Store Owner, xem thống kê khách |
| **Building Manager** | Chỉ trên tòa **được gán**: sơ đồ, QR, gian hàng, khuyến mãi, bảo trì, báo cháy, điều hành, nhật ký |
| **Store Owner** | Quản lý thông tin gian hàng và khuyến mãi của mình (Manager cũng nhập thay được) |
| **Guest** | Dùng app mobile hoặc web khách, không cần tài khoản |

Tài khoản do Admin cấp. Đăng ký tự phục vụ, đặt gói, OTP email, quên mật khẩu đã được nhóm **cố ý gỡ** từ 06/11 (commit `228d945`) nên không có trong hệ thống. Các bảng `plan_orders` và `email_otps` vẫn còn trong cơ sở dữ liệu nhưng chưa có chức năng nào dùng.

---

## 2. Luồng tổng thể

1. **Admin** tạo workspace và tài khoản Owner, nhận mật khẩu tạm và chuyển cho Owner. Lần đăng nhập đầu Owner bị buộc đổi mật khẩu.
2. **Owner** tạo tòa nhà, tạo Manager và chọn tòa cho Manager (bản ghi `StaffAssignment`).
3. **Manager** tải ảnh sơ đồ từng tầng, hiệu chuẩn tỉ lệ (mét trên pixel), vẽ node và cạnh, đặt POI (tự gắn vào node gần nhất), khai báo thang máy, thang bộ liên tầng.
4. **Manager** nhập gian hàng và khuyến mãi của các chủ gian hàng.
5. **Manager** xuất bản tầng, tạo mã QR, **in poster A4** dán tại vị trí tương ứng.
6. **Khách** quét QR. App lấy `buildingId` từ QR, tải đúng tòa, hiển thị bản đồ.
7. **Khách** tìm điểm đến, nhận đường đi, được dẫn đường theo thời gian thực.
8. Khi có sự cố, **Manager** bật trên web, điện thoại khách tòa đó nhận sau tối đa khoảng 5 giây.
9. Mọi hành vi của khách được ghi thành sự kiện, **Owner** xem thống kê. Mọi thao tác của nhân sự được ghi vào nhật ký.

---

## 3. Dữ liệu và phân quyền

### 3.1 Mô hình dữ liệu (PostgreSQL, Prisma)
- **Tài khoản:** `Tenant`, `User` (vai trò, trạng thái ACTIVE/LOCKED, `mustChangePassword`), `RefreshSession`, `OAuthCode`, `StaffAssignment` (Manager gắn với tòa).
- **Không gian:** `Building`, `Floor` (trạng thái DRAFT hoặc PUBLISHED, `metersPerPixel`), `Node` (loại: NORMAL, DOOR, ELEVATOR, STAIR, ESCALATOR, JUNCTION, EXIT, EMERGENCY_EXIT), `Edge` (ACTIVE hoặc BLOCKED, `weightMeters`), `Poi`, `Connector` và `ConnectorStop` (thang nối các tầng), `ElevatorLink`, `QrAnchor` (chỉ lưu **băm** của token), `FloorMapRevision`.
- **Thương mại:** `Store`, `Promotion`.
- **Phân tích:** `OutboxEvent`.

### 3.2 MongoDB (Atlas)
| Collection | Nội dung | Thời hạn |
|---|---|---|
| `navigation_events` | Sự kiện hành vi khách (tìm kiếm, quét QR, bắt đầu và hoàn thành tuyến, sơ tán, hỗ trợ, an toàn) | TTL 90 ngày |
| `activity_logs` | Nhật ký thao tác của nhân sự theo từng tòa | TTL 180 ngày |

Cả hai đều ghi theo kiểu "có Mongo thì ghi, không có thì bỏ qua" nên Mongo lỗi không làm hỏng chức năng chính.

### 3.3 Phân quyền
- JWT, `RolesGuard`, `TenantStatusGuard` (tenant bị khóa thì mọi tài khoản của nó bị chặn), `RateLimit` cho các đường công khai.
- `TenantAccessService.building()` kiểm tra: cùng tenant, và nếu là Manager thì phải có `StaffAssignment` với tòa đó.
- Với gian hàng và khuyến mãi dùng thêm `manager-scope.ts`: Manager chỉ thấy và sửa gian hàng của tòa mình.
- Đã kiểm tra thật: Manager phát báo cháy, đóng khu vực, tạo gian hàng ở tòa được gán được; ở tòa khác cùng tenant hoặc tenant khác đều bị 403.

---

## 4. Các tính năng và cách xử lý

### 4.1 Đa tòa trên mobile
- Mã QR chứa đường link `…/navigate/<buildingId>?qr=<token>` (hoặc chỉ token). App gọi `GET /qr/:token`, nhận `nodeId`, `floorId`, `buildingId`.
- `switchBuilding(buildingId)` đổi tòa đang dùng và **xóa sạch** dữ liệu tòa cũ (bản đồ, điểm đến, khuyến mãi, báo cháy, đóng cửa, vị trí) để không lẫn sang tòa mới.
- Mỗi tòa có cache riêng (`spotway.venue.v1.<buildingId>`); tòa gần nhất được nhớ cho lần mở sau. Mất mạng vẫn mở được bản lưu.
- Nếu đang tải tòa A mà khách quét tòa B, kết quả của A bị bỏ.
- QR thuộc tòa chưa xuất bản: app kiểm tra danh sách tầng, rỗng thì báo "Tòa nhà này chưa mở bản đồ cho khách".
- Còn một giá trị mặc định: khi chưa quét QR, app mở SpotWay Plaza (có thể đổi bằng `EXPO_PUBLIC_BUILDING_ID`) để nút xem thử hoạt động.

### 4.2 Tìm đường
- Đồ thị gồm node và cạnh, trọng số là khoảng cách mét (pixel nhân `metersPerPixel`). Thuật toán tìm đường ngắn nhất (Dijkstra) chạy ở BE (`/public/routes`) và cũng được **sao chép vào app** nên tính tuyến ngay trên máy, không phụ thuộc mạng.
- Cạnh có trạng thái `BLOCKED` bị bỏ qua.
- **Chế độ xe lăn:** chỉ đi qua liên kết dọc là thang máy, không dùng thang bộ hay thang cuốn. Không có đường thì báo "không có đường".
- Liên kết giữa các tầng lấy từ `Connector` và `ElevatorLink`, nếu thiếu thì suy ra từ vị trí node cùng loại ở các tầng.
- **Lộ trình nhiều điểm** (`multistop`): tối ưu thứ tự ghé thăm; chính xác khi tối đa 7 điểm, nhiều hơn thì dùng phương pháp gần đúng.
- Còn có: bản đồ 2D, bản đồ 3D, danh sách bước, đọc giọng nói chỉ đường, lưu chỗ đỗ xe, tìm kiếm gần đây, chữ lớn và tương phản cao, tiếng Việt và tiếng Anh.

### 4.3 Định vị trực tiếp và tính lại đường
- Không dùng GPS (trong nhà không có). Dùng **cảm biến bước chân** (Pedometer) và **la bàn** (heading), kết hợp **dead reckoning ràng buộc theo đồ thị**: vị trí luôn nằm trên cạnh, tại ngã rẽ chọn hướng gần với la bàn nhất (có thưởng cho cạnh nằm trên tuyến đang đi).
- Chiều cao (tầng) do khách **bấm chọn tầng**; điện thoại chỉ lo mặt phẳng.
- Phát hiện đi lệch: ra khỏi tuyến hơn 6 m trong 2 mẫu liên tiếp thì tính lại đường từ vị trí hiện tại. Đi ngược tuyến hơn 6 m cũng tính lại. Cách đích 2,5 m coi là đã đến.
- Bấm nhầm tầng: nút hoàn tác trong 90 giây.
- Vì phải demo trong phòng, có **chế độ "Trình diễn"**: người đi giả lập chạy qua đúng cơ chế định vị trên, tự rẽ ở góc, có nút "đi ngược" để thấy app tính lại đường. Đã mô phỏng 794/794 cặp điểm đến nơi và 570/570 lần lệch tuyến phục hồi được.
- Hạn chế: chưa kiểm tra cảm biến thật trong tòa; la bàn trong nhà dễ nhiễu.

### 4.4 Báo cháy và sơ tán
- Manager chọn các node cháy trên web, BE lưu **trong bộ nhớ theo từng tòa** (cố ý: mất khi khởi động lại để không bao giờ hiện lại báo động cũ).
- Điện thoại hỏi `GET /public/buildings/:id/incident` mỗi 5 giây. Có báo cháy thì app tự chuyển sang màn sơ tán, dù khách đang chỉ đường bình thường tới đâu.
- Mọi đích bị đổi thành **lối thoát gần nhất** (`findRouteWithHazardPolicy`), tuyến tránh khu vực cháy.
- **Chia khách theo lối thoát:** mỗi điện thoại báo lối nó đi (`claim`, hiệu lực 20 giây). Chi phí một lối = khoảng cách + 25 m cho mỗi người khác đang tới lối đó. Chỉ đổi lối khi lối khác rẻ hơn ít nhất 15 m (tránh nhảy qua lại). Web thấy số người đang sơ tán.
- Tới lối thoát thì ghi sự kiện `SAFE_REACHED`. Manager kết thúc báo cháy thì app trở lại bình thường.
- Nhật ký ghi thời điểm phát, thời điểm kết thúc, thời lượng và số người đang sơ tán.

### 4.5 Điều hành tòa nhà (Trung tâm điều hành)
Manager vào tab **Điều hành** của tòa mình:

| Thao tác | Hiệu ứng trên điện thoại khách |
|---|---|
| Thang máy ngừng hoạt động | Mọi node thang máy bị chặn, tuyến đi bằng thang khác; chế độ xe lăn không còn đường lên tầng |
| Cúp điện | Thang máy và thang cuốn bị chặn, chỉ còn thang bộ |
| Đóng khu vực | Mọi node trong bán kính 12 m quanh vị trí đã chọn bị chặn |
| Thông báo cho khách | Hiện thông báo trong app |
| Đưa về bình thường | Gỡ tất cả |

Cách xử lý: BE lưu trạng thái trong bộ nhớ theo `buildingId` (`PUT /buildings/:id/operations`); app hỏi `GET /public/buildings/:id/operations` mỗi 5 giây và biến thành các "kịch bản đóng cửa" cục bộ rồi tính lại tuyến. Chỉ áp dụng khi trạng thái thay đổi nên không ghi đè kịch bản đã bật tay. Mặc định không có gì bị đóng, không có đóng cửa nào được gán cứng. Đóng một khu vực không bị coi là báo cháy (đích không bị đổi thành lối thoát).

Tab này còn có danh sách **yêu cầu hỗ trợ** của khách trong 30 phút gần nhất kèm vị trí khách đứng. Khách gửi từ mục Trợ năng của app (bị lạc, cần hỗ trợ xe lăn, thấy khói, khác).

### 4.6 Gian hàng và khuyến mãi
- Chủ gian hàng đăng ký với Manager, **Manager nhập thay** ở tab "Gian hàng & khuyến mãi": thêm, sửa, xóa gian hàng, bật tắt hiển thị, gắn gian hàng vào node, đăng khuyến mãi theo khoảng ngày.
- Khách chỉ thấy gian hàng ở trạng thái ACTIVE trên tầng đã xuất bản của tòa đang hoạt động; khuyến mãi phải còn hạn.
- App hiển thị khuyến mãi của gian hàng **dọc theo tuyến** khách đi (cùng tầng, trong vòng 15 m), và trang Ưu đãi.
- Cô lập theo tòa: khuyến mãi Tower không hiện ở Plaza và ngược lại; Manager không đăng được cho gian hàng tòa khác.

### 4.7 Nhật ký thao tác và lịch sử sự cố
- Ghi các hành động: phát và kết thúc báo cháy, thay đổi điều hành, đưa về bình thường, thêm hoặc sửa gian hàng, đăng, sửa, xóa khuyến mãi, tạo mã QR. Mỗi bản ghi có người thực hiện (tên, email, vai trò), thời điểm, tóm tắt.
- Web: tab **Nhật ký** có bảng lịch sử sự cố (thời lượng, số người sơ tán) và bảng thao tác lọc theo loại.
- `GET /buildings/:id/operations/activity?kind=INCIDENT`; Manager chỉ đọc được tòa mình.

### 4.8 Phân tích cho chủ tòa
1. App gửi sự kiện ẩn danh `POST /public/events` (tìm kiếm, bắt đầu hoặc hoàn thành tuyến, sơ tán, xem gian hàng, yêu cầu hỗ trợ, đã an toàn). Quét QR được BE ghi khi giải mã.
2. BE ghi vào bảng `OutboxEvent` (Postgres). Một worker cứ 5 giây đẩy các sự kiện chưa xử lý sang MongoDB bằng `upsert` theo id, rồi đánh dấu đã xử lý. Mongo gián đoạn thì sự kiện chờ và thử lại, không mất.
3. Owner xem thẻ "Hoạt động của khách" (7 ngày): số sự kiện, tìm kiếm nhiều nhất, điểm đến nhiều nhất (kèm tên), số tuyến bắt đầu và hoàn thành, thời gian đi trung bình, lượt quét QR, lượt xem gian hàng, yêu cầu hỗ trợ, số người đã tới nơi an toàn.

### 4.9 Thiết lập bản đồ trên web (Manager)
- Canvas react-konva, tọa độ lưu theo **pixel ảnh** ở BE, FE dùng **phần trăm** trong store; việc đổi chỉ xảy ra ở `graphMapper.ts`.
- Hiệu chuẩn tỉ lệ mét trên pixel, POI tự gắn vào node gần nhất trong bán kính cho phép, kiểm tra đồ thị (thành phần liên thông).
- Bảo trì lối đi: chọn cạnh hoặc node để chặn, định tuyến của khách tránh.
- Chỉnh loại node (ví dụ lối thoát hiểm), đổi màu node đang chọn.
- Xuất bản tầng; sửa lại sau xuất bản thì lưu bản sửa (`FloorMapRevision`).
- Tạo QR định vị theo node; token chỉ hiện **một lần** lúc tạo (BE chỉ lưu bản băm). Có tải ảnh PNG và **in poster A4**.
- Tùy chọn: dịch vụ phân tích ảnh sơ đồ để gợi ý node (bật bằng `FLOORPLAN_INTELLIGENCE_URL`).

### 4.10 Nạp dữ liệu demo nhanh
- `npm run demo:import -- <file.json> [--dry] [--replace]` dựng cả một tòa từ một file JSON: tầng, node theo tên ngắn, cạnh nối theo tên, POI, cửa hàng kèm khuyến mãi, thang liên tầng, QR. Không phải gõ UUID.
- `--dry` chỉ kiểm tra file. Tòa trùng tên thì từ chối trừ khi có `--replace` (khi đó xóa bản đồ tòa đó rồi nạp lại). Lỗi giữa chừng thì tự gỡ tòa vừa tạo dở.
- File mẫu: `prisma/samples/spotway-tower.json` (tòa "SpotWay Tower", 2 tầng, 6 gian hàng).
- `npm run demo:export` / `demo:restore` / `demo:polish`: xuất, khôi phục và làm đẹp tên của tòa SpotWay Plaza (snapshot `prisma/demo-data.json`). Bình thường không cần chạy.

---

## 5. Luồng chi tiết theo thời gian

### 5.1 Thiết lập tòa rồi khách dùng
```
Owner  → Web → BE: tạo tòa, tạo Manager, gán tòa      → DB: Building, User, StaffAssignment
Manager → Web → BE: tải ảnh, vẽ node/cạnh, nhập gian hàng (BE kiểm tra Manager có được gán tòa)
Manager → Web → BE: xuất bản tầng, tạo QR (nhận token một lần)
Khách  → App: quét QR → GET /qr/:token → {nodeId, floorId, buildingId}
App    : switchBuilding → GET floors, map, search, promotions của tòa đó
App    : tính tuyến trên máy, hiển thị chỉ đường
```

### 5.2 Điều hành thời gian thực
```
Manager bật "Thang máy hỏng" → PUT /buildings/:id/operations → BE lưu trong bộ nhớ theo tòa
Mỗi 5 giây: App → GET /public/buildings/:id/operations → {elevator: true}
App chặn các node thang máy, tính lại tuyến, hiện thông báo
Khách tòa khác nhận trạng thái bình thường
```

### 5.3 Báo cháy
```
Manager → POST /buildings/:id/incident {nodeIds}
App A: GET incident → đang cháy → màn sơ tán, chọn lối gần nhất → claim lối X
App B: GET evacuation loads → X có 1 người → chi phí X = khoảng cách + 25 m → có thể chọn lối Y
Tới lối thoát → SAFE_REACHED
Manager → DELETE incident → GET incident → hết báo cháy → nhật ký ghi thời lượng
```

### 5.4 Sự kiện phân tích
```
App → POST /public/events → BE ghi OutboxEvent (Postgres)
Worker (5 giây) → upsert vào Mongo navigation_events → đánh dấu processedAt
Owner → GET analytics summary → aggregate trên Mongo → thẻ Hoạt động của khách
```

---

## 6. Kiểm tra đã làm

| Hạng mục | Kết quả |
|---|---|
| BE test đơn vị (`npx jest -i`) | 29 suite, 215 test đạt |
| Web test, `tsc`, build | 97 test đạt, build thành công |
| Mobile `tsc`, lint, test định vị | Đạt, 18 test định vị |
| Kiểm tra thật với BE đang chạy: cô lập theo tòa | 12/12 |
| Quyền Manager với gian hàng, khuyến mãi, điều hành | 22/22 |
| Nhật ký thao tác và lịch sử sự cố | 17/17 |
| Các bài kiểm tra trước đó: tài khoản, gian hàng, định vị, sự cố, sơ tán, API cho mobile, route FE gọi BE có đủ ở BE | Đạt |

**Chưa kiểm tra trên điện thoại thật:** giọng nói, la bàn, đếm bước, chế độ trình diễn, nhận đóng cửa từ Manager, màn báo lỗi QR chưa xuất bản, bản in poster QR. Cần thử trước buổi bảo vệ.

---

## 7. Cách chạy

### Backend
```bash
cd SpotWay-BE
npm install
# .env cần: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MONGODB_URI, MONGODB_DB, CORS_ORIGINS
npx prisma migrate deploy
npm run start:dev          # http://localhost:3000/api/v1
```

### Web
```bash
cd SpotWay-FE
npm install
npm run dev                # http://localhost:5173 (proxy /api tới localhost:3000)
```

### Mobile
```bash
cd SpotWay-Mobile
npm install
npx expo start --clear --max-workers 2
# máy ít RAM: set NODE_OPTIONS=--max-old-space-size=4096 trước khi chạy
```
Điện thoại và máy chạy BE phải cùng mạng. App lấy địa chỉ BE từ máy chạy Metro, bản cài thật phải đặt `EXPO_PUBLIC_API_URL`.

### Dữ liệu demo
| Mục | Giá trị |
|---|---|
| Tài khoản (mật khẩu `ChangeMe123!`) | `admin@spotway.local`, `owner@demo-mall.local`, `manager@demo-mall.local`, `store-owner@demo-mall.local` |
| SpotWay Plaza (3 tầng) | QR `spotway-demo-lobby-0001` (sảnh), `spotway-demo-upper-0002` (tầng trên) |
| SpotWay Tower (2 tầng) | QR `spotway-tower-lobby-0001` (sảnh), `spotway-tower-upper-0002` (tầng 2) |

Nhập token trong ô "Nhập mã tòa nhà thủ công" của màn quét để vào tòa mà không cần in QR.

---

## 8. Hạn chế hiện tại

1. **Báo cháy chỉ tới khách đang mở app.** Chưa có thông báo đẩy.
2. Báo cháy và trạng thái điều hành nằm trong bộ nhớ BE: mất khi khởi động lại, chỉ chạy được một bản BE. Lịch sử được lưu ở nhật ký (Mongo), nhưng trạng thái đang diễn ra thì không.
3. Độ trễ cập nhật tới điện thoại khoảng 5 đến 10 giây (hỏi định kỳ, không phải đẩy).
4. Định vị bằng cảm biến trong nhà chỉ là ước lượng; chưa thử trong tòa thật.
5. Không có đăng ký, quên mật khẩu, gửi email, thanh toán (nhóm đã cố ý gỡ).
6. Tòa mới tạo bằng `demo:import` đang dùng lại ảnh sơ đồ của SpotWay Plaza nên node không khớp tường trong ảnh.
7. Chưa thấy giới hạn kích thước và loại file ảnh khi tải sơ đồ; bộ giới hạn tần suất lưu trong bộ nhớ.
8. Landing page web còn số liệu mẫu ("500+ dự án", "60+ triển khai", "99.9% uptime") cần thay bằng số thật hoặc bỏ.
9. Mongo còn nhiều sự kiện nhiễu từ lúc thử nghiệm; nên dọn trước khi demo để thống kê nhìn tự nhiên.
10. Mobile mặc định mở SpotWay Plaza khi chưa quét QR (cố ý, để demo).

---

## 9. Điểm khác biệt so với bản đồ giấy hay sơ đồ treo tường

| Bản đồ giấy / treo tường | SpotWay |
|---|---|
| Không biết khách đứng đâu | Quét QR biết vị trí, đường ngắn nhất tính **từ chỗ khách đứng** |
| Đi lạc phải tự định hướng | Định vị trực tiếp, lệch hoặc quay ngược thì tự tính lại |
| Mỗi tầng một tờ | Chỉ đường liên tầng, có 3D |
| Không phân biệt người đi xe lăn | Chế độ xe lăn chỉ dùng lối dễ tiếp cận |
| Thang hỏng, cúp điện, đóng khu vực phải in lại | Manager bật một công tắc, tuyến của khách tự đổi sau vài giây |
| Sơ đồ thoát hiểm tĩnh, dồn một cửa, có thể chỉ vào lối cháy | Tránh khu vực cháy, chia khách đều theo lối thoát |
| Không tìm theo tên cửa hàng, không khuyến mãi | Tìm cửa hàng, lộ trình nhiều điểm, khuyến mãi dọc đường |
| Chủ tòa không biết khách cần gì | Thống kê hành vi, yêu cầu hỗ trợ, nhật ký, lịch sử sự cố |
| Cập nhật là in lại | Sửa trên web một lần; một mã QR in sẵn dùng mãi; mất mạng vẫn dùng bản lưu |

Giới hạn cần nói thật với hội đồng: định vị trong nhà bằng cảm biến là ước lượng, khách cần điện thoại và app đang mở, với tòa rất nhỏ một bản đồ giấy có thể đủ.
