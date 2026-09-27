# AGENTS.md — Quy ước bắt buộc cho agent code trong dự án Indoor Spatial Management System (FE — indoor-spatial-fe)

> File này gộp toàn bộ skill trong `project-skills/`. Đọc kỹ trước khi code bất kỳ task nào.
> Nếu agent hỗ trợ đọc thư mục `project-skills/*/SKILL.md` riêng lẻ, có thể đọc trực tiếp ở đó thay vì file này. File này chỉ để đảm bảo agent nào cũng đọc được (nhiều tool chỉ tự động quét AGENTS.md/CLAUDE.md ở root).

---


<!-- ===== SKILL: token-efficiency ===== -->

# Token Efficiency

Mục tiêu: làm đúng việc, ít vòng lặp, ít token lãng phí — quan trọng vì dự án chạy nhiều task song song, phiên làm việc dài, và token/quota có giới hạn.

## Đọc file — chỉ đọc khi cần, đọc đúng phần cần
- KHÔNG đọc lại toàn bộ file đã đọc trong cùng phiên nếu chưa có gì thay đổi. Nhớ nội dung đã đọc, chỉ đọc lại phần đã sửa.
- Khi cần tìm 1 hàm/biến/đoạn code cụ thể trong file lớn: dùng grep/search theo tên, KHÔNG mở toàn bộ file rồi đọc từ đầu.
- Khi chỉ cần sửa 1 đoạn nhỏ: dùng lệnh sửa trực tiếp (str_replace/patch), KHÔNG in lại toàn bộ file rồi viết lại từ đầu.
- Trước khi đọc 1 file, tự hỏi: "câu trả lời có nằm trong context đã có sẵn không?" — nếu có, dùng luôn, đừng đọc lại để "chắc ăn".

## Viết code — làm gọn, không lặp
- Không tạo lại file đã tồn tại trừ khi thực sự cần ghi đè — kiểm tra tồn tại trước khi tạo mới.
- Gộp các thay đổi liên quan vào 1 lần sửa, không chia nhỏ thành nhiều lần sửa cùng 1 file cho cùng 1 mục đích.
- Không tự thêm code/tính năng ngoài phạm vi task được giao (không "tiện tay" refactor chỗ khác, không thêm comment giải thích thừa vào code trừ khi logic phức tạp thật sự cần).
- Không chạy lại build/test nhiều lần liên tiếp nếu không có thay đổi gì giữa các lần chạy.

## Giải thích/trả lời — ngắn gọn, đúng trọng tâm
- Sau khi code xong, tóm tắt 2-4 dòng: đã làm gì, file nào thay đổi, còn thiếu gì — KHÔNG lặp lại toàn bộ code đã viết trong phần giải thích (code đã hiển thị trong file rồi).
- Không giải thích lại những quy ước đã có trong skill khác (frontend-conventions, mock-api-contract...) — chỉ nhắc ngắn nếu vi phạm, không nhắc lại toàn bộ quy tắc mỗi lần.
- Nếu 1 yêu cầu có nhiều cách hiểu, chọn cách hợp lý nhất theo các skill đã có (frontend-conventions, mock-api-contract, canvas-coordinate-rule) và làm luôn — chỉ hỏi lại khi thực sự không đủ thông tin để chọn đúng, tránh hỏi để "cho chắc".

## Khi làm việc nhiều task liên tiếp trong 1 phiên
- Nếu 2 task có phần chung (ví dụ cùng cần đọc `types/building.ts`), đọc 1 lần, dùng cho cả 2 task, không đọc lại cho từng task.
- Nếu phải tạo nhiều file tương tự nhau (nhiều mock handler, nhiều component nhỏ cùng pattern), viết 1 file mẫu trước, xác nhận đúng pattern, rồi mới làm hàng loạt — tránh việc viết sai pattern rồi phải sửa lại toàn bộ.

