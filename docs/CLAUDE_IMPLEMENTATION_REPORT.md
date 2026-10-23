# CLAUDE IMPLEMENTATION REPORT — Frontend (Pane 3)

> Phạm vi: repo `SpotWay-FE`, theo yêu cầu "code ngay trên Frontend". Checklist trong `CODEX_TASK_PLAN.md` giữ nguyên `[ ]` để Codex nghiệm thu.

## 1. Mapping Task → files → bằng chứng

| Task | Files | Bằng chứng / kết quả |
| --- | --- | --- |
| T17 (FE) calibration & metric | `src/utils/indoorPathfinding.ts`, `src/types/navigation.ts` (`PublicFloor.mapUnitsPerMeter`, `northOffsetDegrees`) | Mét = `hypot / mapUnitsPerMeter` theo từng floor; giá trị ≤0/NaN → fallback `DEFAULT_MAP_UNITS_PER_METER=10`. Test "calibration per floor (G 10u/m, F2 20u/m)" → 32.36 m. `totalDistance` chỉ cộng WALK. |
| T18 (FE) generalized cost & duration | `indoorPathfinding.ts` | Min-heap, khoá `(risk, costSeconds, nodeId)` deterministic. Timing: thang máy wait 30 s + 4 s/tầng, thang bộ 18 s/tầng, thang cuốn 12 s/tầng (`DEFAULT_VERTICAL_TIMING`). Response có `walkingDurationSeconds + transitionDurationSeconds = estimatedDurationSeconds`. Nearest = 1 lần Dijkstra multi-target (`{ nodeIds }`). |
| T19 turn-by-turn | `indoorPathfinding.ts` (`mapBearing`, `deltaBearing`, `classifyManeuver`, `MANEUVER_THRESHOLDS`, `buildTurnByTurn`) | Đúng công thức mục 4.5; maneuver START / STRAIGHT / SLIGHT_* / TURN_* / U_TURN_* / ELEVATOR / STAIR / ESCALATOR / ARRIVE / ARRIVE_AT_SAFE_EXIT. Gom WALK collinear, reset bearing sau chuyển tầng, giữ `steps`, thêm `instructions`. Test wrap 350→10=+20, 10→350=−20, boundary 15/45/135, tổng segment sai số ≤0.01 m. |
| T05/T06/T07 (FE) fire policy | `indoorPathfinding.ts`, `src/store/useNavigationStore.ts` | Cấm elevator khi FIRE; escalator mặc định `emergencyAllowed=false`; hazard bị loại khỏi candidate và node trung gian; risk-aware (`nodeRisk`, bán kính 8 m, chỉ cùng tầng). Điểm đến cháy → `routeWarning.code=DESTINATION_IN_HAZARD`, `CRITICAL`, `destinationCancelled`. Hết lối thoát → `NO_SAFE_EXIT_FOUND`; nguồn cháy → `SOURCE_IN_HAZARD`. |
| Bộ demo 10 Happy + 6 Fire | `src/components/navigation/DemoSimulationToolbar.tsx`, `useNavigationStore.ts` | 2 tab "🟢 Happy Cases thường" / "🚨 Kịch bản hỏa hoạn", key trùng manifest mục 6 (H1–H10, F1–F6) + Reset. |
| T20 (FE) Interactive Fire Mode | `DemoSimulationToolbar.tsx`, `RouteMap.tsx/.css`, `NavigationPage.tsx`, store `toggleFireNode` / `setInteractiveFireMode` / `extinguishAllFires` | Toggle "🔥 Chế độ đặt lửa tương tác"; chạm node → đốt/dập, tái định tuyến ngay từ bước hiện tại; nút "🧯 Dập tắt tất cả lửa". Không cho đốt tại vị trí người dùng. Tính local, đồng bộ → không có race nên chưa cần `requestId`. |

## 2. Kết quả kiểm thử

