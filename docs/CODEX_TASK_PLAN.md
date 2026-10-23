# CODEX TASK PLAN — Indoor Navigation & Fire Evacuation

> Người lập kế hoạch/kiểm thử: Codex (Pane 2)  
> Người thực thi dự kiến: Claude Code (Pane 3)  
> Trạng thái checklist: chỉ Codex đổi `[ ]` thành `[x]` sau khi đã đọc diff và chạy nghiệm thu. Claude không tự đánh dấu hoàn thành.

## 1. Mục tiêu

Hoàn thiện backend chỉ đường trong tòa nhà cho hai nhóm nghiệp vụ:

1. Chỉ đường thông thường: cùng tầng, đa tầng qua thang máy/thang bộ/thang cuốn, xe lăn, điểm đến gần nhất.
2. Chỉ đường khi cháy: cấm thang máy, hủy điểm đến đang cháy, tìm cửa thoát hiểm an toàn gần nhất và tái định tuyến khi một lối thoát bị chặn.

Ngoài ra cần có bộ scenario demo một-chạm. Repository này chỉ chứa backend, vì vậy deliverable của Pane 3 là seed dữ liệu, API manifest và API chạy scenario; button hiển thị thật thuộc frontend và chỉ cần gọi các API đã định nghĩa ở tài liệu này.

## 2. Hiện trạng đã xác minh

### Đã có trong working tree — phải giữ tương thích

- `POST /api/v1/public/routes` và Dijkstra weighted graph hai chiều.
- Route cùng tầng và route đa tầng qua `ElevatorLink`.
- Chỉ load `Edge.status = ACTIVE`; có kiểm tra phòng thủ để không dùng edge `BLOCKED`.
- `wheelchairMode=true` loại edge `accessible=false`.
- `mode=EVACUATION` tìm đích gần nhất trong tập node `EXIT`/`EMERGENCY_EXIT` hoặc POI category `EXIT`.
- `hazardNodeIds` và alias `blockedNodeIds` loại node nguy hiểm khỏi graph.
- Evacuation không thêm `ElevatorLink` vào graph; Dijkstra cũng có tùy chọn loại kind `ELEVATOR`.
- Có migration thêm `NodeType.EXIT` và `NodeType.EMERGENCY_EXIT`.
- Unit test hiện có cho elevator, wheelchair, blocked edge, cấm elevator, nearest exit, hazard rerouting và legacy EXIT POI.

### Khoảng trống cần Pane 3 xử lý

1. Schema chỉ có `ElevatorLink`; node `STAIR`/`ESCALATOR` chưa thể nối xuyên tầng.
2. Chưa có tìm Store/POI gần nhất theo chi phí graph.
3. Nếu điểm đến thường nằm trong `hazardNodeIds`, hiện tại chỉ có thể rơi vào `NO_ROUTE_FOUND`; chưa tự hủy điểm đến, phát warning và chuyển sang evacuation.
4. Response chưa nói rõ route bị đổi mode vì lý do gì, requested target nào bị hủy và safe target nào được chọn.
5. Seed hiện tại không đủ topology và chưa bảo đảm floor đã `PUBLISHED` để demo public route.
6. Chưa có scenario manifest/run API cho demo một-chạm.
7. Chưa có e2e matrix bao phủ toàn bộ flow public API.
8. Bearing hiện tại mới mô tả hướng tới node kế tiếp; chưa có north calibration, relative turn, segment aggregation hoặc instruction định lượng theo mét.

## 3. Quyết định nghiệp vụ

### 3.1 Thứ tự ưu tiên routing

| Mode | Ưu tiên 1 | Ưu tiên 2 | Quy tắc cứng |
| --- | --- | --- | --- |
| `NORMAL` | Tổng weight nhỏ nhất | Tie-break ổn định theo node ID | Không dùng blocked/deleted edge |
| `NORMAL + wheelchair` | Tổng weight nhỏ nhất trong graph accessible | Tie-break ổn định | Không dùng stair/escalator hoặc link `accessible=false` |
| `EVACUATION` | Mức nguy hiểm thấp nhất | Sau đó mới tối thiểu tổng weight | Không elevator; không hazard node; chỉ tới safe exit |

Evacuation là **safety-first**, không phải chỉ shortest-distance. Nếu có một đường dài hơn nhưng không đi gần vùng cháy và một đường ngắn hơn đi sát vùng cháy, phải chọn đường an toàn hơn.

### 3.2 Chính sách vertical transition

- Chuẩn hóa thành `VerticalLink.kind`: `ELEVATOR | STAIR | ESCALATOR`.
- `ESCALATOR` phải có direction: `UP | DOWN | BIDIRECTIONAL`.
- `wheelchairMode=true`: chỉ cho `ELEVATOR` có `accessible=true`; cấm `STAIR` và `ESCALATOR`.
- `EVACUATION`: luôn cấm `ELEVATOR`.
- Khuyến nghị an toàn: `ESCALATOR.emergencyAllowed=false` mặc định; chỉ được dùng khi dữ liệu tòa nhà chủ động bật. `STAIR.emergencyAllowed=true` mặc định.
- Stair dùng trong fire cross-floor phải có `smokeProtected=true`; route ưu tiên/cưỡng chế cầu thang chống khói thay vì stair thường theo cấu hình tòa nhà.
- Link `BLOCKED`, deleted, sai building, hai đầu cùng floor hoặc hai đầu không cùng node type đều không được vào graph.

### 3.3 Điểm đến bị cháy

Khi request thường có target node nằm trong tập hazard:

