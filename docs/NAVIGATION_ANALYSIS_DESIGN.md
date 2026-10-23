# Thiết kế Analyze điều hướng - Navigation Graph Draft từ ảnh floor plan

**Trạng thái:** Thiết kế triển khai cho Claude Pane 3  
**Phạm vi:** AI service `floorplan-intelligence` -> NestJS -> `CanvasBoard` của SpotWay-FE.  
**Mục tiêu:** tạo một graph điều hướng nháp có thể giải thích và chỉnh sửa bởi Manager. AI không được tự publish hay tự tạo navigation graph live.

## 1. "Analyze điều hướng" là gì?

Đây là thao tác hỗ trợ Manager dựng graph chỉ đường từ ảnh sơ đồ tầng. Khi Manager bấm nút:

```text
Floor plan image
  -> AI tạo draft node/edge trên lối đi an toàn, cách tường một khoảng
  -> NestJS xác thực, đổi tọa độ về pixel map và trả draft
  -> CanvasBoard vẽ overlay vàng để Manager xem, kéo, thêm, sửa, xóa
  -> Manager xác nhận Apply
  -> NestJS mới ghi Node/Edge thật vào PostgreSQL
```

Nó **không** phải là OCR để đoán tên cửa hàng, không được tự nhận diện chắc chắn lối thoát hiểm/thang máy từ hình, và không được tự publish floor. Loại node đặc biệt cùng tên, accessibility và quyết định an toàn cuối cùng thuộc Manager.

## 2. Hiện trạng đã xác minh

### 2.1 AI service

`services/floorplan-intelligence/app/main.py`:

- `POST /v1/navigation-analyze` tải ảnh rồi gọi `navigation_draft(image)`.
- `navigation_draft()` gọi `structural_floorplan()`, tạo `wall_mask`, `walkable` và `safe` erosion, nhưng kết thúc bằng `nodes: []`, `edges: []`.
- Vì vậy hiện không có thuật toán navigation graph thật. Các biến `walkable`, `safe`, `is_safe` chưa được dùng để sinh draft.
- `structural_floorplan()` loại text/màu và chỉ giữ nét đen gần trung tính. Nó phù hợp làm wall mask thô, nhưng không đủ để suy luận ngữ nghĩa shop/exit.
- `wall_probability()` đã có khả năng mask tường model/classical fallback. `requirements.txt` chưa có thư viện skeletonization như `scikit-image`.

### 2.2 NestJS

`POST /floors/:id/navigation-analysis` kiểm tra quyền và gọi `FloorplanIntelligenceService.navigationDraft(floor)`.

- Service yêu cầu `mapImageUrl`, gọi AI `/v1/navigation-analyze`, kiểm tra `nodes`/`edges` là array.
- Nó đang giả định AI trả tọa độ **percent 0-100**, rồi đổi sang pixel theo `floor.mapWidth/mapHeight` trước khi trả FE.
- Kiểm tra hiện tại còn mỏng: chưa validate finite/range/ID uniqueness/reference edge, chưa có response DTO/version/coordinate-space, và phép `Number(...)` có thể để lọt `NaN`.
- `POST /floors/:floorId/navigation-draft/apply` tạo node/edge mới trong transaction. Weight được server tính từ tọa độ, đây là hành vi đúng. API chưa idempotent và không có selective confirmation ngoài boolean DTO.

### 2.3 CanvasBoard và graph client

- `CanvasBoard.handleAnalyzeNavigation()` gọi API và set `navigationDraft`; overlay đã vẽ edge vàng nét đứt và node vàng.
- Draft node có thể kéo; `moveDraftNode()` cập nhật tọa độ pixel trong React state.
- `handleApplyNavigationDraft()` gửi **toàn bộ** draft với `confirmed: true`, rồi tải graph thật lại.
- `src/api/graph.ts` định nghĩa confidence/requiresConfirmation, nhưng Canvas chưa hiển thị confidence/warning hay hỗ trợ chọn/xóa/sửa type/name/accessibility của draft node/edge.
- Không có add draft node/edge, delete draft node/edge, confirmation per-item, preview error badge, hay protection tránh Apply draft rỗng.

## 3. Nguyên tắc kiến trúc

