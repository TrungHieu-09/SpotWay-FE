# ĐẶC TẢ KỸ THUẬT: ĐIỀU HƯỚNG NỘI KHU, THOÁT HIỂM HỎA HOẠN & BỘ NÚT DEMO (SPOTWAY)

> Tài liệu phân công và hướng dẫn triển khai cho Pane 3 (Claude) và Pane 2 (Antigravity).

---

## 1. MỤC TIÊU & PHẠM VI

1. **Hoàn thiện đồ thị Node/Edge**:
   - Bổ sung các loại Node chuyên biệt cho an toàn PCCC: `EXIT` (Cửa thoát thông thường), `EMERGENCY_EXIT` (Thang bộ thoát hiểm chống khói).
   - Hỗ trợ đánh dấu trạng thái nguy hiểm: `hazard: 'NONE' | 'FIRE' | 'SMOKE'`, `blocked: boolean`.

2. **Thuật toán Tìm đường đa tầng có tính an toàn (Safe Indoor Dijkstra)**:
   - Hỗ trợ tìm đường cùng tầng và đa tầng qua `verticalLinks` (`ELEVATOR`, `STAIR`, `ESCALATOR`).
   - **Happy Path**: Lộ trình ngắn nhất, tối ưu thời gian chờ thang máy/thang bộ.
   - **Chế độ Xe lăn (`wheelchairMode`)**: Lọc bỏ hoàn toàn thang bộ (`STAIR`), thang cuốn (`ESCALATOR`).
   - **Chế độ Hỏa hoạn (`emergencyMode: 'FIRE'`)**:
     - **CẤM TUYỆT ĐỐI THANG MÁY** (`ELEVATOR` weight = $\infty$).
     - Hủy đích đến ban đầu, tự động chọn **Lối thoát hiểm an toàn gần nhất**.
     - **Tái định tuyến tức thời (Dynamic Hazard Rerouting)**: Nếu lối thoát hiểm hoặc đường chạy bị lửa/khói chặn, đồ thị tự động cô lập khu vực đó và tìm đường sang lối thoát hiểm an toàn tiếp theo.

3. **Bộ nút bấm Demo tương tác 1-chạm (Simulation Presets Toolbar)**:
   - Phục vụ việc trình diễn trực quan cho hội đồng chấm / người dùng thử nghiệm.

---

## 2. DATA MODEL & STATE DEFINITIONS

### 2.1. Cập nhật `src/api/graph.ts` & `src/types/navigation.ts`

```ts
export type GraphNodeType =
  | 'NORMAL'
  | 'DOOR'
  | 'ELEVATOR'
  | 'STAIR'
  | 'ESCALATOR'
  | 'JUNCTION'
  | 'EXIT'
  | 'EMERGENCY_EXIT';

export type NodeHazardType = 'NONE' | 'FIRE' | 'SMOKE' | 'BLOCKED';

export type GraphNode = {
  id: string;
  floorId: string;
  x: number; // 0-100%
  y: number; // 0-100%
  name: string | null;
  type: GraphNodeType;
  accessible: boolean;
  hazard?: NodeHazardType;
};

export type GraphEdge = {
  id: string;
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  accessible: boolean;
  status: 'ACTIVE' | 'BLOCKED';
  hazard?: NodeHazardType;
};
```

### 2.2. Trạng thái trong `src/store/useNavigationStore.ts`

```ts
type NavigationSimulationState = {
  emergencyMode: 'NONE' | 'FIRE';
  activeFireNodeIds: string[];
  blockedEdgeIds: string[];
  isDemoRunning: boolean;
  
  // Actions
  triggerFireAlarm: (initialFireNodeId?: string) => void;
  blockExitWithFire: (exitNodeId: string) => void;
  resetSimulation: () => void;
  runDemoScenario: (scenarioId: string) => Promise<void>;
};
```

---

## 3. THUẬT TOÁN SAFE INDOOR PATHFINDING (`src/utils/indoorPathfinding.ts`)

Xây dựng hàm tìm đường Dijkstra hỗ trợ đa tầng và an toàn PCCC chạy linh hoạt ở client/offline:

```ts
export type PathfindingOptions = {
  wheelchairMode?: boolean;
  emergencyMode?: 'NONE' | 'FIRE';
  blockedNodeIds?: Set<string>;
  blockedEdgeIds?: Set<string>;
};

export function findIndoorRoute(
  startNodeId: string,
  targetNodeIdOrType: string | { findNearestExit: boolean },
  nodes: GraphNode[],
  edges: GraphEdge[],
  verticalLinks: Array<{ nodeIdFrom: string; nodeIdTo: string; kind: 'ELEVATOR' | 'STAIR' | 'ESCALATOR' }>,
  options: PathfindingOptions = {}
): IndoorRoute | null;
```