1. Không trả route tới target đó.
2. Tự chuyển effective mode sang `EVACUATION`.
3. Trả route tới safe exit gần nhất theo safety-first.
4. Response có warning code `DESTINATION_IN_HAZARD`, `destinationCancelled=true`, requested target và resolved exit.
5. Nếu không có safe exit, trả `NO_SAFE_EXIT_FOUND`, không fallback về target cũ.

### 3.4 Exit bị cháy/chặn

- Exit thuộc `hazardNodeIds` không được làm candidate target và không được dùng làm node trung gian.
- Nếu Exit 1 gần nhất bị loại, thuật toán phải tự chọn Exit 2 còn reachable.
- Nếu mọi exit đều bị hazard hoặc disconnected, trả `NO_SAFE_EXIT_FOUND`.

### 3.5 “Đi ngược hướng lửa”

Không thể chứng minh “ngược hướng lửa” chỉ bằng việc block đúng một node. Pane 3 phải bổ sung risk-aware routing:

- Hazard node có risk vô hạn và bị loại hoàn toàn.
- Node cùng floor nằm trong safety buffer của hazard có risk lớn hơn node ngoài buffer.
- Comparator route dùng tuple `(maxNodeRisk, cumulativeRisk, totalWeight, stableTieBreaker)` theo thứ tự tăng dần; không dùng một magic weight có thể bị distance lấn át. `maxNodeRisk` và `cumulativeRisk` đều đơn điệu để vẫn dùng được Dijkstra label-setting.
- Khi có một first hop làm tăng khoảng cách tới hazard và vẫn dẫn tới exit, không được chọn first hop đi gần hazard hơn chỉ vì ngắn hơn.
- MVP nhận `hazardNodeIds`; “hazard zone” bên ngoài backend được quy đổi thành danh sách node trước khi gọi API. Không tạo mô hình GIS zone trong scope này.

## 4. API contract đích

### 4.1 Route request tương thích ngược

Giữ các field hiện tại, chỉ bổ sung field optional:

```json
{
  "fromNodeId": "uuid",
  "toStoreId": "uuid-optional",
  "toNodeId": "uuid-optional",
  "wheelchairMode": false,
  "mode": "NORMAL",
  "hazardNodeIds": ["uuid"],
  "hazardSafetyRadius": 120
}
```

Quy tắc validation:

- `NORMAL`: cần đúng một explicit target, trừ endpoint nearest riêng bên dưới.
- `EVACUATION`: target optional; nếu không có thì tìm safe exit gần nhất.
- `hazardNodeIds`: unique UUID, tối đa 200 phần tử, phải thuộc cùng building với source.
- `hazardSafetyRadius`: optional, hữu hạn, `>= 0`, có max bảo vệ API; default lấy từ config.
- Source nằm trong hazard: trả `SOURCE_IN_HAZARD`; không giả vờ có route an toàn từ node bị loại.

### 4.2 Nearest destination endpoint

Thêm endpoint riêng để không làm DTO route hiện tại thành union khó validate:

`POST /api/v1/public/routes/nearest`

```json
{
  "fromNodeId": "uuid",
  "targetType": "STORE",
  "poiCategory": null,
  "wheelchairMode": false,
  "limit": 1
}
```

- `targetType`: `STORE | POI | EXIT`.
- `poiCategory` chỉ hợp lệ khi `targetType=POI`.
- “Gần nhất” tính theo graph route cost, không dùng khoảng cách Euclidean trực tiếp.
- Chỉ Store active, POI/node chưa delete, floor published, cùng building.
- Candidate unreachable bị bỏ qua.
- Response trả route và metadata của destination đã chọn.

### 4.3 Route response mở rộng

Giữ nguyên `totalDistance`, `estimatedDurationSeconds`, `nodeIds`, `steps`; bổ sung:

```json
{
  "requestedMode": "NORMAL",
  "effectiveMode": "EVACUATION",
  "routeReason": "DESTINATION_IN_HAZARD",
  "destinationCancelled": true,
  "requestedDestination": { "type": "STORE", "id": "...", "nodeId": "..." },
  "resolvedDestination": { "type": "EMERGENCY_EXIT", "id": "...", "nodeId": "..." },
  "warnings": [
    {
      "code": "DESTINATION_IN_HAZARD",
      "severity": "CRITICAL",
      "message": "Requested destination is in a hazardous area. Follow the evacuation route."
    }
  ]
}
```

Các `routeReason` tối thiểu:

- `USER_REQUEST`
- `NEAREST_DESTINATION`
- `EVACUATION_REQUESTED`
- `DESTINATION_IN_HAZARD`
- `EMERGENCY_EXIT_TARGETED`

Các error code tối thiểu:

- `INVALID_ROUTE_TARGET`
- `INVALID_HAZARD_NODES`
- `SOURCE_IN_HAZARD`
- `NO_ROUTE_FOUND`
- `NO_SAFE_EXIT_FOUND`

### 4.4 Chuẩn hóa thuật toán, đơn vị và thời gian

#### Graph search

- Route thường tiếp tục dùng Dijkstra với min-priority queue và mọi cost không âm.
- Dijkstra phải dừng đúng khi pop target có cost nhỏ nhất; nearest search nhận một `Set` candidate và dừng ở candidate đầu tiên được pop.
- Không chọn nearest bằng Euclidean distance. Euclidean chỉ dùng để tính raw edge length hoặc hazard proximity trên cùng floor.
- Tie-break phải deterministic để cùng input luôn trả cùng path: `primaryCost`, sau đó tổng distance, sau đó node ID.
- Raw `nodeIds` là source of truth cho map rendering. Turn-by-turn là bước hậu xử lý raw path, không tự ý đổi path.

#### Calibration theo floor