1. **AI suggest, Manager decides.** Draft luôn tách biệt với DB graph live và có `requiresConfirmation: true` mặc định.
2. **Không nối xuyên tường.** Đường tâm chỉ được tạo trong safe-walkable mask sau wall clearance.
3. **Conservative over exhaustive.** Một graph thưa, có warning, dễ sửa tốt hơn lưới node dày khó quản lý.
4. **Không suy đoán semantic safety.** AI chỉ gợi ý `NORMAL`, `JUNCTION`, `DOOR` có confidence. `EXIT`, `EMERGENCY_EXIT`, `ELEVATOR`, `STAIR`, `ESCALATOR`, name và accessibility phải do Manager chọn hoặc xác nhận rõ.
5. **Một quy ước tọa độ tại mỗi boundary.** AI dùng percent; NestJS là nơi duy nhất percent -> pixel; Canvas + Postgres dùng pixel.
6. **Deterministic and bounded.** Cùng input/config tạo cùng IDs/thứ tự; giới hạn image, component, skeleton pixel, node, edge và thời gian xử lý.

## 4. Thuật toán sinh Navigation Graph Draft

### 4.1 Tham số khuyến nghị

Các giá trị đặt bằng environment/config và trả về trong diagnostics khi cần:

| Tham số | Ý nghĩa | Giá trị khởi đầu |
| --- | --- | --- |
| `NAV_WALL_THRESHOLD` | ngưỡng wall probability | dùng `WALL_THRESHOLD` hiện có hoặc 0.5 |
| `NAV_CLEARANCE_PX` | khoảng cách tối thiểu tới tường ở image scale working | 8 px sau resize, scale theo min dimension |
| `NAV_MIN_COMPONENT_AREA_RATIO` | bỏ mảng free-space nhỏ | 0.001 |
| `NAV_NODE_MERGE_PX` | NMS/merge nodes gần nhau | 12 px working scale |
| `NAV_MIN_EDGE_PX` | bỏ spur/edge rất ngắn | 16 px working scale |
| `NAV_CORNER_DEGREES` | ngưỡng đổi hướng tạo corner | 25 degrees |
| `NAV_MAX_NODES` / `NAV_MAX_EDGES` | chống graph quá dày | 300 / 500 |

Ảnh nên được xử lý trên working resolution giới hạn cạnh dài, ví dụ 2048 px, rồi quy đổi ngược về percent. Không trả raw working pixel ra ngoài service.

### 4.2 Pipeline

#### Bước A - tạo wall mask tin cậy

1. Chạy `structural_floorplan(image_bgr)` để loại text/annotation màu.
2. Dùng `wall_probability(image_bgr)` hoặc structural binary. Binarize thành `wallMask` với `NAV_WALL_THRESHOLD`.
3. Morphological open loại speckle; dilate mỏng để vá lỗ raster rất nhỏ, **không** close door-width gap.
4. Dilate `wallMask` thêm `clearancePx` để tạo `blockedMask`. Đây là clearance bắt buộc để centerline không sát tường.

#### Bước B - tạo vùng walkable và chống rò ra ngoài bản vẽ

`walkable = not blockedMask` là chưa đủ: vùng trắng ngoài footprint và trong phòng đều sẽ là walkable. Cần:

1. Flood-fill background từ viền image trên bản tạm thời đóng các khe cực nhỏ. Mark exterior component.
2. `interiorCandidate = walkable - exterior`; giữ connected components đủ lớn.
3. Nếu một doorway làm flood-fill lọt vào toàn bộ interior hoặc không có component tin cậy, trả draft rỗng cùng warning `NAVIGATION_FOOTPRINT_UNCERTAIN`, không bịa graph.
4. Chỉ skeletonize component interior đã chọn. Nếu có nhiều component lớn, xử lý từng component và warning `DISCONNECTED_WALKABLE_AREAS`.

**Lưu ý giới hạn:** ảnh line drawing không cho biết chính xác public corridor vs room. Skeleton của interior là *candidate path*, không phải route an toàn được phê duyệt. UI phải nêu rõ Manager có trách nhiệm xóa path không phù hợp.

#### Bước C - medial axis / thinning

Ưu tiên thêm `scikit-image` và dùng:

```python
from skimage.morphology import medial_axis
skeleton, distance = medial_axis(safe_walkable_bool, return_distance=True)
```

`distance` cho biết clearance mỗi skeleton pixel và dùng để loại spur hẹp/noisy. Nếu không muốn thêm dependency, triển khai Zhang-Suen thinning nội bộ, nhưng không dùng `cv2.ximgproc` vì `opencv-python-headless` hiện không bảo đảm có module contrib.

Post-process skeleton:

- prune branch endpoint ngắn hơn `NAV_MIN_EDGE_PX` nếu không gần opening;
- bỏ pixels có `distance < minClearance`;
- optional bridge một gap 1-2 pixel sau khi xác nhận segment bridge không cắt `blockedMask`.

#### Bước D - trích node candidates