## Không áp dụng token-efficiency để cắt xén chất lượng
Tiết kiệm token không có nghĩa là bỏ qua bước quan trọng: vẫn phải tuân thủ đầy đủ `frontend-conventions`, `mock-api-contract`, `canvas-coordinate-rule` — không rút gọn bằng cách bỏ qua convention hoặc bỏ qua validate dữ liệu.

---

<!-- ===== SKILL: frontend-conventions ===== -->

# Frontend Conventions

## Stack cố định — không tự ý đổi
- Build tool: Vite + React + TypeScript (strict mode, không dùng `any`)
- UI: Ant Design (antd). Không tự viết CSS thô hoặc thêm Tailwind/MUI song song.
- State: Zustand. KHÔNG dùng Redux, KHÔNG dùng Context API cho state phức tạp (Context chỉ dùng cho theme/auth đơn giản nếu cần).
- Gọi API: luôn qua axios instance ở `src/api/client.ts`, KHÔNG gọi `fetch` trực tiếp trong component.
- Router: react-router-dom.
- Canvas: react-konva (không dùng Fabric.js, để nhất quán giữa các người code canvas khác nhau).

## Cấu trúc thư mục bắt buộc
```
src/
  api/          # hàm gọi API theo resource, 1 file/resource (buildings.ts, floors.ts...)
  mocks/        # MSW handlers + mock data
  store/        # zustand store, 1 file/domain (useBuildingStore.ts...)
  pages/        # theo role: pages/BuildingOwner/, pages/BuildingManager/
  components/   # component dùng chung, không gắn với 1 page cụ thể
  types/        # interface/type, 1 file/entity
  routes/
```
Khi tạo file mới, LUÔN đặt đúng thư mục trên. Không tạo thư mục mới ngoài cấu trúc này trừ khi được yêu cầu rõ.

## Quy tắc đặt tên
- Component: PascalCase, tên file trùng tên component (`BuildingListPage.tsx`).
- Hook tự viết: bắt đầu bằng `use`, camelCase (`useFloorSelection.ts`).
- Zustand store: `use<Domain>Store.ts`, export hook tên `use<Domain>Store`.
- Type/interface: PascalCase, không prefix `I` (viết `Building`, không viết `IBuilding`).
- File API: số nhiều theo resource (`buildings.ts` chứa các hàm `getBuildings`, `createBuilding`...).

## Quy tắc state
- State chỉ dùng trong 1 component (form input, modal open/close): dùng `useState` bình thường, KHÔNG đưa vào zustand.
- State cần chia sẻ giữa nhiều component/page (danh sách building, floor đang chọn, danh sách POI): bắt buộc đưa vào zustand store.
- Mỗi store chỉ quản lý 1 domain, không gộp nhiều domain vào 1 store lớn.

## Quy tắc gọi API
- Component KHÔNG gọi axios trực tiếp — luôn gọi qua hàm ở `src/api/`.
- Component gọi hàm ở `src/api/`, hàm đó update zustand store, component chỉ đọc store — không tự quản lý loading/error rời rạc trong nhiều nơi.
- Loading/error state của mỗi domain nằm trong store của domain đó (ví dụ `useBuildingStore` có field `isLoading`, `error`).

## Khi không chắc
Nếu một yêu cầu không khớp rõ với quy ước trên (ví dụ cần thêm thư viện mới, đổi cấu trúc thư mục), dừng lại và hỏi người dùng trước khi tự quyết, vì việc này ảnh hưởng tới cả team (LDuy, Tính, KDuy, Hiếu) đang code chung repo.

---

<!-- ===== SKILL: mock-api-contract ===== -->

# Mock API Contract

Mục tiêu: mọi người trong team (Kiệt, KDuy, Hiếu...) code các phần khác nhau nhưng dùng CHUNG 1 bộ shape dữ liệu, để khi Backend ra API thật, chỉ cần đổi baseURL, không phải sửa lại type hay logic.

Không tự đổi tên field hoặc thêm endpoint ngoài danh sách dưới đây. Nếu cần field mới, thêm vào file này trước, rồi mới code, để người khác trong team biết.