Để khoảng cách và bearing chính xác trên nhiều bản đồ khác nhau, bổ sung calibration:

```ts
type FloorNavigationCalibration = {
  mapUnitsPerMeter: number;    // > 0; fallback MAP_UNITS_PER_METER
  northOffsetDegrees: number;  // [0, 360); bearing thật của hướng "map up"
};
```

- Walk distance: `hypot(dx, dy) / mapUnitsPerMeter` hoặc `edge.weight / mapUnitsPerMeter` nếu weight đã được validate từ tọa độ.
- Không dùng một global scale cho mọi floor khi floor đã có calibration riêng.
- Cross-floor transition không được cộng elevator wait vào `totalDistance`; wait chỉ vào duration/generalized time cost.

#### Duration và elevator wait

Vertical link cần metadata hoặc config tương đương:

```ts
type VerticalTiming = {
  waitSeconds: number;            // elevator queue/door wait
  travelSecondsPerFloor: number;
};
```

- Walk time: `distanceMeters / walkingSpeedMps`.
- Elevator time: `waitSeconds + abs(floorNumberDelta) * travelSecondsPerFloor`.
- Stair/escalator time phải có config riêng; không tái sử dụng elevator weight.
- Response có `walkingDurationSeconds`, `transitionDurationSeconds`, `estimatedDurationSeconds` và breakdown ở vertical instruction.
- Demo elevator phải hiển thị thời gian chờ rõ ràng.

### 4.5 Bearing, delta bearing và turn-by-turn

Giả định tọa độ canvas: `x` tăng sang phải, `y` tăng xuống dưới. Bearing chuẩn la bàn: `0°=North`, tăng theo chiều kim đồng hồ.

```ts
const normalize360 = (angle: number) => ((angle % 360) + 360) % 360;

const mapBearing = (from: Point, to: Point) =>
  normalize360(Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI);

const trueBearing = normalize360(mapBearing(from, to) + floor.northOffsetDegrees);

// Kết quả thuộc [-180, 180); số dương = rẽ phải, số âm = rẽ trái.
const deltaBearing = (incoming: number, outgoing: number) =>
  ((outgoing - incoming + 540) % 360) - 180;
```

Phân loại maneuver mặc định, phải đưa thành constants/config để test tại boundary:

| `abs(delta)` | Maneuver |
| --- | --- |
| `< 15°` | `STRAIGHT` |
| `15° .. < 45°` | `SLIGHT_LEFT` / `SLIGHT_RIGHT` |
| `45° .. < 135°` | `TURN_LEFT` / `TURN_RIGHT` |
| `>= 135°` | `U_TURN_LEFT` / `U_TURN_RIGHT` |

Quy tắc sinh instruction:

- Không phát một instruction cho mọi node. Gom các WALK edge liên tiếp cùng hướng cho tới maneuver kế tiếp.
- Instruction có `maneuver`, `bearing`, `deltaBearing`, `distanceMeters`, `floorId`, `fromNodeId`, `toNodeId`, `text`.
- `distanceMeters` là tổng chính xác của segment đã gom; JSON làm tròn tối đa 2 chữ số, UI có thể làm tròn để đọc.
- Một vertical transition là instruction riêng, reset incoming bearing sau khi sang floor mới.
- Bắt đầu có `START`, kết thúc có `ARRIVE`; explicit target bị cháy kết thúc bằng `ARRIVE_AT_SAFE_EXIT`, không phải `ARRIVE_AT_DESTINATION`.
- Giữ `steps` hiện tại để tương thích; thêm `instructions` đã gom cho turn-by-turn.
- Unit test bắt buộc cho wrap-around `350° -> 10° = +20°`, `10° -> 350° = -20°` và đúng các boundary 15/45/135 độ.

Kiểu dữ liệu đích:

```ts
type Maneuver =
  | 'START' | 'STRAIGHT'
  | 'SLIGHT_LEFT' | 'SLIGHT_RIGHT'
  | 'TURN_LEFT' | 'TURN_RIGHT'
  | 'U_TURN_LEFT' | 'U_TURN_RIGHT'
  | 'ELEVATOR' | 'STAIR' | 'ESCALATOR'
  | 'ARRIVE' | 'ARRIVE_AT_SAFE_EXIT';

type RouteInstruction = {
  maneuver: Maneuver;
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  bearing: number | null;
  deltaBearing: number | null;
  durationSeconds: number;
  waitSeconds?: number;
  targetFloorId?: string;
  text: string;
};
```

### 4.6 Interactive Fire Mode contract

Interactive mode không persist fire vào graph. Frontend giữ tập node đang cháy và gọi lại route sau mỗi click:

```json
{
  "requestId": "demo-sequence-17",
  "fromNodeId": "uuid",
  "mode": "EVACUATION",
  "hazardNodeIds": ["clicked-node-1", "clicked-node-2"],
  "wheelchairMode": false
}
```

- Click node chưa cháy: thêm node vào set; click lại có thể remove nếu UI hỗ trợ toggle; Reset gửi mảng rỗng.
- Backend stateless, không update `Node`, `Edge` hoặc `VerticalLink`.
- Response echo `requestId`; frontend chỉ render response mới nhất để tránh race khi click nhanh.
- Nếu click trúng node trên path hiện tại, path kế tiếp tuyệt đối không chứa node đó.
- Click node không liên quan có thể trả cùng path; đây là kết quả hợp lệ.
- Click Exit 1 rồi Exit 2 phải lần lượt chuyển sang Exit 2 rồi Exit 3.
- Local demo target: graph calculation `< 50 ms` sau khi data đã load và HTTP p95 `< 300 ms`; benchmark ghi riêng, không biến timing thành unit test dễ flaky.