Với lân cận 8 hướng trên skeleton, tính degree cho từng skeleton pixel:

- `degree == 1`: endpoint.
- `degree >= 3`: junction candidate.
- `degree == 2`: trace polyline; tạo corner nếu góc giữa hướng vào/ra vượt `NAV_CORNER_DEGREES`.
- Opening candidate: nhận khoảng hở trên tường structural hoặc door polygon/hole nếu analyzer trả được; project midpoint vào skeleton gần nhất trong radius. Tạo node type `DOOR`, confidence thấp/trung bình, `requiresConfirmation=true`.

Cluster pixel candidates liên tiếp bằng connected-components, lấy centroid hoặc skeleton point có distance transform lớn nhất. Sau đó spatial NMS merge candidates dưới `NAV_NODE_MERGE_PX`, ưu tiên `JUNCTION` hơn corner hơn endpoint. Do AI không nhận biết chính xác semantic, default type:

| Nguồn candidate | Draft type |
| --- | --- |
| degree >= 3 | `JUNCTION` |
| corner trên path | `NORMAL` |
| endpoint cạnh opening | `DOOR` |
| endpoint không có opening evidence | `NORMAL` |

Không tạo `EXIT`, `EMERGENCY_EXIT`, `ELEVATOR`, `STAIR`, `ESCALATOR` chỉ từ geometry.

#### Bước E - trích edges

1. Từ mỗi node, trace skeleton chain qua degree-2 pixels cho đến node kế tiếp.
2. Một chain tạo một undirected draft edge duy nhất; canonicalize `(minNodeId, maxNodeId)` để deduplicate.
3. Drop self-loop, edge quá ngắn, edge không có sample pixel, edge xuyên `blockedMask` hoặc duplicate.
4. `weight` là tổng độ dài polyline ở native image pixel để diagnostics. Khi Apply, GraphService vẫn phải tính lại `weight = hypot(node coordinates)` giữa mỗi pair. Vì DB Edge chỉ là đoạn thẳng, bắt buộc có node tại mọi corner đáng kể để edge thẳng không cắt tường.
5. `accessible=true` chỉ là default gợi ý. Manager phải có thể đổi false.

#### Bước F - quality gates và warnings

Không trả graph có vẻ "thành công" khi ảnh không phù hợp. Trả `warnings` và diagnostic codes:

- `NO_WALKABLE_AREA`
- `NAVIGATION_FOOTPRINT_UNCERTAIN`
- `DISCONNECTED_WALKABLE_AREAS`
- `NODE_LIMIT_REACHED`
- `EDGE_LIMIT_REACHED`
- `LOW_CLEARANCE_PATHS_PRUNED`
- `OPENING_DETECTION_UNCERTAIN`

Nếu no node/edge sau quality gate, HTTP vẫn 200 với arrays rỗng và warning actionable. Chỉ 4xx/5xx cho invalid asset/service failure.

## 5. Data contract AI -> NestJS -> FE

### 5.1 Quy ước tọa độ bắt buộc

| Boundary | Coordinate space | Quy tắc |
| --- | --- | --- |
| AI `POST /v1/navigation-analyze` response | `PERCENT_0_100` | `x = nativeX / nativeWidth * 100`, `y = nativeY / nativeHeight * 100` |
| NestJS in-memory response | `PIXEL` | duy nhất `x = percentX / 100 * floor.mapWidth`; tương tự y |
| CanvasBoard state | `PIXEL` | render `x / mapWidth * stageWidth`; drag trả pixel |
| Apply DTO + Postgres Node | `PIXEL` | GraphService kiểm tra bounds và tự tính Edge weight |

Không gửi percent vào `ApplyNavigationDraftDto`, không chuyển đổi lần thứ hai tại FE. Floor phải có `mapWidth` và `mapHeight` dương trước khi analyze; nếu thiếu trả `FLOOR_MAP_DIMENSIONS_REQUIRED` thay vì fallback im lặng.

### 5.2 AI response v1

```json
{
  "schemaVersion": 1,
  "coordinateSpace": "PERCENT_0_100",
  "image": { "width": 1920, "height": 1080 },
  "nodes": [
    {
      "id": "draft-node-0001",
      "x": 37.42,
      "y": 51.08,
      "name": null,
      "type": "JUNCTION",
      "accessible": true,
      "confidence": 0.83,
      "requiresConfirmation": true,
      "source": "SKELETON_JUNCTION"
    }
  ],
  "edges": [
    {
      "id": "draft-edge-0001",
      "fromNodeId": "draft-node-0001",
      "toNodeId": "draft-node-0002",
      "weight": 184.7,
      "accessible": true,
      "confidence": 0.78,
      "requiresConfirmation": true,
      "source": "SKELETON_CHAIN"
    }
  ],
  "warnings": [],
  "diagnostics": {
    "algorithm": "medial-axis-v1",
    "wallMaskConfidence": 0.81,
    "workingWidth": 1600,
    "workingHeight": 900
  }
}
```

