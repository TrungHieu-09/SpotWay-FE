# SpotWay Main Flow - End-to-End Gap Analysis

**Vai trò:** System Analyst & Lead Architect  
**Phạm vi rà soát:** `SpotWay-BE` tại 2026-10-23, gồm NestJS backend, Prisma schema, automated tests, tài liệu và hai submodule floorplan/3D.  
**Mục tiêu demo:** từ thiết lập tòa nhà đến khách quét QR, tìm điểm đến, điều hướng, kích hoạt sơ tán và quan sát analytics.

## 1. Kết luận điều hành

Backend đã có nền tảng tốt cho Flow 1-4: multi-tenant/RBAC, Building/Floor/Graph/QR, public map-search-route, Dijkstra và outbox analytics. Luồng bình thường **có thể demo ở mức API** nếu seed dữ liệu đã publish và topology cùng tầng hoặc qua elevator.

Tuy nhiên, demo end-to-end "quét QR đến thoát hiểm" chưa thể coi là hoàn chỉnh:

1. Workspace không chứa ứng dụng frontend chính. Không có `NavigationPage`, QR scanner UI, canvas editor UI, dashboard analytics UI hay integration test FE-BE để xác nhận phần FE.
2. Evacuation mới là route API nhận `hazardNodeIds` từ client. Chưa có Fire Incident/Alarm domain, cập nhật nguy cơ thời gian thực, push reroute, hay vertical stair link. Vì evacuation cấm elevator, không thể sơ tán xuyên tầng trong data model hiện tại.
3. Publish còn quá nhẹ: chỉ chặn elevator node chưa link. Chưa buộc có ảnh map, revision đã duyệt, graph hợp lệ/kết nối, QR, cửa thoát hiểm, hoặc dữ liệu an toàn trước khi public.
4. Routing thiếu contract và mô hình cần thiết cho demo đáng tin cậy: stair/escalator, calibration theo floor, turn-by-turn thực, metadata chuyển mode khi đích gặp nguy hiểm và risk-aware route.

Vì vậy, ưu tiên phải là hoàn thành một vertical slice P0 có topology nhiều tầng + stair, incident an toàn, public route contract rõ ràng và seed/scenario chạy được. Sau đó mới hoàn thiện viewer/UI và analytics vận hành.

## 2. Phương pháp và giới hạn bằng chứng

- Đã đọc controller/service/schema cho Buildings, Floors, Graph, QR, Navigation, Stores và Analytics; cùng các test và tài liệu kế hoạch hiện có.
- Đã xác nhận submodule `services/floorplan-to-3d-api` và `services/cubicasa5k` tồn tại. Submodule 3D có viewer độc lập, nhưng không phải frontend SpotWay đã tích hợp với API chính.
- Không thấy source frontend chính trong repo. Vì vậy các mục FE dưới đây là **không hiện diện/không thể kiểm chứng trong workspace**, không đồng nghĩa chắc chắn chưa tồn tại ở repository khác.
- Lệnh `pnpm test` được khởi chạy hai lần nhưng chỉ in dòng khởi động Jest trong khoảng 30 giây, không có kết quả pass/fail trước khi phiên bị gián đoạn. Không dùng nó làm bằng chứng test xanh. Cần chạy lại với timeout/open-handle diagnostics trong P0.

## 3. Inventory đã hoàn thành

| Năng lực | Backend đã xác minh | FE đã xác minh |
| --- | --- | --- |
| Tenant, auth, RBAC | JWT/OAuth, role guard, tenant status/access guard; Owner, Manager, Store Owner, Guest | Không có source FE chính trong repo |
| Building/Floor | CRUD Building, phân quyền manager theo building; CRUD Floor, soft delete, `DRAFT/PUBLISHED` | Không có màn hình quản trị được kiểm chứng |
| Ảnh floor plan | Signed upload URL Supabase, lưu `mapImageUrl`, `mapWidth`, `mapHeight`; AI analysis gọi service riêng | Không có upload/editor workflow được kiểm chứng |
| Graph map | CRUD Node/Edge/POI, edge weight từ tọa độ, duplicate-edge và cross-floor validation, ElevatorLink | Không có canvas/map editor được kiểm chứng |
| Publish | Publish/unpublish floor, chặn elevator node thiếu vertical link | Không có publish/review UX được kiểm chứng |
| QR anchor | Tạo/list/xóa soft-delete QR anchor; public resolve opaque token, chỉ cho Building active/Floor published; enqueue `QR_SCANNED` | Không có QR generator/scanner/deep-link NavigationPage |
| Public navigation | Public floors/map/overview/search/routes; chỉ trả dữ liệu public/published; Dijkstra graph hai chiều, blocked edge, wheelchair edge filter, elevator route | Không có map render, search UI, route overlay hoặc TBT UI |
| Evacuation cơ bản | `mode=EVACUATION`, loại elevator, loại hazard node, chọn EXIT/EMERGENCY_EXIT hoặc POI EXIT reachable; test unit cho reroute cơ bản | Không có cảnh báo, chuyển UI sang emergency mode, realtime reroute |
| Analytics cơ bản | Outbox Postgres -> Mongo, event QR/map/search/route, tenant summary gồm count/top search/top destination | Không có dashboard/map analytics được kiểm chứng |

