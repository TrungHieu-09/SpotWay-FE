# Phân tích & đề xuất tái cấu trúc Node / POI — SpotWay-FE

**Phạm vi:** đối chiếu 7 repo tham khảo trong `D:\inmap-reference` với `D:\SpotWay-FE`, tập trung Node, POI, Edge/Graph, toạ độ, phân tầng, render route, state/interaction.
**Cách đọc:** mức độ đào sâu khác nhau theo repo (xem §1.1). Những điểm chưa kiểm chứng được ghi rõ là *giả định*.

---

## 1. Tóm tắt điều hành

1. **SpotWay-FE đang lưu 3 hệ toạ độ khác nhau cho cùng một khái niệm vị trí:** `Poi` = phần trăm 0-100; `GraphNode`/`PublicNode` = pixel ảnh bản đồ (`x / mapWidth`); `NavigationDraft` = pixel. Trái với `AGENTS.md` (canvas-coordinate-rule: *mọi* object lưu %). Chuyển đổi nằm rải rác inline (`CanvasBoard.tsx`, `api/floors.ts`, `RouteMap.tsx`, `navigationDraft.ts`).
2. **POI không phải entity độc lập mà là “node có tên”.** `Poi.x/y` được *suy ra* từ node mỗi lần load (`api/floors.ts: getFloorPois`) và ghi ngược bằng chuỗi delete/post/patch N+1 (`saveFloorPois`). Hai nơi giữ cùng một sự thật (vị trí) → dễ lệch.
3. **`CanvasBoard.tsx` (1375 dòng) là god-component:** gom 4 editor mode (poi/node/edge/wall), graph state cục bộ (`useState`), optimistic update, draft AI, wall detection, render Konva. Vi phạm quy ước “state dùng chung → zustand; component không tự quản lý loading/error”. Graph state **không** nằm trong store nên `RouteMap`/Navigation không dùng chung được.
4. **Repo cũ (InMap) không phải mẫu để copy** — chúng cho thấy mô hình dữ liệu hữu ích (Node/Edge/Connector/Poi tách rời, Space gắn POI) nhưng có nhiều code smell nghiêm trọng (§4). Nên **học mô hình, không học cách triển khai**.
5. **Đề xuất:** (a) một nguồn sự thật toạ độ: *normalized 0-1/0-100 ở lớp domain, pixel chỉ ở biên render*; (b) `Poi` là entity riêng, tham chiếu `nodeId` (liên kết, không sao chép toạ độ); (c) tách `useGraphStore` (nodes/edges theo `floorId`, optimistic + rollback) khỏi `useFloorStore`; (d) tách `CanvasBoard` thành layer/tool/hook; (e) `Connector` cho liên kết xuyên tầng thay vì suy luận.

### 1.1 Mức độ khảo sát

| Repo | Đã đọc | Ghi chú |
|---|---|---|
| Service-InMap | schema node/edge/poi, DTO POI, `routing.service.ts` (findRoute), `pois.service.ts`, đầu `demo-graph.ts` | đọc kỹ phần liên quan Node/POI/Route |
| Frontend-InMap-New | cấu trúc `features/`, `manager/routing/{types,routingApi}`, `map/poiRouteSearch.ts`, `HANDOFF.md` | **chưa** đọc `RoutingManager.tsx`, `Floor3D.tsx`, `OutdoorMap.tsx` chi tiết |
| Mobile-Inmap | `navigation_models.dart`, `map_projection.dart`, thống kê `floor_stack_map`/`indoor_wayfinder_page` | **chưa** đọc thân `indoor_wayfinder_page.dart` (2177 dòng) |
| FloorPlanTo3D-API-v2 | `plans/routing-nodes/plan.md`, tên hàm viewer, `HANDOFF` | **chưa** đọc `converters.js`/`viewer/index.html` từng hàm |
| Gateway / IAM / Payment | không đọc | không liên quan Node/POI |
| SpotWay-FE | `types/{poi,navigation}`, `api/{graph,floors}`, `CanvasBoard`, `utils/canvasCoordinates`, stores (chữ ký), `RouteMap` (đầu file) | `useNavigationStore`, `indoorPathfinding` chỉ đọc chữ ký export |

