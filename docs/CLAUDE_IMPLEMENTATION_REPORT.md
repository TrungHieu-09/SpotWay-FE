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