- `npm run build` (tsc -b + vite build): pass.
- `npx oxlint` trên các file đã sửa: 0 cảnh báo (3 cảnh báo còn lại của repo thuộc `BuildingOverviewScene.tsx`, `CanvasBoard.tsx` — không thuộc phạm vi).
- `git diff --check`: pass.
- Repo FE chưa có test runner; 14 kiểm tra assert chạy bằng `node --experimental-strip-types` trên fixture riêng, tất cả pass:
  bearing/boundary, maneuver + gom mét, calibration 2 floor, elevator wait/duration, escalator một chiều, xe lăn, nearest theo graph cost, baseline exit1, Exit1→Exit2, Exit1+2→Exit3, hết lối thoát → null, cháy tại đích (first hop `safeAway`), click node trên path bị loại khỏi path mới, evacuation không dùng elevator dù nhanh hơn, source hazard → null, hiệu năng lưới 2000 node ≈29 ms (< 50 ms).

## 3. Deviation khỏi plan (cần Codex/user quyết)

1. **Plan hướng tới backend** (Prisma, seed, demo API, e2e: T02–T04, T08–T16). Phần này **chưa làm**; FE hiện tự tính tuyến bằng `indoorPathfinding.ts`. Điều này trái với T13 ("UI không tự tính route"); khi BE có `/public/demo/navigation-scenarios` và response mở rộng, store nên chuyển sang gọi API và chỉ render `effectiveMode`/`warnings`.
2. **Escalator direction**: dữ liệu public chưa có `direction`; H5/H6 mô phỏng bằng `defaultEscalatorDirection='UP'`.
3. **Vertical link**: BE chỉ trả elevator link; FE suy luận link thang bộ/thang cuốn/thang máy từ node cùng loại gần vị trí ở tầng kế (`inferVerticalLinks`, lệch ≤150 đơn vị bản đồ).
4. **POI ATM**: BE chưa có category `ATM`; H9 khớp theo `category === 'ATM'` hoặc tên chứa "atm" và báo lỗi rõ nếu không có.
5. **Kịch bản dựa trên dữ liệu tòa nhà thật** (chưa có seed topology chuẩn): điểm xuất phát = DOOR tầng thấp nhất; lối thoát = `EXIT`/`EMERGENCY_EXIT`, fallback DOOR tầng trệt. Thiếu dữ liệu → hiện thông báo lỗi cụ thể, không crash.
6. **Toạ độ**: engine coi `x/y` là đơn vị bản đồ (khớp BE và `RouteMap`), khác mục "0–100%" trong `AGENTS.md`.
7. Chưa kiểm thử click-through trên trình duyệt với backend thật.

---

# Cập nhật 2 — Main Flow FE (P0.5 / FE06–FE08)

## 4. Mapping hạng mục → files → bằng chứng