## 5. Topology demo chuẩn

Seed phải idempotent, dùng UUID cố định và có **ít nhất ba published floors** để Floor 2 thực sự là tầng giữa. Mỗi floor có calibration xác định.

### 5.1 Happy topology

| Nhánh/dữ liệu | Mục đích và assertion |
| --- | --- |
| `START_GROUND -> SHOP_NEAR` | Cùng tầng, chọn tổng cost nhỏ nhất |
| `START_GROUND -> J1 -> J2 -> J3 -> SHOP_FAR` | Nhiều ngã rẽ; instruction có straight/slight/left/right và tổng segment distance đúng |
| `START_GROUND -> ELEVATOR_G -> ELEVATOR_F2 -> SHOP_F2` | Có elevator transition, wait time và duration breakdown |
| `START_GROUND -> STAIR_G -> STAIR_F2 -> SHOP_F2` | Stair hai chiều |
| `START_GROUND -> ESCALATOR_G -> ESCALATOR_F2` | Escalator đi đúng chiều |
| `ESCALATOR_F2 -> ESCALATOR_G` | Một chiều ngược bị từ chối hoặc chọn link/path khác |
| Direct edge `accessible=false` + đường vòng accessible | Wheelchair bỏ shortcut; không dùng stair/escalator |
| Hai restroom ở graph cost khác nhau | Nearest toilet chọn theo graph cost, không Euclidean |
| Hai ATM ở graph cost khác nhau | Nearest ATM |
| Hai INFO POI ở graph cost khác nhau | Nearest information desk |

`PoiCategory` hiện có `RESTROOM` và `INFO` nhưng chưa có `ATM`; migration phải thêm `ATM`. Không tạo category `TOILET` trùng nghĩa—UI label “Toilet” map vào `RESTROOM`.

### 5.2 Fire topology

| Case | Hazard setup | Expected |
| --- | --- | --- |
| Cháy Floor 1 gần main exit | `MAIN_EXIT` và corridor trước cửa chính | Chọn `REAR_EXIT`, không đi xuyên fire buffer |
| Cháy Floor 2 tầng giữa | fire nodes gần elevator lobby | Cấm elevator, đi `SMOKEPROOF_STAIR_F2 -> F1 -> safe exit` |
| Cháy tại destination | node của `FIRE_TARGET_STORE` | Hủy target, warning đỏ, first hop `SAFE_AWAY`, tới safe exit |
| Cháy chặn Exit 1 | `EXIT_1` | Chọn `EXIT_2` |
| Cháy chặn Exit 1 và 2 | `EXIT_1`, `EXIT_2` | Chọn `EXIT_3` |
| Interactive fire | user click node bất kỳ | Echo requestId, recalculate ngay, path mới không chứa clicked hazard |

Fire topology phải bảo đảm:

- Khi không hazard: `EXIT_1` cost thấp hơn `EXIT_2`, và `EXIT_2` thấp hơn `EXIT_3`.
- Cả ba exit thuộc cùng building, published và reachable trong baseline.
- `SMOKEPROOF_STAIR_*` có `emergencyAllowed=true`; elevator có false.
- Fire Floor 2 có một elevator shortcut nhanh hơn stair để negative test chứng minh elevator vẫn bị cấm.
- `SAFE_AWAY` xa fire hơn source; có một nhánh ngắn hơn nhưng gần fire để chứng minh safety-first comparator.
- Main/rear exit, fire target và mọi amenity đều có name cố định để panel demo giải thích được kết quả.

## 6. Bộ Button Demo một-chạm

### API

- `GET /api/v1/public/demo/navigation-scenarios`: trả manifest button.
- `POST /api/v1/public/demo/navigation-scenarios/:key/run`: không cần body; server lấy UUID seed theo scenario và gọi cùng application service thật của route, không copy thuật toán.
- Chỉ enable khi `ENABLE_DEMO_SCENARIOS=true`; production mặc định trả 404.
- API run không được mutate Edge/Node để giả lập cháy. Hazard phải là input in-memory của request để các lần demo độc lập và chạy lặp lại được.

### Manifest happy cases

| Key | Label button | Expected |
| --- | --- | --- |
| `same-floor-shortest` | `H1. Same Floor — Shortest` | Route ngắn nhất cùng tầng |
| `same-floor-turns` | `H2. Same Floor — Turn by Turn` | Nhiều maneuver và distance mét |
| `elevator-wait` | `H3. Elevator + Wait` | Elevator, wait time, duration breakdown |
| `stairs` | `H4. Stairs` | Có transition `STAIR` |
| `escalator-up` | `H5. Escalator Up` | Đi đúng chiều `UP` |
| `escalator-reverse` | `H6. Escalator Reverse` | Không đi ngược one-way escalator |
| `wheelchair` | `H7. Wheelchair` | Không stair/escalator/inaccessible edge |
| `nearest-restroom` | `H8. Nearest Toilet` | Chọn `RESTROOM` theo graph cost |
| `nearest-atm` | `H9. Nearest ATM` | Chọn `ATM` theo graph cost |
| `nearest-info` | `H10. Nearest Info` | Chọn `INFO` theo graph cost |

### Manifest emergency/fire cases

| Key | Label button | Expected |
| --- | --- | --- |
| `fire-ground-main-exit` | `F1. Fire Near Main Exit` | Chọn rear exit |
| `fire-middle-floor` | `F2. Fire On Middle Floor` | Cấm elevator, dùng smokeproof stair |
| `fire-at-destination` | `F3. Fire At Destination` | Hủy target, critical warning, evacuation |
| `fire-exit-1` | `F4. Exit 1 Blocked` | Chọn Exit 2 |
| `fire-exits-1-2` | `F5. Exit 1 & 2 Blocked` | Chọn Exit 3 |
| `interactive-fire` | `F6. Interactive Fire Mode` | Cho UI click/toggle/reset hazard và reroute |