---

## 2. Cách các repo tham khảo xử lý Node / POI / Route

### 2.1 Service-InMap (backend, nguồn mô hình dữ liệu)

| Entity | Trường chính | Nhận xét |
|---|---|---|
| `GraphNode` (`nodes`) | `floorId`, `type: CORRIDOR\|DOOR\|JUNCTION\|ELEVATOR\|STAIR`, `coords {x,y,z}`, `active`, `locatedFeatureId`, `metadata` | Có `z` (3D). `locatedFeatureId` liên kết tới feature/room. |
| `Edge` (`edges`) | `fromNodeId`, `toNodeId`, `distance`, `accessible`, `active`, `isEscalator/isElevator/isStairs` | **Không có `floorId`** → không lọc edge theo tầng được ở DB; 3 boolean loại phương tiện thay vì 1 enum. |
| `Connector` | `type: ELEVATOR\|STAIR\|ESCALATOR`, `servedFloors[{floorId,nodeId}]` | Liên kết xuyên tầng là **entity riêng**; service sinh cạnh dọc động (cost cố định: elevator 8, stair 5). |
| `Poi` (`pois`) | `floorId?`, `spaceId?`, `categoryId`, `name`, `type`, `status`, `coordinates {x,y,z?}`, `keywords`, hợp đồng thuê (`tenantName`, `contract*`) | POI **có toạ độ riêng**, *không* tham chiếu `nodeId`. Liên kết POI↔Node gián tiếp qua `Space.doorNodeId`. `floorId` optional → POI “chưa gán tầng” tồn tại. |
| `ScheduledBlockage` | `targetType: NODE\|EDGE\|FLOOR\|SPACE\|BUILDING`, cửa sổ thời gian/recurring | Mô hình hoá chặn đường đa mức — ý tưởng đáng học cho hazard/lửa của SpotWay. |

**Tìm đường (`routing.service.ts: findRoute`):** mỗi request (1) query toàn bộ blockage active, (2) lọc theo thời gian trong JS, (3) với từng blockage `FLOOR`/`BUILDING` lại query node, (4) `nodeModel.find({active:true})` **toàn bộ node mọi toà nhà**, (5) toàn bộ edge, (6) toàn bộ connector, rồi chạy A* in-memory; cuối cùng bắn analytics bất đồng bộ. Heuristic/cost: `distance` trên edge + hằng số dọc.

### 2.2 Frontend-InMap-New (Next.js, web)

- Cấu trúc `features/<domain>/{components,services,types.ts}` — có tính module hoá tốt (`manager/routing`, `manager/rooms`, `map`).
- `routingApi.ts` dùng `fetch` thuần + `cache: 'no-store'`, `fetchEdges()` **không nhận `floorId`** → tải toàn bộ edge hệ thống.
- Type `GraphNodeItem`/`EdgeItem` dùng `_id` (Mongo leak ra UI), `metadata?: Record<string, any>` (`any`).
- `poiRouteSearch.ts` gộp POI + Room thành `PoiOption {kind:'poi'|'room'}` → UI tìm kiếm phẳng, đích điều hướng có thể là POI hoặc Room.
- Render 3D bằng `Floor3D.tsx`/`Guest3DViewer.tsx`; 2D map ngoài trời `OutdoorMap.tsx` (665 dòng, CSS module 638 dòng) — *chưa đọc chi tiết*.

### 2.3 FloorPlanTo3D-API-v2 (editor + viewer)

- Mô hình plan: `nodes[{id,x,y,label,type:'door'|'manual'|'auto'}]`, `edges[{u,v,weight,isDoorEdge}]`; toạ độ **pixel ảnh** (Y-down).
- Sinh graph tự động: lưới ~5 m + seed node tại tâm mỗi cửa + **visibility graph** (nối 2 node nếu đoạn thẳng không cắt tường và ≤ ~6 m) thay vì $K_n$. Dijkstra chạy **client-side** trong viewer; tự tính lại khi thêm/kéo node.
- Editor là `viewer/index.html` đơn file (555 dòng + script lớn) lưu draft ở `localStorage` — prototype, không có kiến trúc state.