## 4. Rà soát theo 6 flow

### Flow 1 - Thiết lập Tòa nhà & Tầng

#### Done

- `POST /buildings` cho Admin/Building Owner tạo building theo tenant; CRUD và staff assignment đã có.
- `POST /buildings/:buildingId/floors` tạo floor; Floor có số tầng, tên, map URL/dimensions, status và elevation fallback từ `defaultFloorHeight`.
- `POST /buildings/:buildingId/floors/upload-url` sinh signed URL cho Supabase Storage.
- Soft-delete và tenant/building access được áp dụng tại các endpoint quản trị.

#### Gaps

- **FE:** không có màn Owner setup, upload progress/error state hay workflow gắn `publicUrl` upload thành `floor.mapImageUrl` trong repo.
- Chưa có unique constraint `(buildingId, floorNumber)` trong schema, nên có thể tạo hai tầng cùng số. Cũng chưa có quy tắc rõ ràng cho tầng hầm/zero/display order.
- Upload URL nhận `mimeType` nhưng không kiểm tra/allowlist MIME, kích thước, checksum hay xác nhận object đã upload. API không tự cập nhật Floor sau upload.
- Floor có thể được publish khi thiếu ảnh, dimension và graph, khiến public map/route demo trống hoặc lỗi ngữ cảnh.
- Không có onboarding/seed chuẩn hóa một building "demo-ready".

### Flow 2 - Sơ đồ, đồ thị, QR anchor và publish

#### Done

- `POST /floors/:id/analysis` và `navigation-analysis` gọi floorplan-intelligence service; revision có version và editor state JSON.
- Manager có thể apply navigation draft; graph CRUD bảo vệ tọa độ, floor/tenant consistency, duplicate edge và soft-delete dependencies.
- POI, Store node attachment và elevator link xuyên tầng đã có; QR anchor gắn vào node.
- Publish kiểm tra elevator node phải có `ElevatorLink`.

#### Gaps

- **FE:** không thấy canvas vẽ/chỉnh tường, node/edge/POI, confirm draft, undo/redo, QR placement/generation hay publish review UI.
- AI output là draft nhưng không có status workflow riêng (`pending/reviewed/rejected`), không có approval audit, optimistic concurrency hay cơ chế rollback/re-publish revision. `publishedAt` trong revision không được set khi publish.
- `applyNavigationDraft` chỉ create thêm node/edge, không idempotent và không replace/merge graph cũ có kiểm soát. Re-run có thể tạo topology trùng/khó quản trị.
- Không có validation graph so với walls/openings, connectivity từ QR đến POI/exit, hoặc validation node/edge coverage.
- Chưa có `VerticalLink` tổng quát. Chỉ elevator link; Stair/Escalator node không kết nối xuyên tầng.
- Publish không kiểm tra map image/dimensions, map revision đã duyệt, exits, safe stairs, node/edge tối thiểu, QR, Store node hay route reachability. Đây là rủi ro lớn cho public demo.
- Chưa có QR render/download (SVG/PNG), rotation/revoke policy, URL/deep-link contract hoặc hạn sử dụng. Token raw chỉ trả một lần lúc create, điều này đúng về bảo mật nhưng FE cần xử lý rõ.

### Flow 3 - Khách quét QR và định vị

#### Done

- `GET /public/qr/:token` xác thực QR token hash và kiểm tra tenant/building/floor published-active trước khi trả node/floor/building/x/y/label.
- Resolve QR tạo event `QR_SCANNED`; contract đã đủ để FE lấy `fromNodeId` gọi route API.

#### Gaps

- **FE P0:** chưa có QR scanner/deep-link handler để gọi resolve rồi mở `NavigationPage` với `buildingId`, `floorId`, `fromNodeId` và token context; không có state loading, token invalid, map unpublished hay camera permission UX.
- QR response không trả canonical navigation URL/version/map context; FE phải tự dựng route. Cần thống nhất link dạng `/navigate?qrToken=...` hoặc `/b/:buildingId/navigate?fromNodeId=...`.
- Chưa có session/anonymous journey id để nối scan -> search -> route -> arrival trong analytics, cũng chưa có privacy/retention contract cho guest.
- Không có offline fallback/cache public map sau scan; đây là P1 nếu demo yêu cầu mạng không ổn định.