## Nguyên tắc chung
- Toạ độ (POI, Node, Edge) LUÔN lưu dạng phần trăm (0-100), KHÔNG lưu pixel tuyệt đối. Xem chi tiết ở skill `canvas-coordinate-rule`.
- Mọi response mock trả về đúng shape TypeScript type tương ứng trong `src/types/`.
- Mọi id là string (uuid hoặc random string), không dùng number.
- Ngày giờ dùng ISO string (`new Date().toISOString()`).

## Endpoint: Buildings

`GET /api/buildings` → `Building[]`
`POST /api/buildings` (multipart/form-data: name, address, planImage?) → `Building`
`GET /api/buildings/:id` → `Building`

```ts
interface Building {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  planImageUrl: string | null;
  floorCount: number;
  createdAt: string;
  status: "active" | "draft";
}
```

## Endpoint: Floors

`GET /api/buildings/:buildingId/floors` → `Floor[]`
`POST /api/floors` → `Floor`
`PATCH /api/floors/:id` → `Floor`

```ts
interface Floor {
  id: string;
  buildingId: string;
  level: number;
  name: string;
  planImageUrl: string | null;
  publishStatus: "draft" | "published";
}
```

## Endpoint: POI (Kiệt phụ trách)

`GET /api/floors/:floorId/pois` → `Poi[]`
`PATCH /api/floors/:id/pois` (body: `Poi[]`) → `Poi[]`

```ts
interface Poi {
  id: string;
  floorId: string;
  x: number;   // 0-100, phần trăm theo chiều ngang ảnh sơ đồ
  y: number;   // 0-100, phần trăm theo chiều dọc ảnh sơ đồ
  type: "store" | "elevator" | "stair" | "toilet" | "exit" | "other";
  label: string;
}
```

## Endpoint: Node/Edge (người làm phần đặt Node/Edge trên canvas, ví dụ KDuy)

`GET /api/floors/:floorId/nodes` → `Node[]`
`GET /api/floors/:floorId/edges` → `Edge[]`
`POST /api/floors/:floorId/nodes` → `Node`
`POST /api/edges` → `Edge`

```ts
interface Node {
  id: string;
  floorId: string;
  x: number;   // 0-100, CÙNG quy ước với Poi.x
  y: number;   // 0-100, CÙNG quy ước với Poi.y
  isElevatorLink?: boolean; // true nếu node này liên kết thang máy xuyên tầng
}

interface Edge {
  id: string;
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
}
```

## Khi thêm endpoint/field mới
1. Thêm định nghĩa vào đúng mục trong file này trước.
2. Cập nhật type tương ứng trong `src/types/`.
3. Cập nhật mock handler trong `src/mocks/handlers.ts`.
4. Báo cho người liên quan (nếu field đó ảnh hưởng tới phần họ đang code, ví dụ đổi shape Node/Edge thì phải báo KDuy).

---

<!-- ===== SKILL: canvas-coordinate-rule ===== -->

# Canvas Coordinate Rule

## Quy tắc cốt lõi
Toạ độ của MỌI object trên canvas (POI, Node, Edge endpoint) được lưu và truyền qua API dưới dạng **phần trăm (0-100)** theo kích thước ảnh sơ đồ nền, KHÔNG BAO GIỜ lưu pixel tuyệt đối.

Lý do: ảnh sơ đồ hiển thị với kích thước khác nhau tuỳ màn hình/zoom, nếu lưu pixel tuyệt đối thì POI/Node sẽ lệch vị trí khi người khác mở trên màn hình khác.

## Công thức chuyển đổi

Khi người dùng click/drag trên canvas (Konva trả về toạ độ pixel theo Stage hiện tại):

```ts
// Từ pixel trên Stage -> phần trăm (để lưu/gửi API)
function pixelToPercent(pixelX: number, pixelY: number, stageWidth: number, stageHeight: number) {
  return {
    x: (pixelX / stageWidth) * 100,
    y: (pixelY / stageHeight) * 100,
  };
}

// Từ phần trăm (lấy từ API/store) -> pixel để vẽ trên Stage hiện tại
function percentToPixel(percentX: number, percentY: number, stageWidth: number, stageHeight: number) {
  return {
    x: (percentX / 100) * stageWidth,
    y: (percentY / 100) * stageHeight,
  };
}
```