### Quy tắc lọc cạnh và tính trọng số (Edge Weights):
1. **Cùng tầng**: $W(u, v) = \sqrt{(x_v - x_u)^2 + (y_v - y_u)^2}$.
2. **Xuyên tầng (Vertical Link)**:
   - Nếu `options.emergencyMode === 'FIRE'` và `link.kind === 'ELEVATOR'`: **BỎ QUA** (Cấm thang máy).
   - Nếu `options.wheelchairMode === true` và `link.kind !== 'ELEVATOR'`: **BỎ QUA** (Xe lăn cấm thang bộ/thang cuốn).
   - `kind === 'ELEVATOR'`: Base cost = 25 (chờ thang) + 5 * số tầng.
   - `kind === 'STAIR'`: Base cost = 18 * số tầng.
   - `kind === 'ESCALATOR'`: Base cost = 12 * số tầng.
3. **Tránh chướng ngại vật & đám cháy**:
   - Bất kỳ Node nào trong `blockedNodeIds` hoặc có `hazard === 'FIRE'` $\rightarrow$ Không thể đi qua.

---

## 4. BỘ NÚT BẤM DEMO (`DemoSimulationToolbar.tsx`)

Thanh công cụ gồm 6 kịch bản Demo trực quan:

| ID | Tên Nút | Mô tả kịch bản kiểm thử |
| :--- | :--- | :--- |
| `demo-same-floor` | 🟢 **1. Cùng tầng** | Xuất phát: Cửa chính T1 $\rightarrow$ Đích: Quán Cafe T1. Vẽ đường + Turn-by-turn. |
| `demo-multi-floor` | 🔵 **2. Lên Tầng 3 (Thang máy)** | Xuất phát: Cửa chính T1 $\rightarrow$ Đi thang máy lên T3 $\rightarrow$ Rạp phim. Tự động đổi tầng & hiển thị 3D. |
| `demo-wheelchair` | ♿ **3. Xe lăn (Accessible)** | Tuyến đường xuyên tầng nhưng cấm thang bộ, chỉ hướng vào thang máy/ram dốc. |
| `demo-fire-alarm` | 🚨 **4. BÁO ĐỘNG HỎA HOẠN** | Kích hoạt Chế độ Cháy: cấm thang máy, tự hủy đích mua sắm, dẫn đường ra Cửa thoát hiểm 1 gần nhất. |
| `demo-fire-blocked-exit` | 🔥 **5. Lửa chặn Cửa Thoát 1** | Đám cháy lan vào Cửa thoát hiểm 1 $\rightarrow$ **Hệ thống tái định tuyến tức thời (Dynamic Reroute) sang Cửa thoát hiểm 2 an toàn**. |
| `demo-reset` | 🔄 **6. Reset Trạng Thái** | Tắt báo động, dập lửa mô phỏng, đưa đồ thị về trạng thái hoạt động bình thường. |

---

## 5. PHÂN CÔNG THỰC HIỆN (TASK BREAKDOWN)

- **Pane 3 (Claude Code)**:
  1. Cập nhật Type & Graph model (`GraphNodeType` hỗ trợ `EXIT`, `EMERGENCY_EXIT`, `hazard`).
  2. Viết module thuật toán `src/utils/indoorPathfinding.ts` (Dijkstra đa tầng + PCCC avoidance + Turn-by-turn generator).
  3. Xây dựng component `src/components/navigation/DemoSimulationToolbar.tsx` với 6 nút demo trực quan.
  4. Tích hợp thanh Demo vào `src/pages/Guest/NavigationPage.tsx` và cập nhật `useNavigationStore.ts`.

- **Pane 2 (Antigravity)**:
  1. Hỗ trợ hiển thị ngọn lửa 🔥 / vùng khói nhấp nháy trên mô hình 3D [`BuildingOverviewScene.tsx`](file:///d:/SpotWay-FE/src/components/overview/BuildingOverviewScene.tsx).
  2. Bổ sung hỗ trợ tạo nhanh các Node loại `EXIT` và `EMERGENCY_EXIT` trên Canvas Map Editor [`CanvasBoard.tsx`](file:///d:/SpotWay-FE/src/pages/BuildingManager/CanvasBoard.tsx).
  3. Giám sát, build & kiểm thử toàn bộ luồng tích hợp.