### Flow 4 - Tìm kiếm và điều hướng trong nhà

#### Done

- Public API đã có `GET /public/buildings/:buildingId/floors`, `/floors/:floorId/map`, `/buildings/:buildingId/overview`, search Store/POI/Node và `POST /public/routes`.
- Search chỉ lấy Store `ACTIVE`, POI/node còn hiệu lực trên floor published.
- Dijkstra dùng edge weight, tránh `EdgeStatus.BLOCKED`, filter edge không accessible khi wheelchair mode, route đa tầng qua elevator.
- Route trả node path, coordinates, total distance, duration ước lượng và step có transition elevator. Building overview cung cấp data 2.5D (elevation + map image + vertical links).

#### Gaps

- **FE P0:** không có NavigationPage, floor selector, search-result-to-route flow, route polyline, instruction panel, error/retry state hay accessibility controls trong repo.
- **3D:** submodule có viewer riêng nhưng không có evidence rằng nó consume SpotWay auth/public endpoints, render path theo `nodeIds`, hay được nhúng vào NavigationPage.
- Route bình thường chỉ nhận Store hoặc exit node. Không route trực tiếp tới POI/node thông thường, không có endpoint "nearest store/POI/exit" theo graph cost.
- Multi-floor chỉ có elevator. Không có STAIR/ESCALATOR/RAMP, directionality, accessible/emergency flags hoặc transition duration. Wheelchair mode hiện chỉ lọc walk edge, chưa áp quy tắc vertical transition.
- Dijkstra dùng array `sort` mỗi vòng, không deterministic tie-break và có thể kém khi graph lớn. Chưa cần A* cho demo nhưng nên có min-heap/tie-break P1.
- Distance dùng global `MAP_UNITS_PER_METER`; không có floor calibration/north offset. Bearing hiện là góc canvas `atan2(dy,dx)`, chưa phải compass bearing và chưa có relative left/right/U-turn.
- `steps` phát gần như một item mỗi node, instruction chung chung; chưa aggregate segment, maneuver, meter distance hay arrival semantics cho turn-by-turn.
- Public map trả toàn bộ edges kể cả `BLOCKED`; contract FE chưa nói rõ cách hiển thị/ẩn edge maintenance. Route engine có filter, nhưng UI có thể vẽ nhầm đường không khả dụng.
- Chưa có API contract/versioned generated client cho FE, E2E public journey hay baseline performance/cache.

### Flow 5 - Khẩn cấp PCCC và Dynamic Reroute

#### Done

- Schema có `EXIT`, `EMERGENCY_EXIT`, `EdgeStatus.BLOCKED`.
- Route `EVACUATION` bỏ elevator link, loại node trong `hazardNodeIds`, chọn một exit reachable và trả lỗi khi không tìm được route.
- Unit tests hiện diện cho cấm elevator, chọn exit reachable, reroute cơ bản với hazard node và legacy POI EXIT.

#### Gaps nghiêm trọng

- Chưa có Fire Incident/Alarm domain, bảng incident/hazard zone, API activate/acknowledge/resolve, role PCCC/operator, audit trail hoặc integration tới đầu báo cháy/BMS. `hazardNodeIds` hoàn toàn do client gửi lên.
- Không có WebSocket/SSE/push event. Khách đang route không tự biết có alarm/hazard mới và không tự reroute.
- Không có STAIR vertical link. Vì evac cấm elevator, khách ở tầng khác không thể có route thoát hiểm xuyên tầng trong topology hiện tại.
- Hazard IDs chưa được validate là node cùng building với source. Cần reject `INVALID_HAZARD_NODES`, reject source in hazard và tránh silently ignoring unknown/cross-building IDs.
- Nếu destination thường nằm trong hazard, engine hiện loại target khỏi graph rồi trả `NO_ROUTE_FOUND`. Nó chưa chuyển sang EVACUATION, chưa hủy điểm đến, chưa báo warning hoặc chọn safe exit.
- Evacuation chọn shortest weighted distance, chưa safety-first. Không có buffer/risk quanh lửa, smoke-protected stair rule, exit capacity/status, safe-zone logic hay route risk explanation.
- Không có incident snapshot/version trong route response. Không thể xác định client đang render route dựa trên cảnh báo nào.
- Không có emergency FE mode: full-screen alert, a11y/audio/vibration-safe behavior, current route invalidation, safe-exit CTA, floor transfer guidance hoặc fallback "call emergency services".
- Chưa có integration test cho alarm lifecycle, multi-floor stair evacuation, delayed hazard event, all exits unavailable và race condition giữa reroute/publish.