### 2.4 Mobile-Inmap (Flutter)

- Domain model *cục bộ, tĩnh*: `Floor{index,code,rooms,pois}`, `Poi{position: Offset (mét), kind, floorIndex}`, `RouteSegment{floorIndex, points}`. **Không có Node/Edge** ở client — route là danh sách điểm theo tầng, dữ liệu dựng sẵn.
- `MapProjection` là phép chiếu thuần (plan mét → màn hình, nội suy 2D↔isometric bằng tham số `t`, mỗi tầng dịch `floorIndex*floorGap*t`) — **một lớp projection duy nhất**, render `CustomPaint` (`floor_stack_map.dart`) gọi lại projection; đây là mẫu tốt về tách “toạ độ miền” khỏi “toạ độ màn hình”.
- `indoor_wayfinder_page.dart` 2177 dòng — god-widget tương tự `CanvasBoard`.

### 2.5 Bảng so sánh toạ độ

| Nguồn | Đơn vị | Có z | Ghi chú |
|---|---|---|---|
| Service-InMap Node | không rõ (số thực; seed theo pixel ảnh) | có | không có metadata đơn vị/tỉ lệ |
| Service-InMap Poi | không rõ | tuỳ chọn | độc lập với Node |
| FloorPlanTo3D | pixel ảnh | không | Y-down |
| Mobile | mét | không | gắn `floorIndex` |
| **SpotWay Poi** | **% 0-100** | không | theo contract |
| **SpotWay Node** | **pixel ảnh** (`mapWidth/Height`) | không | lệch contract |

---

## 3. Đối chiếu với SpotWay-FE hiện tại

### 3.1 Điểm đã tốt (giữ lại)
- Có `mapUnitsPerMeter`, `northOffsetDegrees` trên `PublicFloor` → có thể quy đổi mét; có `VerticalLink`, `Maneuver`, `RouteInstruction` → điều hướng turn-by-turn có kiểu rõ ràng.
- `createNodeOptimistic` đã có tempId, rollback, `pendingNodeIdsRef` (promise chờ id thật), reset state khi đổi tầng + cờ `cancelled` — đúng hướng trong `NODE_MANAGEMENT_PERF_AND_ISOLATION_ANALYSIS.md`.
- `canvasCoordinates.ts` có `clampPercent`, `pixelToPercent`, `percentToPixel`.
- Có test cho `indoorPathfinding` và `navigationDraft`.
- Dùng `apiClient`, không `fetch` trực tiếp (đúng convention; khác repo InMap).

### 3.2 Khác biệt cốt lõi so với InMap

| Khía cạnh | InMap | SpotWay-FE |
|---|---|---|
| POI ↔ Node | độc lập, nối qua Space/doorNode | POI **bắt buộc có** `nodeId`; vị trí lấy từ node |
| Edge có `floorId` | không | có (tốt hơn) |
| Liên kết dọc | `Connector` entity | `VerticalLink` + `inferVerticalLinks()` suy luận phía client |
| Hazard/chặn đường | `ScheduledBlockage` (server) | `hazard` trên node/edge + mô phỏng trong `useNavigationStore` |
| Tìm đường | server A* | client (`indoorPathfinding.ts`) + API-first fallback |
| Mô hình toạ độ | thống nhất 1 kiểu/không rõ | **hai** kiểu (xem 3.3) |

### 3.3 Vấn đề cụ thể trong SpotWay-FE