`confidence` luôn trong `[0, 1]`, không dùng nó như safety approval. `source` là enum optional để UI giải thích gợi ý.

### 5.3 NestJS response v1 cho Canvas

NestJS xác thực AI response trước, convert coordinates và trả:

```ts
type NavigationDraft = {
  schemaVersion: 1
  coordinateSpace: 'PIXEL'
  image: { width: number; height: number }
  nodes: Array<{
    id: string; x: number; y: number; name: string | null
    type: GraphNodeType; accessible: boolean
    confidence: number; requiresConfirmation: boolean; source?: string
  }>
  edges: Array<{
    id: string; fromNodeId: string; toNodeId: string
    weight: number; accessible: boolean
    confidence: number; requiresConfirmation: boolean; source?: string
  }>
  warnings: string[]
  diagnostics?: Record<string, unknown>
}
```

NestJS validation required before convert:

- `schemaVersion === 1`, `coordinateSpace === PERCENT_0_100`;
- finite `x/y`, inclusive 0-100; finite confidence inclusive 0-1;
- non-empty unique draft IDs; max configured node/edge count;
- edge endpoints exist, differ, unique undirected pair; no NaN/Infinity;
- type belongs `NodeType`; `accessible` boolean; strings length bounded;
- reject invalid upstream body as `NAVIGATION_ANALYSIS_INVALID`, include no raw upstream error/detail.

### 5.4 Apply contract

`POST /floors/:floorId/navigation-draft/apply` remains pixel-based, but should evolve:

```ts
type ApplyNavigationDraftDto = {
  draftId?: string                 // client-generated UUID for idempotency
  mode: 'APPEND'                  // only supported mode in MVP; explicit
  nodes: DraftNodeInput[]          // only confirmed nodes
  edges: DraftEdgeInput[]          // only confirmed edges with both endpoints confirmed
}
```

Server requirements:

- Validate all coordinates against floor dimensions, unique client IDs, node count/edge count and duplicate pairs.
- Ignore or reject edge referencing unconfirmed/removed node. Recommended: reject `DRAFT_EDGE_ENDPOINT_MISSING` so UI bugs are visible.
- Return mapping `draftNodeId -> persistedNodeId` and created edge IDs, not merely counts.
- Do not accept client-provided `weight`; recompute it.
- Prefer an `Idempotency-Key` header or persistent `draftId` audit record to prevent double click duplicate graph creation.

## 6. UI/UX design for CanvasBoard

### 6.1 Preview behavior

- Draft edge: dashed gold, opacity based on confidence; selected edge thicker.
- Draft node: gold circle with a small icon/color by type. Low confidence shows warning outline, but color cannot imply safety approval.
- Show warning panel from service and counts `N nodes, M edges, K need review`.
- Existing live graph stays cyan and visually distinct. Draft never obscures existing graph; render draft overlay above it.
- Analyze disabled if no image or map dimensions. Surface backend error detail safely.

### 6.2 Required Manager editing controls

1. Select a draft node: drag, change `type`, name, accessible, confirm/unconfirm, delete.
2. Select a draft edge: confirm/unconfirm, change accessible, delete.
3. Deleting node automatically removes all draft edges incident to it.
4. Add draft node by click and add draft edge via two-node selection. This lets Manager repair incomplete skeleton output before Apply.
5. Apply only sends confirmed nodes and edges whose endpoints are confirmed. Present a count plus confirmation dialog.
6. Cancel drops local draft only. Re-analyze replaces previous draft only after confirmation if local edits exist.
7. After Apply, reload persisted graph, clear draft, and show created/error mapping.

### 6.3 State and rendering fixes

- Extend `NavigationDraft` types with `schemaVersion`, `coordinateSpace`, `image`, `weight`, `source`, diagnostics.
- Ensure every mapping of draft coordinate is guarded by `selectedFloor.mapWidth > 0 && mapHeight > 0`.
- Keep all draft edits local until Apply. Do not mutate existing `nodes`/`edges` state during preview.
- Current render finds edge endpoints with repeated `.find`; build `Map<string, DraftNode>` with `useMemo` to avoid O(E*N) during drag.

## 7. Task breakdown cho Claude Pane 3

### Task 1 - AI service: medial-axis navigation draft

