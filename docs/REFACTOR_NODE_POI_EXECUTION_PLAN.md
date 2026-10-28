# Kế hoạch thực thi: tái cấu trúc Node / POI / Graph (SpotWay-FE)

Nhánh: `refactor/node-poi-graph-v2`. Căn cứ: `docs/REFACTOR_NODE_POI_ANALYSIS.md`.

## 0. Quyết định đã chốt (theo chỉ đạo)

| # | Quyết định |
|---|---|
| D1 | Domain types & store chỉ lưu toạ độ **% (0..100)**. Pixel chỉ sinh ra ở biên: Konva/SVG (render) và mapper DTO (gửi/nhận BE). |
| D2 | `Poi` là entity độc lập: toạ độ riêng `x,y`, `category`, `icon`, `nearestNodeId` (tự snap vào node gần nhất cùng tầng). Bỏ “POI là node có tên”. |
| D3 | `useGraphStore`: `nodesByFloor`, `edgesByFloor`, `connectors`, selection, optimistic mutation có rollback. Mọi mutation nhận `floorId` tường minh. |
| D4 | `CanvasBoard` tách thành Layer + Tool: `MapBackgroundLayer`, `GraphEdgesLayer`, `GraphNodesLayer`, `PoiMarkersLayer`, hook `useCanvasTool`. |
| D5 | Edge domain **không** có `weight` (dẫn xuất từ toạ độ + `mapUnitsPerMeter` khi cần). |

## 1. Ràng buộc & rủi ro cần xử lý

1. **Backend hiện tại chưa hỗ trợ D2.** `ApiPoi` chỉ có `{id, floorId, nodeId, name, category}`; node lưu **pixel**. Mapper phải: (a) đọc `x,y` POI từ DTO nếu BE trả, ngược lại **fallback** lấy từ node `nodeId`; (b) khi ghi, gửi `x,y` (pixel), `nodeId = nearestNodeId`, `icon`. Việc BE nhận/lưu `x,y,icon` là **phụ thuộc ngoài** — chốt trước Phase 4. Mọi giả định nằm trong **một** file: `src/api/graphMapper.ts`.
2. **Không tạo thư mục mới** (AGENTS.md): mapper/gateway đặt phẳng trong `src/api/`; store core trong `src/store/`; layer/tool ở Phase 3 cần xác nhận `src/components/canvas/` (hoặc đặt phẳng trong `src/components/`).
3. **Giữ build xanh theo từng phase.** Code cũ (`api/graph.ts`, `useFloorStore.pois`, `saveFloorPois`) tồn tại song song đến khi được thay; `Poi` kiểu cũ đổi tên `LegacyPoi` trong Phase 1 và bị xoá ở Phase 4.
4. Test runner hiện tại là `node --test` + `--experimental-strip-types`: file test chạy trong Node nên **không import** `api/client.ts` (dùng `import.meta.env`). Vì vậy store tách `createGraphStore` (thuần, nhận gateway) và `useGraphStore` (gắn gateway thật).
5. Cập nhật `AGENTS.md` (mục Mock API Contract) **trước/cùng** thay đổi shape (quy ước repo).

## 2. Các phase

### Phase 1 — Nền tảng dữ liệu (xong)
- `types/geometry.ts`, `types/graph.ts`, `types/poi.ts` (kèm `LegacyPoi`).
- `utils/graphGeometry.ts`: `findNearestNode`, `distanceInMapUnits` (có test).
- `api/graphMapper.ts`: DTO ⇄ domain, pixel⇄% **duy nhất** tại đây (có test round-trip).
- `api/graphGateway.ts`: gọi axios, trả domain types, nhận `AbortSignal`.
- `store/createGraphStore.ts` + `store/useGraphStore.ts` (có test: cô lập tầng, optimistic, rollback, tempId→realId, abort).
- Cập nhật `package.json` test glob, `AGENTS.md` contract.
- **Không** sửa `CanvasBoard`, không đổi hành vi UI.
- Done khi: `tsc -b` sạch, `npm test` xanh, lint không thêm lỗi mới.