Mỗi item manifest trả `key`, `group`, `label`, `description`, `expectedMode`, `requestPreview`, `expectedAssertions` và `interactive`. Frontend render thành hai nhóm Happy/Fire mà không hard-code nghiệp vụ. Scenario `interactive-fire` còn trả source ID, danh sách node có thể click, endpoint template và reset payload.

## 7. Checklist giao Pane 3

### P0 — Contract và data model

- [ ] **T01 — Chốt baseline và không làm mất logic hiện có.**
  - Acceptance Criteria:
    - Đọc `navigation.dto.ts`, `navigation.service.ts`, spec hiện tại và migration pending trước khi sửa.
    - Không xóa hỗ trợ legacy POI category `EXIT`.
    - Public route cũ với `{fromNodeId,toStoreId,wheelchairMode}` vẫn hoạt động.
    - Không sửa unrelated modules hoặc ghi đè thay đổi đang có trong working tree.

- [ ] **T02 — Tổng quát hóa `ElevatorLink` thành vertical transition.**
  - Acceptance Criteria:
    - Prisma có model/enum biểu diễn `ELEVATOR`, `STAIR`, `ESCALATOR`, direction, `accessible`, `emergencyAllowed`, `smokeProtected`, timing, status và soft-delete.
    - Migration bảo toàn toàn bộ ElevatorLink hiện có dưới kind `ELEVATOR`; không drop dữ liệu trước khi backfill.
    - Unique active unordered pair tiếp tục được enforce; escalator `UP/DOWN` dựa trên `floorNumber` và được enforce ở service.
    - CRUD/Swagger hỗ trợ vertical links; endpoint elevator cũ được giữ làm compatibility adapter hoặc có migration path được ghi rõ.
    - Publish validation kiểm tra tất cả node transition cần link, không chỉ elevator.

- [ ] **T03 — Mở rộng graph edge/route step cho vertical transition.**
  - Acceptance Criteria:
    - `GraphEdge.kind` và response `transition` hỗ trợ `WALK | ELEVATOR | STAIR | ESCALATOR`.
    - Stair link hai chiều; escalator tuân thủ `UP/DOWN/BIDIRECTIONAL`.
    - Link blocked/deleted/khác building/cùng floor/type mismatch không vào graph.
    - Instruction nêu đúng transition và floor đích.
    - Elevator instruction trả wait time và transition duration; stair/escalator dùng timing riêng.

### P0 — Routing rules

- [ ] **T04 — Hoàn thiện policy wheelchair trên toàn graph.**
  - Acceptance Criteria:
    - Loại walk edge `accessible=false`.
    - Loại toàn bộ stair và escalator.
    - Chỉ dùng elevator link `accessible=true`.
    - Nếu chỉ còn route không accessible, trả `NO_ROUTE_FOUND`.
    - Có unit test cho cả edge và từng vertical kind.

- [ ] **T05 — Hoàn thiện policy fire/evacuation.**
  - Acceptance Criteria:
    - Không có `ELEVATOR` trong graph/result khi effective mode là evacuation, kể cả elevator là đường ngắn nhất.
    - Chỉ dùng vertical link có `emergencyAllowed=true`; escalator mặc định không được dùng.
    - Fire cross-floor chỉ dùng stair `smokeProtected=true` khi policy tòa nhà yêu cầu; demo Floor 2 bắt buộc đi smokeproof stair.
    - Candidate exit gồm `NodeType.EXIT`, `NodeType.EMERGENCY_EXIT` và legacy POI `EXIT`.
    - Exit/hazard node bị loại khỏi cả candidate set lẫn intermediate graph.
    - Không còn exit an toàn trả `NO_SAFE_EXIT_FOUND`.

- [ ] **T06 — Implement risk-aware routing để đi xa vùng cháy.**
  - Acceptance Criteria:
    - Có hàm risk calculation độc lập, deterministic và unit-test được.
    - Route comparator ưu tiên risk trước distance, không dùng magic constant thiếu giới hạn.
    - Hazard khác floor không tạo Euclidean risk giả trên floor hiện tại.
    - Với demo fire topology, first hop tăng khoảng cách tới fire khi safe path tồn tại.
    - Không thay đổi kết quả shortest path của `NORMAL` khi không có hazard.

- [ ] **T07 — Tự động hủy destination bị cháy và chuyển mode.**
  - Acceptance Criteria:
    - Detect target node của Store/Node nằm trong hazard trước khi chạy normal route.
    - `effectiveMode=EVACUATION`, target cũ không nằm trong `nodeIds`.
    - Response có `DESTINATION_IN_HAZARD`, severity critical và `destinationCancelled=true`.
    - `resolvedDestination` là safe exit thực tế ở cuối path.
    - Không tìm được exit trả `NO_SAFE_EXIT_FOUND`, tuyệt đối không route trở lại điểm cháy.

- [ ] **T08 — Validate hazard input và error semantics.**
  - Acceptance Criteria:
    - Deduplicate, giới hạn số lượng, validate UUID/building scope.
    - Source nằm trong hazard trả `SOURCE_IN_HAZARD`.
    - Phân biệt `NO_ROUTE_FOUND` thông thường với `NO_SAFE_EXIT_FOUND`.
    - Analytics context ghi effective mode, route reason, hazard count; không lưu dữ liệu nhạy cảm không cần thiết.

### P1 — Nearest destination