**Files:** `services/floorplan-intelligence/app/main.py`, `requirements.txt`, mới: `tests/test_navigation_draft.py`.

1. Add `scikit-image` to requirements with a compatible version; verify container installs it.
2. Refactor mask helpers into testable pure functions: `build_navigation_masks`, `extract_walkable_components`, `skeletonize_walkable`, `extract_draft_nodes`, `trace_draft_edges`, `normalise_draft_coordinates`.
3. Implement pipeline section 4, capped working resolution and deterministic `draft-node-0001`/`draft-edge-0001` IDs.
4. Use structural/wall probability mask plus clearance dilation. Implement exterior flood-fill/footprint quality gate so outside canvas is never treated as a public corridor.
5. Return AI response v1 section 5.2, including warnings/diagnostics. Default all candidate `requiresConfirmation=true`.
6. Implement opening projection only when confidence is adequate; otherwise warning. Never infer special emergency node types.
7. Tests with synthetic masks/images:
   - L-corridor: one corner node and two safe edges;
   - T-junction: junction degree 3 and three edges;
   - wall clearance: every sampled edge/skeleton point is outside blocked mask;
   - exterior white border: no candidate edge is generated outside building interior;
   - disconnected components: warning and no cross-component edge;
   - blank/noisy image: bounded empty draft + warning, no crash;
   - deterministic result across two runs.

**Acceptance:** `/v1/navigation-analyze` on a fixture emits non-empty normalized draft for a valid corridor plan, no path crosses dilated wall and all confidence values/ranges validate.

### Task 2 - NestJS: strict adapter and safe apply

**Files:** `src/floors/floorplan-intelligence.service.ts`, `floors.controller.ts`, `src/graph/graph.dto.ts`, `src/graph/graph.service.ts`, tests.

1. Define explicit upstream and public `NavigationDraft` TypeScript types/DTOs. Do not cast unknown response directly.
2. Reject analyze when `mapImageUrl`, `mapWidth` or `mapHeight` is missing/invalid. Add `FLOOR_MAP_DIMENSIONS_REQUIRED`.
3. Validate all upstream data listed in section 5.3; bound payload size; convert percent -> pixel exactly once and mark response `coordinateSpace: PIXEL`.
4. Preserve warnings/diagnostics while preventing untrusted raw error payloads leaking to FE. Update Swagger with response model/examples.
5. Expand Apply DTO with optional idempotency mechanism and response ID mappings. Validate draft references/deduplicate undirected edges server-side; recompute weights; transaction remains atomic.
6. Add tests for percent conversion, no double conversion, out-of-range/NaN/duplicate upstream AI response, invalid edge ref, valid apply mapping and repeat apply/idempotency.

**Acceptance:** Canvas receives valid pixel coordinates; invalid AI output never reaches Canvas; one Apply cannot create duplicate edges/nodes by retry.

### Task 3 - Frontend CanvasBoard: reviewable editable draft

**Files:** `D:\SpotWay-FE\src/api/graph.ts`, `D:\SpotWay-FE\src/pages/BuildingManager/CanvasBoard.tsx`, FE tests if setup exists.

1. Update API types to v1 contract. Assert/handle `coordinateSpace === 'PIXEL'` and render warnings.
2. Add draft node/edge selection and inspector controls: type, name, accessible, confirmed, delete. Add buttons/tool mode to insert draft node/edge.
3. Make deletion cascade draft edges. Drag retains pixel coordinates and edges continue to resolve endpoints.
4. Render confidence/source semantics, warnings and an explicit preview-only notice. Add disabled/loading/error states for Analyze and Apply.
5. Apply only confirmed valid subgraph; show confirmation count; use idempotency key if backend implements it. Reload graph on success and clear local draft.
6. Add component tests/manual acceptance: analyze preview shows gold graph, drag updates positions, deleting node removes attached edges, edit type works, Apply payload contains only confirmed valid items, Cancel leaves persisted graph unchanged.

**Acceptance:** Manager can take an AI result, remove bad paths, add/fix a connection, set a special type manually and apply exactly the reviewed graph.

## 8. Delivery order and non-goals

1. Task 1 fixture-driven core first, because it defines actual graph quality.
2. Task 2 contract validation before FE changes, to freeze boundary semantics.
3. Task 3 only after API response fixtures are stable.
4. Run backend Python tests, Nest unit/e2e tests and FE tests/build; manually verify one image through the full chain.

Out of scope for this feature: automatic shop naming, autonomous publish, trustworthy exit/PCCC semantic detection, full CAD topology repair, or replacing Manager safety review. Those need separate product/safety specifications.