| # | Vấn đề | Vị trí | Mức |
|---|---|---|---|
| S1 | Node lưu **pixel**, POI lưu **%**; chuyển đổi inline `node.x / mapWidth * stageWidth` lặp ≥ 5 nơi | `CanvasBoard.tsx` (stage click ~L433, node render ~L1042, draft ~L1096), `api/floors.ts` L111/L136, `RouteMap.tsx`, `navigationDraft.ts` | **Cao** |
| S2 | `Poi` không có nguồn sự thật riêng: `getFloorPois` suy `x,y` từ node mỗi lần; `type` bị hard-code `'custom'`; mất `category` | `api/floors.ts` L100-116 | Cao |
| S3 | `saveFloorPois` ghi theo kiểu “reconcile”: GET floor + GET pois + GET nodes, rồi delete POI + delete node, patch/post từng cái — N+1, không atomic, lỗi giữa chừng để lại node mồ côi (node tạo xong, POI tạo lỗi) | `api/floors.ts` L118-143 | Cao |
| S4 | `getFloorPois` nuốt lỗi bằng `catch { return [] }` → UI hiện “0 POI” thay vì báo lỗi | `api/floors.ts` L113 | Trung bình |
| S5 | Graph state (`nodes`, `edges`, `selectedNodeId`, `routeAnchorNodeId`, `edgeStartNodeId`, `walls`, `navigationDraft`…) là 10+ `useState` trong `CanvasBoard`; không chia sẻ được; vi phạm convention state | `CanvasBoard.tsx` L155-175 | Cao |
| S6 | POI nằm trong `useFloorStore.pois` còn node/edge nằm trong component → thao tác “POI đặt trên node” phải đồng bộ tay giữa 2 nơi | `useFloorStore.ts`, `CanvasBoard.tsx` | Cao |
| S7 | `CanvasBoard.tsx` 1375 dòng, nhiều handler `async function` lồng, JSX render Stage dài ~250 dòng với `.map` trong một `<Layer>` duy nhất | `CanvasBoard.tsx` | Cao |
| S8 | `pois.map` chạy **2 lần** (circle rồi label) trong cùng layer; không tách `Layer` tĩnh (ảnh nền, tường) khỏi `Layer` động (node/edge/route) → mỗi thay đổi nhỏ vẽ lại cả canvas | L989 & L1097 | Trung bình (hiệu năng) |
| S9 | Konva shape dựng lại mỗi render, không `React.memo`, không `listening={false}` cho phần tử không tương tác (chỉ một số chỗ có); `nodeById` dựng lại mỗi render trong `RouteMap` | `CanvasBoard.tsx`, `RouteMap.tsx` L28 | Trung bình |
| S10 | Trọng số edge `weight = Math.hypot(...)` tính ở client bằng **pixel**, trong khi pathfinding quy đổi mét bằng `mapUnitsPerMeter` → hai đơn vị trộn lẫn nếu server dùng khác | `CanvasBoard.tsx` ~L511 | Trung bình |
| S11 | Hai type trùng ý nghĩa: `GraphNode` (api/graph.ts) vs `PublicNode` (types/navigation.ts); `GraphEdge` vs `PublicFloorMap.edges[]`; `NodeHazardType` định nghĩa **2 lần** (`api/graph.ts`, `types/navigation.ts`); type domain nằm trong file `api/` thay vì `types/` (vi phạm cấu trúc) | `api/graph.ts`, `types/navigation.ts` | Trung bình |
| S12 | `GraphNodeType` có `NORMAL/EXIT/EMERGENCY_EXIT/ESCALATOR` nhưng mock-api-contract chỉ mô tả `Node {id,floorId,x,y,isElevatorLink?}`; contract trong `AGENTS.md` đã lệch thực tế | `AGENTS.md` vs `api/graph.ts` | Trung bình (tài liệu) |
| S13 | `getGraph` không nhận `AbortSignal`; cờ `cancelled` chỉ chặn `setState` chứ không huỷ request | `api/graph.ts` L84, `CanvasBoard.tsx` | Thấp |
| S14 | `makeLocalId` + `pendingNodeIdsRef` + `swapSelection` là cơ chế optimistic viết tay; khó test, dễ sót nhánh (ví dụ xoá node đang `pending`) | `CanvasBoard.tsx` L496-550 | Trung bình |
| S15 | `useNavigationStore.ts` 598 dòng trộn: tải dữ liệu, tìm kiếm, tìm đường, mô phỏng lửa, kịch bản demo | `useNavigationStore.ts` | Trung bình |
| S16 | `wallDetection.ts` (557 dòng, xử lý ảnh trên main thread) và `Spin`/modal chặn trước đây — chạy trên main thread có thể gây giật | `wallDetection.ts` | Thấp-TB *(giả định: chưa đo)* |