- [ ] **T09 — Implement `POST /public/routes/nearest`.**
  - Acceptance Criteria:
    - Hỗ trợ `STORE`, `POI`, `EXIT` và POI category filter.
    - Có migration `PoiCategory.ATM`; Toilet dùng `RESTROOM`, quầy thông tin dùng `INFO`.
    - Chọn theo graph cost thực tế; test có candidate Euclidean gần nhưng graph route xa để chứng minh.
    - Bỏ candidate inactive/deleted/draft/khác building/unreachable.
    - Áp dụng đầy đủ wheelchair, blocked edge và hazard filter.
    - Trả metadata destination và `routeReason=NEAREST_DESTINATION`.

### P0 — Độ chính xác thuật toán và turn-by-turn

- [ ] **T17 — Bổ sung floor calibration và chuẩn hóa metric.**
  - Acceptance Criteria:
    - Floor có `mapUnitsPerMeter > 0` và `northOffsetDegrees` chuẩn hóa `[0,360)` hoặc nullable với fallback config rõ ràng.
    - Migration không làm hỏng floor cũ; seed đặt calibration cụ thể cho từng demo floor.
    - `totalDistance` bằng tổng WALK distance theo mét; vertical wait không bị cộng vào distance.
    - Validation từ chối zero, số âm, `NaN`/infinite calibration.
    - Unit test chứng minh hai floor có scale khác nhau vẫn tính mét đúng.

- [ ] **T18 — Chuẩn hóa generalized cost và duration breakdown.**
  - Acceptance Criteria:
    - Dijkstra dùng min-priority queue, cost không âm và tie-break deterministic.
    - Elevator wait/travel, stair và escalator timing được tính theo mục 4.4.
    - Response có walking, transition và total duration nhất quán; tổng breakdown bằng total.
    - Scenario elevator hiển thị wait time và path selection có test khi elevator nhanh/chậm hơn stair.
    - Nearest multi-target dùng một graph search phù hợp, không chạy N lần Dijkstra nếu không cần.

- [ ] **T19 — Implement turn-by-turn instruction formatter.**
  - Acceptance Criteria:
    - Công thức bearing/delta bearing đúng mục 4.5 và không phụ thuộc map north offset đối với relative turn.
    - Sinh đủ `START`, straight, slight left/right, left/right, U-turn, vertical transitions, arrival.
    - Gom collinear WALK edges; distance segment/tổng route sai số tối đa `0.01 m` trên fixture.
    - Reset bearing qua vertical transition, không tính góc giữa tọa độ của hai floor.
    - Giữ raw `steps`; thêm `instructions` typed DTO/Swagger.
    - Test wrap-around và boundary 15/45/135 độ, cả canvas y-down và north offset.

### P1 — Response, docs và demo

- [ ] **T10 — Mở rộng response DTO và Swagger.**
  - Acceptance Criteria:
    - Có các field trong mục 4.3, đều được khai báo type/enum/nullable đúng.
    - Client cũ vẫn đọc được bốn field route hiện tại.
    - Có `instructions`, duration breakdown, requested/effective mode, warning và destination metadata.
    - Warning và error code có ví dụ Swagger.
    - Không trả Prisma entity thô trong public response.

- [ ] **T11 — Tạo deterministic demo seed.**
  - Acceptance Criteria:
    - Seed idempotent, UUID cố định, chạy hai lần không duplicate.
    - Có tối thiểu ba floor demo `PUBLISHED`, building/tenant active và calibration đầy đủ.
    - Có đủ topology mục 5 và tất cả scenario chạy được ngay sau migrate + seed.
    - Không phụ thuộc ID phát sinh ngẫu nhiên để scenario controller tra cứu.
    - Seed log ra building ID và danh sách scenario keys, không log secret production.

- [ ] **T12 — Implement scenario manifest và one-touch runner.**
  - Acceptance Criteria:
    - Có đủ 16 key trong mục 6: 10 Happy và 6 Fire.
    - Run endpoint gọi NavigationService thật và trả thêm `scenarioKey` + `assertionSummary`.
    - Không mutate graph/hazard state; chạy lặp lại hoặc đổi thứ tự vẫn cùng kết quả.
    - Feature flag tắt mặc định và trả 404 khi tắt.
    - Có controller/service unit tests cho feature flag và unknown key.

- [ ] **T20 — Implement backend contract cho Interactive Fire Mode.**
  - Acceptance Criteria:
    - Route DTO nhận optional `requestId`, response echo nguyên giá trị.
    - Mỗi request chỉ dùng `hazardNodeIds` của chính request; không persist hoặc leak hazard qua request sau.
    - Click hazard nằm trên path làm path mới loại node đó; click Exit 1 rồi Exit 2 chuyển Exit 2 rồi Exit 3.
    - Duplicate/toggle/reset input được xử lý deterministic; source hazard trả `SOURCE_IN_HAZARD`.
    - Có benchmark riêng ghi graph calculation và HTTP p95 trên demo topology; không đưa timing assertion flaky vào unit test.
    - Có tài liệu chống stale-response: frontend chỉ nhận response có `requestId` mới nhất.

- [ ] **T13 — Viết handoff cho frontend demo.**
  - Acceptance Criteria:
    - Tài liệu ngắn nêu hai endpoint demo, response mẫu, cách render warnings và transition.
    - UI phải hiển thị banner đỏ cho `CRITICAL`, nhãn “Destination cancelled”, exit được chọn và lý do reroute.
    - UI không tự tính route hoặc tự suy đoán evacuation; dùng `effectiveMode` từ backend.
    - Mô tả click/toggle/reset Interactive Fire, request sequencing và cách bỏ response cũ.
    - Mô tả render instruction maneuver, khoảng cách mét, wait time và floor transition.

