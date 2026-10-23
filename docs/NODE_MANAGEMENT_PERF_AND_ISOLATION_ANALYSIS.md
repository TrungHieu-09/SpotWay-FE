# Node Management - Performance & Strict Floor Isolation Analysis

**Vai trò:** System Analyst & Architect  
**Phạm vi:** Tạo/xóa node trong `CanvasBoard` của SpotWay-FE và Graph API của SpotWay-BE.  
**Mục tiêu:** thao tác nhìn thấy ngay, không khóa canvas, không trộn dữ liệu giữa tầng và không hy sinh tính đúng đắn khi request thất bại/chậm.

## 1. Kết luận

Hai vấn đề người dùng báo là hai biểu hiện của cùng một kiến trúc state không được scope theo floor:

1. **Chậm/đóng băng khi tạo hoặc xóa:** UI chờ network trước khi cập nhật graph và `Spin` khóa toàn bộ Stage trong khi request đang chạy.
2. **Node tầng A xuất hiện ở tầng B:** state `nodes`/`edges` dùng chung cho mọi floor, không clear ngay khi đổi floor và callback request/mutation cũ vẫn được phép ghi vào state hiện tại.

Sửa đúng không chỉ là thêm `filter` khi render. Cần kết hợp:

- local graph state keyed theo `floorId`;
- optimistic create/delete với rollback có kiểm soát;
- request cancellation hoặc generation guard khi đổi floor;
- render-time floor filter như một defense-in-depth invariant;
- loading granular thay cho modal spinner toàn canvas;
- giảm query/round-trip và thêm index endpoint ở backend.

## 2. Hiện trạng và Root Cause Analysis

### 2.1 Frontend - interaction bị chặn và không optimistic

Trong `D:\SpotWay-FE\src\pages\BuildingManager\CanvasBoard.tsx`:

- `handleStageClick()` cho mode node gọi `setIsGraphSaving(true)`, **await** `createGraphNode()`, rồi mới `setNodes(...)`.
- `handleDeleteNode()` cũng **await** `deleteGraphNode()` rồi mới remove node/edge local.
- JSX bọc Stage bởi `<Spin spinning={isPoiSaving || isGraphSaving}>` (khoảng dòng 738 theo báo cáo). Ant Design Spin overlay chặn pointer interaction với toàn canvas.
- Khi `routeAnchorNodeId` có giá trị, create node nối tiếp gọi thêm `createGraphEdge()` tuần tự sau create node. User chờ hai network operations và canvas bị khóa cho cả khoảng thời gian.

Do đó thời gian cảm nhận bằng RTT API + DB authorization/write. Với Supabase cloud, chỉ vài query tuần tự ở BE đã dễ tạo cảm giác chậm, và UI lại không phản hồi thị giác trước khi hoàn tất.

### 2.2 Frontend - floor state leakage và race condition

Effect hiện tại:

```ts
useEffect(() => {
  if (!selectedFloorId) { setNodes([]); setEdges([]); ...; return }
  getGraph(selectedFloorId).then(({ nodes, edges }) => {
    setNodes(nodes); setEdges(edges)
  })
  // ... load revision
}, [selectedFloorId])
```

Các lỗi cụ thể:

1. Khi `selectedFloorId` đổi từ A sang B, `nodes` và `edges` của A **không bị clear ngay**. Chúng vẫn render trên canvas B cho tới khi API B trả về.
2. Không có `AbortController`, cancellation flag hay request generation. Nếu request A hoàn tất sau B, callback A có thể overwrite graph B.
3. Không có mutation scope. Nếu `createGraphNode(A)` kết thúc sau khi user đã chuyển B, callback hiện tại chạy:

```ts
setNodes((current) => [...current, node])
```

`current` lúc đó là state đang hiển thị của B, nên node A được append vào B. Đây là nguyên nhân trực tiếp của symptom thứ hai.
4. Edges, selected node, route anchor và navigation draft cũng dùng state global component, nên có nguy cơ tham chiếu node thuộc floor cũ.
5. Render `nodes.map(...)`/`edges.map(...)` không filter `floorId === selectedFloorId`, nên một state leak bất kỳ sẽ hiển thị trực tiếp.
6. `getGraph` dùng Axios `Promise.all` nhưng không nhận `AbortSignal`, nên unmount/floor switch không cancel request cũ.

### 2.3 Backend - round-trip và index analysis

`GraphService.createNode()` hiện đi qua:

1. `floor()` query Floor.
2. `TenantAccessService.building()` query Building.
3. Với Building Manager, thêm query `StaffAssignment`.
4. `node.create()` insert.