### Phase 2 (xong) — Chuyển `CanvasBoard` sang `useGraphStore`
- Thay 10+ `useState` graph bằng selector; xoá `createNodeOptimistic`/`pendingNodeIdsRef` thủ công.
- Chuyển `CreateStoreModal`, `navigationDraft` sang type domain; hợp nhất `api/graph.ts` cũ vào `graphGateway.ts`; xoá `PublicNode`/`NodeHazardType` trùng.
- Draft AI (pixel) đi qua mapper → % trước khi vào store.
- Xoá công thức `x / mapWidth * stageWidth` inline.

### Phase 3 (xong) — Layer & Tool
- `MapBackgroundLayer` (ảnh + tường, `listening={false}`), `GraphEdgesLayer`, `GraphNodesLayer` (`React.memo`), `PoiMarkersLayer` (circle+label gộp), `RouteLayer` (dùng chung với `RouteMap`).
- `useCanvasTool` (mode, nodeType, anchor/edgeStart; tool handler theo mode) — UI state chia sẻ → `useCanvasToolStore` nếu toolbar tách khỏi canvas.
- `CanvasBoard.tsx` còn ≲ 250 dòng.
- Hạ tầng toạ độ render: `toStage/fromStage` thêm vào `canvasCoordinates.ts`.

### Phase 4 (xong) — POI entity
- `usePoiStore` (`poisByFloor`, optimistic, `nearestNodeId` tự snap qua `findNearestNode` khi tạo/kéo; snap lại khi node đổi/xoá).
- Xoá `saveFloorPois`, `getFloorPois` suy từ node, `useFloorStore.pois`, `Floor.pois`, `LegacyPoi`.
- `api/pois.ts` (create/update/delete theo sự kiện; không reconcile). Cần BE (rủi ro #1).

### Phase 5 (xong) — Connector
- Đã nạp `GET /buildings/:id/connectors` vào `useGraphStore.connectorsByBuilding`; `ConnectorsLayer` + tab Connector. UI tạo/sửa connector chưa làm (BE đã có POST/PATCH/DELETE).
- Nạp `connectors` từ BE (endpoint cần BE), UI nhóm node thang máy; `inferVerticalLinks` chỉ còn là fallback.

### Phase 6 (xong, trừ mục còn lại) — Dọn dẹp
- Đã làm: popover sửa POI, `RouteMap` dùng `GraphNode` domain qua `toRouteMapData`, bỏ export thừa. Còn lại: tách `useNavigationStore` (route / simulation); `indoorPathfinding` vẫn tính theo pixel.
- Tách `useNavigationStore` (route / simulation); cập nhật `RouteMap` dùng `GraphNode` domain; xoá code chết.

## 3. Thiết kế chi tiết Phase 1

### 3.1 Types
```ts
PercentPoint {x,y}  MapSize {width,height}            // geometry.ts
NodeType, HazardType, GraphNode, GraphEdge, Connector  // graph.ts
PoiCategory, Poi {id,floorId,name,category,icon,x,y,nearestNodeId}  // poi.ts
```
### 3.2 Store (`createGraphStore`)
- State: `nodesByFloor`, `edgesByFloor`, `mapSizeByFloor`, `loadStatusByFloor`, `connectors`, `selectedNodeId`, `selectedEdgeId`, `pendingOps`, `error`.
- Actions: `loadFloorGraph(floorId, size)` (abort request cũ cùng tầng), `clearFloor`, `createNode(floorId, input, {linkFromNodeId})→tempId`, `moveNode`, `deleteNode`, `createEdge`, `deleteEdge`, `selectNode/selectEdge`, `setConnectors`, `clearError`.
- Bất biến: mutation chỉ ghi `…ByFloor[floorId]`; response muộn của tầng A không đụng tầng B. ID tạm (`tmp-…`) được map sang ID thật; thao tác phụ thuộc node tạm chờ ID thật.
- Rollback: create → gỡ temp; move → trả vị trí cũ **chỉ khi** vị trí hiện tại vẫn là vị trí optimistic; delete → khôi phục node+edge đã gỡ.

### 3.3 Mapper
`nodeFromDto / nodeToCreateDto / positionToDto / edgeFromDto / poiFromDto / poiToDto`; `MapSize` không hợp lệ (≤0, NaN) → ném lỗi (không âm thầm ra NaN).

## 4. Tiêu chí kiểm chứng chung
`npx tsc -b`, `npm test`, `npm run lint` (so với baseline), kiểm thủ công canvas ở cuối Phase 2/3.