### 3.4 Code smell / hạn chế hiệu năng của “cách làm cũ” (repo InMap)

| # | Smell | Bằng chứng |
|---|---|---|
| L1 | **Tải toàn bộ graph mỗi lần tìm đường** | `findRoute` gọi `nodeModel.find({active:true})`, `edgeModel.find`, `connectorModel.find` không lọc theo toà nhà → O(tổng hệ thống) mỗi request |
| L2 | Lọc theo thời gian blockage bằng JS sau khi tải hết; `FLOOR`/`BUILDING` blockage query lồng trong vòng lặp (N+1) | `findRoute` L193-255 |
| L3 | `Edge` không có `floorId` | `edge.schema.ts` → khó lọc/ cô lập theo tầng |
| L4 | `fetchEdges()` không nhận tham số tầng/toà | `routingApi.ts` |
| L5 | `Poi.floorId` có 5 nhánh `$or` (ObjectId/string/missing/null/''), **dữ liệu bẩn được vá trong query** thay vì migrate | `pois.service.ts` L38-62 |
| L6 | Kiểu dữ liệu `any` (`metadata`, `edgeFilter: any`, `nodeFilter: any`) | schema + service |
| L7 | `Poi` gộp quá nhiều trách nhiệm (thông tin cửa hàng, hợp đồng thuê, vị trí) | `poi.schema.ts` |
| L8 | `Poi.coordinates` không tham chiếu node → không đảm bảo POI **đến được** trên đồ thị | `poi.schema.ts` |
| L9 | God-file: `viewer/index.html` (script inline), `indoor_wayfinder_page.dart` 2177 dòng | repo tương ứng |
| L10 | Fetch thuần không có cache/abort/error chuẩn hoá (`cache:'no-store'` ở mọi nơi) | `routingApi.ts` |
| L11 | Mobile dùng dữ liệu tĩnh biên dịch sẵn, không đồng bộ với backend (*suy ra từ `navigation_models.dart`; chưa kiểm tra có lớp data API riêng không*) | Mobile `features/navigation/domain` |

---

## 4. Kiến trúc tái cấu trúc đề xuất

### 4.1 Nguyên tắc
1. **Một hệ toạ độ domain:** mọi `x,y` trong store/domain là **% 0-100** (đúng `AGENTS.md`). Pixel chỉ tồn tại trong lớp render và trong payload với backend *nếu backend yêu cầu* — khi đó chuyển đổi ở **một adapter duy nhất**.
2. **POI ≠ Node.** POI là entity nghiệp vụ (tên, loại, tầng); `nodeId` là *liên kết* tới điểm đồ thị. Vị trí hiển thị POI = vị trí node (single source of truth ở node), hoặc POI có toạ độ riêng + `nodeId` “điểm tiếp cận” (xem 4.3, lựa chọn).
3. **Dữ liệu graph theo tầng:** state key theo `floorId`; không có mảng phẳng dùng chung.
4. **Optimistic có kiểu:** một helper tái dùng, không viết tay mỗi mutation.
5. **Render tách layer** theo tần suất thay đổi.

### 4.2 Cấu trúc thư mục (trong khuôn khổ cho phép của `AGENTS.md`)

> Lưu ý: `AGENTS.md` cấm tạo thư mục mới ngoài cấu trúc. `src/utils/` đã có sẵn trên thực tế. Các thư mục con dưới đây (`canvas/`, `graph/`) **cần xác nhận với team** trước khi tạo. Phương án thay thế không cần thư mục mới: đặt phẳng trong `components/` và `utils/`.