| Hạng mục | Files | Bằng chứng / hành vi |
| --- | --- | --- |
| **P0.5 / Flow 3 — QR onboarding** | `src/routes/index.tsx`, `src/api/publicNavigation.ts` (`resolvePublicQrToken`), `src/pages/Guest/NavigationPage.tsx`, `src/types/navigation.ts` (`PublicQrResolution`) | Route `/navigate` và `/navigate/:buildingId`. `?qr=<token>` → `GET /public/qr/:token` → tự lấy `buildingId`, `floorId`, `nodeId`, khoá điểm xuất phát (Select bị disable, chạm bản đồ không đổi) + banner "Vị trí quét QR: [label]" (nút "Đổi vị trí" mở khoá). Có loading (Skeleton) và lỗi token (Alert). `?fromNodeId=&floorId=` gán vị trí xuất phát; `?toStoreId=` tự `beginRoute()` đúng 1 lần khi đã có điểm xuất phát và destinations. Chỉ dùng mock khi backend không truy cập được (Network Error/timeout) và token bắt đầu bằng `demo`; token sai/hết hiệu lực vẫn báo lỗi thật. |
| **FE07/FE08 — API trước, offline sau** | `src/store/useNavigationStore.ts` (`findRoute`) | Gọi `createPublicRoute`; lỗi/mất mạng → `applyRoute` (Dijkstra cục bộ) với cùng input; nếu cả hai thất bại mới ném lỗi API gốc. `routeSource: 'api' | 'offline'`, page hiện banner "Chế độ ngoại tuyến". Khi đang báo cháy, request gửi `mode=EVACUATION` + `hazardNodeIds`. |
| **Hiển thị warnings** | `NavigationPage.tsx`, store `routeWarning` | Banner đỏ cho `CRITICAL`; `DESTINATION_IN_HAZARD` hiện "Điểm đến đang bị cháy — đã huỷ điểm đến", tên điểm đến bị huỷ, lối thoát được chọn. Với response API: đọc `warnings[]`, `destinationCancelled`, `effectiveMode`, `resolvedDestination`; nếu `effectiveMode=EVACUATION` bật chế độ cháy. Cũng áp cho đường offline (`SOURCE_IN_HAZARD`, `NO_SAFE_EXIT_FOUND`). |
| **FE06 — tests tự động** | `src/utils/indoorPathfinding.test.ts`, script `npm test` (node:test tích hợp sẵn, không thêm dependency), `tsconfig.app.json` (exclude `*.test.ts` vì `types` chỉ có `vite/client`) | Xem mục 5. |
| Refactor để test được | `src/utils/indoorPathfinding.ts` (`findRouteWithHazardPolicy`) | Logic "huỷ điểm đến cháy / đổi sang EVACUATION / NO_SAFE_EXIT_FOUND / SOURCE_IN_HAZARD" chuyển từ store sang hàm thuần; store `applyRoute` gọi hàm này (không đổi hành vi). |

## 5. Kết quả kiểm thử

- `npm test`: **19/19 pass** (5 suite):
  - bearing/maneuver: wrap-around 350°→10°=+20°, 10°→350°=−20°, hướng la bàn, boundary 15/45/135° hai phía;
  - cùng tầng: đường ngắn nhất, gom đoạn + tổng mét sai số ≤0.01, hai tầng khác tỉ lệ, đồ thị đứt → null;
  - xe lăn: loại thang bộ/thang cuốn (cả riêng lẻ), loại cạnh và vertical link `accessible=false`;
  - hỏa hoạn: cấm thang máy dù ngắn hơn (thường ngày vẫn dùng), né hazard, Exit1→2→3→null, ưu tiên an toàn (hop đầu `safeAway`), click node trên tuyến → tuyến mới loại node đó;
  - điểm đến cháy: tự huỷ + `EVACUATION` + `DESTINATION_IN_HAZARD`, hết lối thoát → `NO_SAFE_EXIT_FOUND`, nguồn cháy → `SOURCE_IN_HAZARD`, không cháy → `NORMAL`, đang báo cháy → đổi sang lối thoát.
- `npm run build`: pass. `oxlint` trên các file đã sửa: 0 cảnh báo (3 cảnh báo cũ của repo ở `BuildingOverviewScene.tsx`, `CanvasBoard.tsx` — ngoài phạm vi). `git diff --check`: sạch.

## 6. Giới hạn / việc chưa làm

1. Chưa chạy click-through trên trình duyệt với backend thật; luồng QR/API-fallback mới được kiểm bằng typecheck + build, phần thuật toán bằng test tự động. Store/page chưa có test (cần runner có DOM; thêm vitest là thêm dependency nên chưa làm theo AGENTS.md).
2. Mock QR chỉ chạy khi store đã tải xong tòa nhà (BE tắt hoàn toàn thì cả map cũng không tải được); nên dùng kèm MSW cho `/public/*` nếu muốn demo hoàn toàn offline.
3. Deep-link `?toStoreId=` tắt eslint `exhaustive-deps` một dòng có chủ đích (effect chạy 1 lần nhờ `autoRoutedRef`).
4. Chưa có `requestId`/chống stale-response cho API route (tuyến API gọi tuần tự theo hành động người dùng); sẽ cần khi BE hỗ trợ Interactive Fire qua API.
5. Checklist `CODEX_TASK_PLAN.md` giữ nguyên `[ ]` cho Codex tự tick; chưa commit.