### P0 — Verification bắt buộc trước bàn giao

- [ ] **T14 — Unit test matrix hoàn chỉnh.**
  - Acceptance Criteria:
    - Same-floor shortest path và same-floor nhiều ngã rẽ/turn-by-turn.
    - Cross-floor elevator, stair, escalator đúng direction.
    - Wheelchair loại inaccessible/stair/escalator.
    - Blocked edge/link không được dùng.
    - Nearest Store/RESTROOM/ATM/INFO theo graph cost.
    - Evacuation không elevator.
    - Fire at destination tự chuyển mode và warning.
    - Exit 1 hazard chuyển Exit 2.
    - Exit 1 và Exit 2 hazard chuyển Exit 3.
    - Fire Floor 1 gần cửa chính chuyển cửa sau; Fire Floor 2 dùng smokeproof stair.
    - Interactive hazard liên tiếp không trả stale/shared state.
    - Bearing wrap-around, threshold, scale và north offset.
    - All exits unsafe trả `NO_SAFE_EXIT_FOUND`.
    - Source hazard và invalid hazard scope.

- [ ] **T15 — E2E public API và demo scenarios.**
  - Acceptance Criteria:
    - Test qua HTTP/validation pipe, không chỉ gọi service trực tiếp.
    - Chạy đủ 16 scenario và assert node cuối, transition kinds, instructions, warnings, effective mode.
    - Test tenant/building/floor visibility và target khác building.
    - Feature flag demo off/on được test.

- [ ] **T16 — Quality gate.**
  - Acceptance Criteria:
    - `pnpm exec prisma validate` pass.
    - `pnpm exec prisma generate` pass.
    - `pnpm lint` pass.
    - `pnpm build` pass.
    - `pnpm test` pass.
    - `pnpm test:e2e` pass hoặc blocker môi trường được ghi rõ bằng log tái hiện được.
    - `git diff --check` không có whitespace error.

- [ ] **T21 — Viết implementation report để Pane 2 nghiệm thu.**
  - Acceptance Criteria:
    - Tạo/cập nhật `docs/CLAUDE_IMPLEMENTATION_REPORT.md` với mapping `Task ID -> files -> tests -> kết quả`.
    - Liệt kê migration order, API breaking-risk, config/env mới và seed command.
    - Ghi mọi deviation khỏi plan cùng lý do; không tự thay đổi Acceptance Criteria.
    - Đính kèm kết quả 16 demo scenarios và benchmark Interactive Fire.
    - Claude giữ checklist trong file này ở `[ ]`; Codex là người review rồi đổi `[x]`.

## 8. Thứ tự thực hiện khuyến nghị

```text
T01
 ├─ T02 ─ T03 ─┬─ T04
 │             ├─ T05 ─ T06 ─ T07 ─ T08
 │             └─ T09
 └─ T17 ─ T18 ─ T19

T10 phụ thuộc T03/T07/T09/T18/T19
T11 phụ thuộc T02/T03/T17
T12 phụ thuộc T05/T07/T09/T10/T11
T20 phụ thuộc T05/T06/T08/T11
T13 phụ thuộc T10/T12/T20
T14/T15/T16/T21 là quality gate và handoff cuối
```

Pane 3 nên làm theo lát dọc nhỏ: migration + vertical link tests trước, routing rules tiếp theo, sau đó mới seed/demo. Không gộp thay đổi data model, thuật toán và demo controller thành một diff không thể review.

## 9. Quy trình phối hợp Pane 2 ↔ Pane 3

Hai agent dùng chính file này làm contract, không tự phát triển hai thiết kế khác nhau:

1. **Pane 2 / Codex — System Analyst & Reviewer**
   - Sở hữu business rules, Acceptance Criteria và checklist.
   - Không sửa code cùng thời điểm Pane 3 đang sửa cùng file.
   - Review theo bằng chứng, chạy test độc lập và chỉ Pane 2 được đánh dấu `[x]`.
2. **Pane 3 / Claude Code — Implementer**
   - Implement theo thứ tự dependency và giữ backward compatibility.
   - Trước mỗi thay đổi schema/contract ngoài plan phải ghi câu hỏi hoặc deviation vào implementation report.
   - Không đánh dấu `[x]`, không giảm test/AC để làm task “pass”.
3. **Checkpoint bắt buộc**
   - **Checkpoint A — Data:** T02/T03/T17 + migration/Prisma tests.
   - **Checkpoint B — Algorithm:** T04/T09/T18/T19 + unit tests happy cases.
   - **Checkpoint C — Fire:** T05/T06/T07/T08/T20 + safety negative tests.
   - **Checkpoint D — Demo:** T10–T16/T21 + seed, 16 scenarios, e2e, benchmark.
4. Sau mỗi checkpoint, Pane 3 cập nhật `docs/CLAUDE_IMPLEMENTATION_REPORT.md`; Pane 2 kiểm tra diff/test rồi phản hồi task nào đạt, task nào cần sửa.

## 10. Tiêu chí Codex dùng để check `[x]`

Codex chỉ đánh dấu task hoàn thành khi có đủ:

1. Diff đúng scope và không phá compatibility đã nêu.
2. Acceptance Criteria có bằng chứng từ code/test, không chỉ mô tả trong comment.
3. Test âm chứng minh rule an toàn: elevator không xuất hiện, hazard target không xuất hiện, exit bị cháy không được chọn.
4. Migration có đường nâng cấp dữ liệu thật, không chỉ sửa `schema.prisma`.
5. Demo chạy từ seed sạch, không cần sửa UUID thủ công.
6. Quality gate pass hoặc có blocker môi trường hợp lệ, tái hiện được và không phải lỗi logic.
7. Turn-by-turn có test toán học tại boundary, không chỉ so sánh text tiếng Anh.
8. Interactive Fire không persist state và không render response cũ khi request đến sai thứ tự.
9. Kết quả demo nêu rõ vì sao thuật toán chọn path đó: cost, risk, transition và target.