```
src/
  types/
    geometry.ts        # PercentPoint, MapSize, (không có pixel)
    graph.ts           # GraphNode, GraphEdge, Connector, NodeType, HazardType  (gộp GraphNode + PublicNode)
    poi.ts             # Poi { id, floorId, nodeId, name, category, ... }  — không x,y
    navigation.ts      # Route, RouteStep, Maneuver...
  api/
    graph.ts           # getGraph(floorId, signal), batch ops
    pois.ts            # tách khỏi floors.ts
    mappers/graphMapper.ts  # DTO <-> domain: pixel<->percent (DUY NHẤT chỗ này)
  store/
    useGraphStore.ts   # nodesByFloor, edgesByFloor, selection, optimistic
    usePoiStore.ts     # poisByFloor
    useFloorStore.ts   # chỉ floors + selectedFloorId
    useCanvasToolStore.ts  # editorMode, nodeType, anchor, edgeStart (UI state chia sẻ giữa toolbar & canvas)
    useNavigationStore.ts  # route; tách simulation sang useFireSimulationStore.ts
  utils/
    canvasCoordinates.ts   # + toStage(point, size), fromStage(...) dùng chung cho Konva & SVG
  components/
    canvas/            # (cần xác nhận thư mục)
      FloorCanvas.tsx          # Stage + container + resize
      layers/BackgroundLayer.tsx   # ảnh + tường (static, listening=false)
      layers/GraphLayer.tsx        # edges + nodes
      layers/PoiLayer.tsx
      layers/RouteLayer.tsx        # dùng chung giữa editor preview & RouteMap
      layers/DraftLayer.tsx
      tools/{NodeTool,EdgeTool,PoiTool,WallTool}.ts  # handler theo mode
  pages/BuildingManager/
    CanvasBoard.tsx    # ghép Toolbar + FloorCanvas + panels (< ~200 dòng)
```

### 4.3 Mô hình dữ liệu

```ts
// types/geometry.ts
export type PercentPoint = { x: number; y: number }   // 0-100

// types/graph.ts
export type NodeType = 'NORMAL' | 'DOOR' | 'JUNCTION' | 'ELEVATOR' | 'STAIR' | 'ESCALATOR' | 'EXIT' | 'EMERGENCY_EXIT'

export type GraphNode = PercentPoint & {
  id: string; floorId: string
  type: NodeType; name: string | null
  accessible: boolean; hazard: HazardType        // 'NONE' mặc định, không optional
}

export type GraphEdge = {
  id: string; floorId: string
  fromNodeId: string; toNodeId: string
  accessible: boolean; status: 'ACTIVE' | 'BLOCKED'; hazard: HazardType
  // weight KHÔNG lưu ở FE: dẫn xuất = khoảng cách mét (xem dưới)
}

// Liên kết dọc là entity thật (học từ Service-InMap Connector)
export type Connector = {
  id: string; kind: 'ELEVATOR' | 'STAIR' | 'ESCALATOR'
  served: { floorId: string; nodeId: string }[]
  accessible: boolean; emergencyAllowed: boolean
}

// types/poi.ts
export type Poi = {
  id: string; floorId: string
  nodeId: string            // điểm đồ thị mà POI "đứng" — bắt buộc → luôn route được
  name: string
  category: PoiCategory     // giữ category thật, bỏ hard-code 'custom'
}
```

**Quyết định cần chốt với team (tôi khuyến nghị phương án A):**
- **A (khuyến nghị):** POI không có `x,y`; vị trí = vị trí node qua selector `selectPoiPosition(poiId)`. Hợp với backend hiện tại (`ApiPoi {nodeId,...}`), bỏ hẳn rủi ro lệch. Kéo POI = kéo node (một mutation `PATCH /nodes/:id`).
- B: POI có toạ độ riêng + `nodeId` làm “điểm tiếp cận” (giống mô hình InMap + Space.doorNode). Linh hoạt hơn (cửa hàng lớn, cửa vào xa tâm) nhưng cần backend thêm trường, và `mock-api-contract` hiện tại (`Poi.x,y`) phù hợp B. → cần BE đồng ý.