Vì vậy Owner/Admin ít nhất ba DB interactions; Manager ít nhất bốn. Khi Prisma app và PostgreSQL Supabase không cùng locality, latency được nhân theo chuỗi này.

`deleteNode()` hiện đi qua:

1. `node()` query node + floor relation.
2. `access.building()` query building, có thể thêm assignment query.
3. Transaction count `Poi` và `Store` để bảo vệ dependency.
4. Transaction cập nhật Node, Edge liên quan và ElevatorLink liên quan.

Đây là business logic hợp lệ nhưng có nhiều commands/query. Schema hiện có index floor/tenant của Node/Edge/POI/Store, nhưng delete lookup cần `nodeId` trên POI/Store và `fromNodeId`/`toNodeId` trên Edge/ElevatorLink. Các index hiện tại không tối ưu trực tiếp cho mọi predicate đó.

**Quan trọng:** tối ưu backend giảm network/database time, nhưng không thay optimistic UI. Ngay cả API 100 ms vẫn phải update canvas ngay.

## 3. Kiến trúc mục tiêu

### 3.1 State graph scoped theo floor

Thay `nodes`/`edges` mảng dùng chung bằng state keyed theo floor:

```ts
type FloorGraphState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  nodes: GraphNode[]
  edges: GraphEdge[]
  pendingMutations: Record<string, 'create' | 'delete' | 'edge-create'>
  error?: string
  requestVersion: number
}

type GraphByFloor = Record<string, FloorGraphState | undefined>
```

`activeGraph = graphByFloor[selectedFloorId]` là source cho canvas. Every fetch/mutation chỉ đọc/ghi entry của `floorId` mà operation đã capture khi bắt đầu. Chuyển floor không thể đưa kết quả A vào B, kể cả callback A đến muộn.

Nếu scope thay đổi lớn chưa thể làm ngay, hotfix tối thiểu bắt buộc là:

1. clear `nodes`, `edges`, `navigationDraft`, selected node and route anchor **ngay đầu effect** khi floor ID đổi;
2. capture `const requestedFloorId = selectedFloorId`; chỉ `setNodes`/`setEdges` nếu request vẫn current;
3. mutation capture `operationFloorId`; chỉ reconciliation visible state nếu active floor vẫn bằng nó;
4. render filter `node.floorId === selectedFloorId`, edge phải có `edge.floorId === selectedFloorId` và hai endpoint active node cùng floor.

Hotfix này giảm leak, nhưng keyed state vẫn là thiết kế bền vững được khuyến nghị.

### 3.2 Cancellation và request generation

Mở rộng API client:

```ts
export async function getGraph(floorId: string, signal?: AbortSignal) {
  const config = { signal }
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    apiClient.get<GraphNode[]>(`/floors/${floorId}/nodes`, config),
    apiClient.get<GraphEdge[]>(`/floors/${floorId}/edges`, config),
  ])
  return { nodes, edges }
}
```

Trong effect, create `AbortController`; cleanup gọi `abort()`. Ngoài cancellation, dùng monotonically increasing `requestVersion`/ref. Axios cancellation là best effort, generation check là guarantee không set stale state.

Không biến cancel thành graph error. Phân biệt `ERR_CANCELED`/`CanceledError` và silently ignore.

### 3.3 Optimistic create node

Khi user click map:

1. Capture immutable `floorId`, input pixel coordinates and current route anchor.
2. Generate `temp:${crypto.randomUUID()}`; ngay lập tức insert `GraphNode` local có `id=temp`, `floorId`, `pending: true` vào state entry của floor đó. Set selected/route anchor theo temp ID. Canvas render nó với opacity/dashed ring nhỏ và indicator "Đang lưu" không chặn pointer.
3. Start API create. Success: atomically replace temp ID bằng persisted ID trong node list và cập nhật mọi edge/selection/route anchor tham chiếu temp ID.
4. Nếu cần edge nối từ anchor, optimistic insert dashed temporary edge; persist edge **sau khi** endpoint temp node đã được resolved. Với chain có nhiều temp node, dùng operation queue/topological resolver để không gửi temp ID lên BE.
5. Failure: remove temp node và temp incident edges; restore selection/anchor snapshot nếu vẫn hợp lệ; show inline retry action. Không refetch/overwrite floor khác.

Mỗi pending mutation có operation ID. Không dùng boolean `isGraphSaving` global vì nó không thể mô tả nhiều simultaneous operations.

### 3.4 Optimistic delete node