### Flow 6 - Đo lường và vận hành

#### Done

- `QR_SCANNED`, `MAP_VIEWED`, `SEARCH_PERFORMED`, `ROUTE_REQUESTED`, `ROUTE_RESOLVED`, `ROUTE_NOT_FOUND` được enqueue Postgres outbox.
- Worker idempotently upsert event sang Mongo khi Mongo được cấu hình; endpoint owner/admin trả tổng events, top searches và top destinations theo tenant.

#### Gaps

- **FE:** không có analytics dashboard/map heatmap/operational incident view trong repo.
- Summary không có filter/thời gian/building/floor, scan-to-route funnel, no-route rate, route duration, evacuation KPI, incident impact hay exported report.
- Analytics không có anonymous journey/session id nên không đo được funnel QR scan -> search -> route resolve; cần đánh giá privacy/consent trước khi thêm.
- Worker polling in-process, không có health metric, dead-letter/retry ceiling/backoff/alerting. Mongo unavailable khiến event retry vô hạn nhưng không có vận hành quan sát rõ.
- Route events không lưu selected exit, warnings, incident version, reroute reason hay per-floor route breakdown để phân tích PCCC.

## 5. P0 - giao ngay cho Claude Pane 3

P0 là điều kiện tối thiểu để demo được một hành trình an toàn, lặp lại và có thể nghiệm thu qua API. Không thay đổi UI nếu repository FE không được cung cấp.

### P0.1 - Chuẩn hóa vertical links để sơ tán xuyên tầng

1. Thay `ElevatorLink` bằng mô hình tương thích ngược `VerticalLink` hoặc thêm model mới với `kind: ELEVATOR | STAIR | ESCALATOR`, hai endpoint node, `accessible`, `status`, `direction`, `emergencyAllowed`, `smokeProtected` và timing cần thiết.
2. Migration/backfill ElevatorLink hiện hữu thành `ELEVATOR`; giữ API cũ trong một giai đoạn deprecation hoặc mapping response tương thích.
3. Graph builder: NORMAL dùng link hợp lệ theo kind/direction/accessibility; wheelchair chỉ dùng vertical link accessible theo policy; EVACUATION cấm elevator, chỉ dùng stair khói-protected và link emergency-allowed.
4. Viết unit + e2e cho normal multi-floor elevator, wheelchair restriction, evacuation multi-floor stair và no-safe-exit.

**Acceptance:** scan ở tầng 2, alarm active, route tới emergency exit ở tầng 1 qua stair, không chứa elevator, trả transition đúng.

### P0.2 - Fire incident là source of truth server-side

1. Thêm schema `EmergencyIncident`/`Hazard` với building scope, status (`ACTIVE/RESOLVED`), version, affected node/edge IDs, severity, timestamps, creator/acknowledger và audit fields.
2. API Manager/Operator: activate, update hazard, acknowledge, resolve, list active; public endpoint tối thiểu để NavigationPage đọc incident version/current emergency state.
3. Route API lấy active incident server-side. Có thể giữ `hazardNodeIds` làm demo override có kiểm soát, nhưng không được tin như source of truth production.
4. Validate tất cả hazard nodes cùng building; source in hazard => `SOURCE_IN_HAZARD`; all exits unavailable => `NO_SAFE_EXIT_FOUND`.

**Acceptance:** kích hoạt incident tại API làm route request tiếp theo tự evacuation không cần FE gửi node IDs; resolve incident khôi phục normal routing.

### P0.3 - Hành vi route khẩn cấp và response contract

1. Khi normal target thuộc hazard, tự chuyển `effectiveMode=EVACUATION`, bỏ target, chọn safe exit; không trả route cũ.
2. Mở rộng response: `requestedMode`, `effectiveMode`, `routeReason`, `destinationCancelled`, requested/resolved destination, `warnings`, `incidentVersion`.
3. Chuẩn hóa lỗi: `INVALID_HAZARD_NODES`, `SOURCE_IN_HAZARD`, `NO_SAFE_EXIT_FOUND`; phân biệt với `NO_ROUTE_FOUND` normal.
4. Implement safety-first label comparison tối thiểu `(maxRisk, cumulativeRisk, distance, nodeId)` và test route ngắn nhưng sát hazard không thắng route an toàn hơn.

**Acceptance:** test chứng minh destination in hazard chuyển thành safe exit; exit gần nhưng hazardous bị loại; result có warning machine-readable.