**Weight của edge:** để backend/engine tính từ toạ độ + `mapUnitsPerMeter`; FE chỉ hiển thị. Bỏ `Math.hypot` pixel ở `CanvasBoard` (S10). *Giả định:* backend hiện đã tự tính `weight` khi tạo edge (cần xác nhận với BE).

### 4.4 State: `useGraphStore`

```ts
type GraphState = {
  byFloor: Record<string, { nodes: GraphNode[]; edges: GraphEdge[]; status: 'idle'|'loading'|'ready'|'error'; error?: string }>
  load: (floorId: string) => Promise<void>        // AbortController theo floorId
  createNode: (floorId: string, input: NewNode, opts?: { linkFrom?: string }) => void
  moveNode: (floorId: string, nodeId: string, to: PercentPoint) => void
  deleteNode: (floorId: string, nodeId: string) => void
  createEdge / deleteEdge ...
  pending: number                                   // chỉ để hiện "Đang lưu…"
}
```

- Mọi mutation nhận `floorId` tường minh và ghi vào `byFloor[floorId]` → response muộn của tầng A **không thể** chui vào tầng B (loại bỏ cả lớp lỗi nền tảng, thay vì vá bằng `cancelled`).
- Optimistic dùng 1 helper `optimistic({ apply, request, commit, rollback })` thay cho code viết tay trong `createNodeOptimistic`; hàng đợi theo `tempId` để thao tác phụ thuộc node tạm chờ id thật (giữ ý tưởng `pendingNodeIdsRef`).
- Selection/mode UI chuyển sang `useCanvasToolStore` (chia sẻ giữa toolbar và canvas), vẫn đúng quy ước “state dùng chung → zustand”; trạng thái chỉ trong 1 component (modal open…) giữ `useState`.
- `useNavigationStore` đọc graph từ `useGraphStore` qua selector (hiện `PublicFloorMap` là bản sao riêng của cùng dữ liệu).

### 4.5 Lớp toạ độ & render

- `canvasCoordinates.ts` bổ sung `toStage(p: PercentPoint, size)` / `fromStage(px, size)` — mọi nơi (Konva, SVG `RouteMap`, draft) dùng đúng hai hàm này. **Cấm** công thức nội tuyến `x / mapWidth * stageWidth`.
- Điểm chuyển pixel↔% với backend nằm duy nhất ở `api/mappers/graphMapper.ts` (cần `mapWidth/mapHeight` của floor). Nếu BE đồng ý lưu % thì mapper thành identity.
- Học `MapProjection` của Mobile: nếu sau này cần xem 3D/isometric hay xếp tầng, thêm một lớp `projection(point, floorIndex)` thay vì rải công thức.
- Render:
  - `BackgroundLayer` (ảnh + tường): `listening={false}`, chỉ vẽ lại khi đổi tầng/kích thước.
  - `GraphLayer`: edge và node là component `React.memo` nhận primitive props; edge và node tra `nodeById` từ `useMemo` theo `nodes`.
  - `PoiLayer` gộp circle + label thành **một** component/`Group` (bỏ vòng `pois.map` thứ hai).
  - `RouteLayer` tách riêng, dùng chung giữa canvas editor và `RouteMap` (hiện hai nơi tự vẽ polyline khác nhau).
  - Với đồ thị lớn (hàng nghìn node) cân nhắc `Konva.FastLayer`/cache layer, hoặc vẽ edge bằng một `Shape` + `sceneFunc` thay vì N `Line`. *Chưa đo*, chỉ nên làm khi profiling cho thấy cần.

### 4.6 API & lưu POI

- Thay `saveFloorPois` (reconcile N+1) bằng thao tác theo sự kiện: `createPoi` (kèm node nếu cần, **một** endpoint/transaction phía BE), `movePoi` = `PATCH /nodes/:id`, `deletePoi`. Nếu BE chưa có endpoint gộp, FE tạm làm tuần tự *có rollback node mồ côi* khi bước POI thất bại.
- `getFloorPois` không nuốt lỗi; trả lỗi lên store (`status:'error'`).
- Mọi hàm `get*` nhận `signal?: AbortSignal` (`apiClient` là axios → hỗ trợ `signal`).
- Chuyển các type domain khỏi `api/graph.ts` sang `types/graph.ts`; xoá bản trùng `PublicNode`/`NodeHazardType`.