1. Tại confirmation, snapshot node + incident edges trong **floor entry**.
2. Remove node/edges khỏi visible graph ngay trong same render; clear selected/route anchor/edge-start nếu chúng trỏ node đó. Render zero latency.
3. Gọi DELETE ở background và đánh dấu pending deletion nếu cần audit/UI.
4. Success: discard snapshot.
5. Failure, ví dụ `NODE_HAS_DEPENDENCIES`: nếu không có subsequent reload authoritative, restore exact snapshot vào đúng floor entry (dedupe by ID); tốt hơn refetch riêng floor đó to reconcile server truth. Hiển thị lỗi và action "Tải lại graph".

Delete optimistic chỉ áp dụng sau explicit confirmation. Với dependency POI/Store, error rollback là expected and must be predictable.

### 3.5 Granular loading UI

- Bỏ `isGraphSaving` khỏi `Spin` bọc Stage. `isPoiSaving` cũng nên được xem xét tương tự để POI mutation không đóng băng map.
- Stage giữ interactive. Chỉ dùng overlay blocking khi initial image/canvas load hoặc destructive full replacement thực sự cần lock.
- Hiện spinner icon nhỏ ở toolbar và badge/pending style trên node/edge liên quan; disable only duplicate action for that item.
- Tách state: `isGraphInitialLoading`, `isAnalyzingNavigation`, `isApplyingDraft`, `pendingNodeIds`, `pendingEdgeIds`. Những thao tác nặng như Analyze navigation vẫn có thể disable chính button Analyze, không disable Stage.

### 3.6 Render invariants

Ngay trước render:

```ts
const activeNodes = useMemo(
  () => activeGraph.nodes.filter((n) => n.floorId === selectedFloorId),
  [activeGraph.nodes, selectedFloorId],
)
const activeNodeIds = useMemo(() => new Set(activeNodes.map((n) => n.id)), [activeNodes])
const activeEdges = useMemo(
  () => activeGraph.edges.filter((e) =>
    e.floorId === selectedFloorId &&
    activeNodeIds.has(e.fromNodeId) &&
    activeNodeIds.has(e.toNodeId),
  ),
  [activeGraph.edges, activeNodeIds, selectedFloorId],
)
```

Đây là guard cuối cùng, không thay source-of-truth keyed state. Dùng `Map` node-by-id cho render edges thay repeated `nodes.find()`.

## 4. Backend optimization design

### 4.1 Preserve authorization semantics

Không bỏ `TenantAccessService` chỉ để giảm query. Manager phải vẫn bị giới hạn tenant và building assignment. Tuy nhiên authorization lookup có thể gộp với resource lookup.

Tạo helper scoped projection, ví dụ `findAccessibleFloorForGraph(user, floorId)`, với query Floor + Building relation. Với Manager, include/existential filter trên `building.assignments.some({ userId })`; với Owner require tenant match; Admin no tenant condition. Chọn only fields thật cần: `id`, `tenantId`, `buildingId`, `mapWidth`, `mapHeight`.

Create then là:

```text
one scoped Floor SELECT -> one Node INSERT
```

thay cho Floor SELECT -> Building SELECT -> optional Assignment SELECT -> INSERT. Hành vi 404/403 cần được giữ nhất quán theo policy hiện tại.

### 4.2 Delete in fewer database commands

Trong transaction:

1. Lookup node scoped/authorized, select floor/building and node ID.
2. Check dependent POI/Store bằng một `SELECT EXISTS` aggregate (hoặc two concurrent `findFirst` in a single transaction if Prisma generated API is preferred), không count toàn bộ rows.
3. Nếu dependency tồn tại, throw `NODE_HAS_DEPENDENCIES`.
4. Batched transaction soft-deletes Node, incident Edges, incident ElevatorLinks.

Không được delete node với POI/Store attached. Không thay business behavior bằng cascade im lặng.

### 4.3 Index migration

Đo bằng `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu representative trước/sau. Candidate partial indexes PostgreSQL:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS edges_from_active_idx
  ON edges (from_node_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS edges_to_active_idx
  ON edges (to_node_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS pois_node_active_idx
  ON pois (node_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS stores_node_active_idx
  ON stores (node_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS elevator_links_from_active_idx
  ON elevator_links (node_id_from) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS elevator_links_to_active_idx
  ON elevator_links (node_id_to) WHERE deleted_at IS NULL;
```

Prisma migrations normally run in a transaction; PostgreSQL `CREATE INDEX CONCURRENTLY` cannot. Claude phải chọn migration deployment strategy phù hợp (non-concurrent migration trong maintenance window cho demo data, hoặc operational SQL migration ngoài transaction cho production). Không tự chạy concurrent SQL bên trong migration mặc định.

### 4.4 Other backend safeguards