`stageWidth`/`stageHeight` LUÔN lấy từ kích thước thực tế của Konva Stage tại thời điểm render (không hardcode), để canvas responsive đúng trên mọi kích thước ảnh/màn hình.

## Áp dụng khi nào
- Khi click canvas để thêm POI/Node mới: lấy toạ độ pixel từ event (`e.target.getStage().getPointerPosition()`), convert qua `pixelToPercent`, rồi mới lưu vào store/gửi API.
- Khi vẽ POI/Node đã có (từ store/API) lên canvas: lấy toạ độ phần trăm, convert qua `percentToPixel` bằng kích thước Stage hiện tại, rồi mới truyền vào props `x`/`y` của Konva shape.
- Khi kéo (drag) object: `onDragEnd` lấy vị trí pixel mới, convert qua `pixelToPercent` trước khi cập nhật store.

## Không được làm
- Không lưu thẳng `e.target.x()` (pixel) vào store hoặc gửi API.
- Không hardcode kích thước Stage (ví dụ `width={800}`) — luôn đo kích thước container thực tế (dùng `useRef` + `getBoundingClientRect`, hoặc thư viện resize observer).
- Không tự đổi field name `x`/`y` thành tên khác (ví dụ `posX`) — phải khớp với `mock-api-contract`.

## Khi cần chia sẻ logic giữa POI và Node/Edge
Nếu cả 2 phần (POI của Kiệt, Node/Edge của KDuy) đều cần `pixelToPercent`/`percentToPixel`, nên tách 2 hàm này ra file dùng chung, ví dụ `src/utils/canvasCoordinates.ts`, thay vì mỗi người viết 1 bản riêng — tránh sai lệch công thức giữa 2 phần.

---

<!-- ===== SKILL: git-commit-convention ===== -->

# Git Commit Convention

## Đặt tên branch
Format: `<loại>/<task-id>-<mô-tả-ngắn-không-dấu>`

Loại: `feature`, `fix`, `chore`, `poc` (dùng cho các task ghi rõ POC như canvas Konva/Fabric).

Ví dụ (dựa theo bảng Project_tasks):
- `feature/fe-dashboard-building-owner`
- `poc/fe-canvas-konva`
- `fix/fe-upload-preview-bug`

Task ID lấy từ tên task rút gọn trong bảng (không cần số thứ tự dòng, vì bảng có thể thay đổi thứ tự) — ưu tiên mô tả ngắn dễ hiểu hơn là số dòng.

## Commit message

Format: `<type>(<scope>): <mô tả ngắn bằng tiếng Việt hoặc tiếng Anh, nhất quán trong 1 PR>`

Type theo Conventional Commits:
- `feat`: thêm tính năng mới
- `fix`: sửa lỗi
- `chore`: việc linh tinh (setup, cấu hình, dependency)
- `refactor`: đổi cấu trúc code, không đổi behavior
- `docs`: cập nhật tài liệu/README/SKILL.md

Scope: tên module viết tắt — `be`, `fe`, `mob`, hoặc cụ thể hơn: `building`, `floor`, `poi`, `canvas`.

Ví dụ:
```
feat(building): thêm modal tạo building mới với upload preview ảnh
fix(canvas): sửa lỗi toạ độ POI lệch khi resize màn hình
chore(fe): setup MSW mock cho buildings/floors/poi
docs(fe): thêm SKILL.md quy ước mock API contract
```

## Quy tắc PR
- Mỗi PR ứng với 1 task trong bảng Project_tasks (không gộp nhiều task không liên quan vào 1 PR).
- Tên PR = commit message chính của PR đó.
- Trước khi merge, cập nhật status task trong bảng Project_tasks từ "In progress" sang "Done" (không để agent tự động đổi status thay bạn — chỉ nhắc bạn nhớ làm).

---