### 4.7 Liên kết dọc (đa tầng)
- Hiện `inferVerticalLinks()` suy luận từ node `ELEVATOR/STAIR` ở cùng vị trí giữa các tầng. Đề xuất: ưu tiên `Connector` do BE cung cấp; giữ `inferVerticalLinks` làm *fallback có cảnh báo* cho dữ liệu cũ. Editor cho phép nhóm các node thang máy thành 1 connector (UI: chọn nhiều node → “Liên kết thang máy”), thay vì dựa vào trùng vị trí.

### 4.8 Định tuyến
- Giữ `indoorPathfinding.ts` (đã có test, hazard policy). Hiệu năng: kiểm tra `buildAdjacency` có được memo theo (graph version, options) hay xây lại mỗi lần tìm đường/tái định tuyến cháy — *chưa kiểm chứng*, nên đo trước khi tối ưu.
- Nếu route tính ở server (API-first), đảm bảo request **giới hạn theo building** (tránh lỗi L1 của InMap).

---

## 5. Lộ trình tái cấu trúc (từng bước, mỗi bước 1 PR)

| Bước | Nội dung | Rủi ro | Kiểm chứng |
|---|---|---|---|
| 0 | Chốt với team: phương án A/B cho POI; BE lưu pixel hay %; có tạo thư mục `components/canvas/`; cập nhật `mock-api-contract` trong `AGENTS.md` cho đúng thực tế (S12) | thấp | review |
| 1 | `types/graph.ts`, `types/geometry.ts`; gộp `GraphNode/PublicNode`, `NodeHazardType`; cập nhật import | thấp | `tsc` |
| 2 | Thêm `toStage/fromStage` + `graphMapper`; thay toàn bộ công thức inline (S1) — **chưa đổi hành vi** | thấp | test mapper round-trip + test hiện có |
| 3 | Tạo `useGraphStore` (byFloor, abort, optimistic helper); chuyển logic từ `CanvasBoard` sang; giữ UI nguyên | **trung bình** | test store (đổi tầng giữa chừng, rollback, xoá node pending) |
| 4 | Tách `PoiStore` + sửa `getFloorPois/saveFloorPois` theo §4.6 | trung bình | test mock MSW |
| 5 | Tách `CanvasBoard` thành layers + tools (§4.2), `React.memo`, gộp POI layer | trung bình | thủ công + đo FPS khi kéo node với ~1000 node mock |
| 6 | `Connector` + UI liên kết thang máy | cao (cần BE) | theo BE |
| 7 | Tách `useNavigationStore` thành route / simulation | thấp | test hiện có |

Bước 1-3 mang lại lợi ích lớn nhất, ít phụ thuộc BE. Bước 6 phụ thuộc backend.

---

## 6. Câu hỏi mở / giả định chưa kiểm chứng

1. BE SpotWay hiện lưu node theo pixel hay %? (FE đang gửi pixel ảnh; mock-api-contract nói %.)
2. BE có tự tính `weight` edge không?
3. Phương án POI A hay B (§4.3)?
4. Có chấp nhận thư mục `components/canvas/` hoặc `store/` thêm file như đề xuất không (`AGENTS.md` yêu cầu hỏi trước)?
5. Các nhận định về hiệu năng render (S8, S9, S16) và memo của `buildAdjacency` dựa trên đọc code, **chưa profile**.
6. Phần Frontend-InMap-New (`RoutingManager`, `Floor3D`), `indoor_wayfinder_page.dart`, `converters.js` chưa đọc thân; kết luận về chúng ở §2 chỉ dựa trên cấu trúc, tên hàm và tài liệu đi kèm.

*(Báo cáo này chỉ phân tích/đề xuất; chưa sửa mã nguồn nào.)*