### P0.4 - Publish readiness và demo seed/scenario

1. Mở rộng `assertFloorCanPublish` hoặc thêm building readiness validation: map image + dimensions, approved revision policy, valid graph, required exit/safe stair nếu building dùng multi-floor, và route reachability từ QR demo anchors.
2. Tạo deterministic `prisma/seed.ts` scenario: ít nhất hai floor published, QR anchor, Store ACTIVE, POI, elevator normal path, two exits, protected stair evacuation path và một hazard thay thế exit gần.
3. Thêm public scenario manifest/run endpoint chỉ cho development/demo **hoặc** tài liệu curl collection không mutation production. Gồm scan, map, search, normal route, activate fire, reroute, resolve fire, analytics event check.
4. E2E test public full journey với database test và kiểm tra các status/error contract.

**Acceptance:** một script/API collection chạy từ reset DB tới scan QR, normal route, alarm, safe reroute và analytics event mà không cần ID thủ công.

### P0.5 - Handoff FE contract tối thiểu

1. Sinh/commit OpenAPI snapshot hoặc typed client contract cho public QR, map, search, route và emergency endpoints.
2. Viết `docs/FRONTEND_NAVIGATION_HANDOFF.md`: canonical QR deep-link, request sequence, response state machine, error UX keys và incident reroute payload.
3. Nếu frontend repo được cung cấp: implement/verify QR resolve -> `NavigationPage` state initialization và emergency route refresh. Nếu chưa có, ghi rõ dependency external, không mô phỏng FE trong BE repo.

## 6. P1 - sau khi vertical slice P0 chạy

1. **Turn-by-turn đúng nghĩa:** per-floor `mapUnitsPerMeter`, `northOffsetDegrees`, compass bearing, delta bearing, segment aggregation, maneuver constants, distance/time breakdown cho vertical transition.
2. **Route engine hardening:** priority queue, deterministic tie-break, graph cache/invalidation theo map publish/incident, route trực tiếp tới POI/node có phân quyền public hợp lệ, endpoint nearest Store/POI/Exit tính theo graph cost.
3. **Realtime incident:** SSE/WebSocket channel per building, incident version/event, client protocol revalidate and reroute; rate limit/auth policy.
4. **Map/editor quality:** revision review state, approval audit, immutable published snapshot, optimistic concurrency, idempotent draft apply và rollback.
5. **QR lifecycle:** QR PNG/SVG/deep link generator, rotate/revoke, printable label and monitoring.
6. **Analytics dashboard API:** filters tenant/building/floor/time, QR-to-route funnel, route/no-route ratio, evacuation usage, incident impact; operational health for outbox/Mongo.
7. **Testing/CI:** fix or diagnose Jest completion/open handles; e2e for role/tenant isolation, floor publish, QR invalidation, public API and fire lifecycle.

## 7. P2 - mở rộng sản phẩm

1. 2.5D/3D viewer thực sự tích hợp route overlay, exploded floors, isolated floor, performance/mobile fallback.
2. Sensor fusion, dead reckoning, AR/camera overlay và offline public graph cache sau QR anchor.
3. BMS/fire-alarm integration, GIS smoke model, exit capacity/crowd-aware routing và PCCC compliance review theo quy chuẩn triển khai.
4. Search relevance, multilingual POI/content, accessibility UX audit, map editing collaboration and audit analytics.
5. Production observability: SLO, tracing, metrics/dashboard, DLQ, retention/deletion workflow và security review QR/public endpoints.

## 8. Thứ tự nghiệm thu khuyến nghị

1. Seed demo + public normal route: QR resolve -> map -> search Store -> route.
2. Add stair vertical link + publish validation, rồi xác nhận normal/wheelchair/multi-floor contracts.
3. Add incident lifecycle + server-side hazards, rồi run evacuation route qua stair.
4. Add destination-hazard auto-cancel, risk-aware exit selection và warnings.
5. Add end-to-end public e2e suite and FE contract handoff.
6. Sau khi P0 xanh, tích hợp frontend NavigationPage, realtime and operations dashboard ở P1.

## 9. Handoff ngắn cho Pane 3

Pane 3 nên bắt đầu bằng **P0.1 + P0.2 cùng migration design**, vì Fire Incident cần biết graph nào bị ảnh hưởng và evacuation cần một đường xuyên tầng không dùng elevator. Sau đó thực hiện P0.3, P0.4 và P0.5 theo thứ tự. Không tự đánh dấu checklist hoàn tất: mỗi hạng mục phải có migration, OpenAPI update, unit/e2e tests và evidence command pass.