- Return compact node payload for create; no unnecessary includes.
- Add request IDs and duration metrics around graph create/delete to separate FE perceived latency from API/DB latency.
- Establish target measurements: p95 API create/delete below 300 ms in same region as database, but UI visual acknowledgement below one animation frame due optimistic update.
- Do not batch arbitrary create/delete clicks into one API unless UX explicitly supports offline/bulk edits. Optimistic individual mutations are easier to reconcile.

## 5. Detailed Action Plan for Claude Pane 3

### A. Frontend P0 - fix floor isolation before performance work

- [ ] Refactor CanvasBoard graph state to `graphByFloor[floorId]`, or implement the documented immediate hotfix then schedule keyed-state refactor in the same PR if scope permits.
- [ ] At floor change, synchronously clear active selection state: `selectedNodeId`, `edgeStartNodeId`, `routeAnchorNodeId`, `navigationDraft`, graph error and floor-specific wall preview.
- [ ] Add `AbortController` support to `getGraph`; abort in effect cleanup.
- [ ] Add `requestVersion` ref and compare captured floor/version before any fetch completion writes state.
- [ ] Capture `operationFloorId` in every create/delete/edge mutation. Reconcile only the corresponding floor entry, never generic current state.
- [ ] Apply strict `floorId` + endpoint membership filter before rendering Node and Edge layers, side lists and selected-node lookup.
- [ ] Add tests: switch A -> B while A graph is delayed; resolve B then A; assert only B nodes render. Repeat when create A resolves after switch to B.

### B. Frontend P0 - zero-latency node mutations

- [ ] Replace global `isGraphSaving` spinner with per-operation pending state.
- [ ] Implement temporary IDs and optimistic create, replacement on success, rollback/retry on failure.
- [ ] Implement optimistic delete with snapshot and reconcile/refetch on reject.
- [ ] Support temporary route-anchor chain/temporary edge correctly or, as a temporary safety measure, disallow automatic edge creation to a pending node with a visible message. Never send temporary ID to backend.
- [ ] Keep Stage clickable while mutations run; show small saving badge and pending node/edge styling.
- [ ] Prevent duplicate delete/create click for the same pending operation, but do not disable unrelated floor interaction.
- [ ] Add component tests with delayed mocked API: node appears before promise resolves; failed create disappears; delete immediately hides node/incident edge and restores/reloads on failure.

### C. Backend P0 - reduce DB work without weakening RBAC

- [ ] Add scoped floor/node access helpers that combine resource lookup and authorization predicate, preserving Admin/Owner/Manager roles and existing error semantics.
- [ ] Change create node to scoped floor select plus insert.
- [ ] Change delete dependency checks from `count` to existence semantics; batch writes transactionally; keep POI/Store dependency conflict behavior.
- [ ] Add necessary partial indexes through a reviewed deployment-safe migration strategy.
- [ ] Add GraphService unit tests for cross-tenant/cross-building manager access and node delete dependency protections after refactor.
- [ ] Instrument latency and inspect query plans; do not claim perf gain only from code shape.

### D. Validation / acceptance matrix

| Scenario | Expected |
| --- | --- |
| Create node with 500 ms mocked API | pending node visible immediately, Stage accepts unrelated click |
| Create API fails | temporary node and pending edge disappear; clear inline error/retry |
| Delete node with incident edges | node/edges vanish immediately; success stays removed |
| Delete rejected due POI/Store | graph reconciles/restores only on that floor; error explains dependency |
| Switch F1 -> F2 before F1 fetch resolves | F1 never appears on F2 |
| Create F1 then switch F2 before completion | response stored/reconciled only in F1 entry; F2 untouched |
| Switch repeatedly F1/F2/F3 | abort/stale requests never overwrite latest selected graph |
| Render corrupted mixed state | guards exclude node/edge whose `floorId` or endpoint membership mismatches |
| Manager without assignment | backend remains forbidden after query optimization |

## 6. Rollout order

1. Implement A first and add delayed-request regression tests. This removes cross-floor correctness corruption.
2. Implement B next for immediate UX gain; retain feature flag or easily observable errors during rollout.
3. Implement C with baseline metrics/query plans, then compare p50/p95 in staging near Supabase.
4. Run FE unit/build, Nest test/e2e and a manual throttled-network test. Verify no full-canvas spinner occurs on normal create/delete.

## 7. Non-goals and cautions

- Do not use client-side filtering as the only isolation mechanism. Server-scoped API and floor-keyed local state remain mandatory.
- Do not optimistic-delete POI/store dependencies silently. Backend remains authoritative and rollback/reconcile is required.
- Do not replace all graph state after every mutation with a global reload. It reintroduces latency/flicker and stale response risk.
- Do not make mutations fire-and-forget. Each needs success reconciliation, failure rollback and user-visible error.
- Do not add database indexes blindly without checking existing production index size/query plans and Prisma migration constraints.