## 11. Ngoài scope

- Sensor/IoT ingestion và phát hiện cháy thời gian thực.
- GIS polygon hazard zone; upstream phải resolve thành node IDs cho MVP.
- AR/camera navigation và frontend button implementation.
- Crowd density, smoke propagation simulation, live occupancy.
- Thay Dijkstra bằng A* nếu chưa có benchmark chứng minh cần thiết.

## 12. Kết quả nghiệm thu Frontend — Codex Pane 2 (2026-10-23)

> Phạm vi checkpoint này chỉ là commit FE `9a80f72`. Các task T01–T21 phía trên là Acceptance Criteria end-to-end có backend/migration/API/e2e nên vẫn giữ `[ ]` cho đến khi hoàn thành đủ scope. Các checkbox dưới đây ghi nhận chính xác phần FE đã được Codex đọc code và kiểm tra độc lập.

### Đã nghiệm thu

- [x] **FE01 — Engine Dijkstra/min-heap và metric frontend hoạt động.**
  - Có multi-target, wheelchair filtering, blocked edge/node, vertical timing và duration breakdown.
  - Reviewer assertion xác nhận distance theo mét, instruction aggregation và arrival mode.
  - Benchmark reviewer: graph 2.000 node/3.910 edge, median `13.45 ms`, cold run `39.28 ms`, đạt `<50 ms`.

- [x] **FE02 — Bearing/delta-bearing và maneuver typed đã triển khai.**
  - Reviewer xác nhận `350° -> 10° = +20°`, `10° -> 350° = -20°`.
  - Boundary xác nhận: `<15° STRAIGHT`, `15° SLIGHT`, `45° TURN`, `135° U_TURN`.
  - Có START/STRAIGHT/SLIGHT/TURN/U_TURN/vertical/ARRIVE/ARRIVE_AT_SAFE_EXIT và instruction theo mét.

- [x] **FE03 — DemoSimulationToolbar hiển thị đủ danh mục frontend.**
  - Có hai tab, đúng 10 Happy keys và 6 Fire keys theo manifest.
  - Có loading/active scenario, reset, fire status, warning critical và duration summary.

- [x] **FE04 — Interactive Fire local simulation hoạt động ở tầng code.**
  - Click/toggle/reset hazard cập nhật Zustand đồng bộ và gọi reroute ngay.
  - Node đang cháy bị loại khỏi graph; không cho đặt lửa tại current node.
  - Có marker cháy trên map, cảnh báo đỏ và reroute tới exit khác khi còn route.

- [x] **FE05 — Frontend quality gate khả dụng đã pass.**
  - `npm run build`: pass.
  - `npm run lint`: exit 0; navigation files mới không phát sinh warning.
  - `git diff --check`: commit sạch.

### Chưa đạt / không được tick task end-to-end

- [ ] **FE06 — Automated tests phải được commit và chạy từ package script.**
  - Repo chưa có test runner hoặc `npm test`; các assertion “fixture riêng” trong implementation report không tồn tại trong source tree.
  - Cần unit tests cho pathfinding/store và component interaction để kết quả có thể tái chạy trong CI.

- [ ] **FE07 — Backend phải là nguồn route authoritative.**
  - Demo/fire hiện gọi `findIndoorRoute()` trực tiếp trong FE, trái T13 “UI không tự tính route”.
  - Chưa có request/response `requestId`, effective mode, warnings và nearest API từ backend.
  - T20 backend contract và stale-response protection chưa hoàn thành; local synchronous calculation chỉ là demo fallback.

- [ ] **FE08 — Vertical-link data phải đến từ backend, không suy luận theo khoảng cách.**
  - FE đang suy luận stair/escalator/elevator nếu hai node gần nhau; chưa đảm bảo shaft thật, direction, `smokeProtected`, `emergencyAllowed` hoặc building scope.
  - H5/H6 dùng default escalator direction thay vì dữ liệu authoritative.

- [ ] **FE09 — Deterministic topology và browser e2e.**
  - Chưa có seed ba tầng/ba exit/ATM chuẩn nên 16 button có thể báo thiếu dữ liệu tùy building.
  - Chưa chạy click-through bằng browser với backend thật; chưa chứng minh đủ 16 scenario đều cho expected route.

- [ ] **FE10 — Đồng bộ calibration và coordinate contract.**
  - `mapUnitsPerMeter`/`northOffsetDegrees` chưa được backend trả; FE fallback `10 units/m` trong khi backend hiện có fallback riêng.
  - Implementation report xác nhận dùng map units, đang lệch quy ước `AGENTS.md` yêu cầu tọa độ `0..100%`; cần team chốt một contract duy nhất.

### Kết luận task gốc

- T17/T18/T19: **FE implementation đã có**, nhưng chưa `[x]` vì thiếu migration/backend DTO/Swagger và automated tests theo AC.
- T05/T06/T07: **FE simulation đã có**, nhưng chưa `[x]` vì thiếu `smokeProtected`, response metadata authoritative và backend safety tests.
- T12/T20: **toolbar/local interactive đã có**, nhưng chưa `[x]` vì thiếu scenario API, feature flag, request sequencing và HTTP e2e.
- T14/T15/T16/T21: chưa `[x]`; test runner/e2e/backend gates chưa đủ, implementation report cũng chưa phản ánh đúng tổng số lint warning (`18`, không phải `3`).

