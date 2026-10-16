# Mock API Contract

Các endpoint mock chính hiện có:

## Auth, tenant and admin

- `POST /api/auth/login` -> `{ token, user }`
- `GET /api/auth/me` -> authenticated user and tenant
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/admin/overview`
- `GET/POST/PATCH /api/admin/tenants`
- `GET/POST/PATCH /api/admin/plans`
- `GET/PATCH/DELETE /api/admin/users`
- `POST /api/admin/users/:id/reset-password`
- `POST /api/admin/tenants/:id/buildings`
- `PATCH/DELETE /api/admin/buildings/:id`
- `GET /api/tenant/overview`
- `GET /api/tenant/users`
- `GET /api/tenant/areas`
- `POST/PATCH/DELETE /api/tenant/users`
- `GET /api/tenant/plans`
- `POST /api/tenant/subscription/renew`
- `GET /api/tenant/invoices`

Protected handlers return `{ code: string, message: string }` for authorization and business errors. All tenant reads/writes are scoped by the authenticated user's `tenantId`.

- `GET /api/buildings` -> `Building[]`
- `POST /api/buildings` -> `Building`
- `PATCH /api/buildings/:id` -> `Building`
- `DELETE /api/buildings/:id`
- `GET/POST /api/buildings/:buildingId/areas`
- `PATCH/DELETE /api/areas/:id`
- `GET /api/buildings/:buildingId/floors` -> `Floor[]`
- `POST /api/floors` -> `Floor`
- `PATCH /api/floors/:id` -> `Floor`
- `DELETE /api/floors/:id`
- `PATCH /api/floors/:id/pois` -> `Poi[]`
- `GET /api/floors/:floorId/geometry` -> `FloorGeometry`
- `GET /api/floors/:floorId/nodes` -> `Node[]`
- `GET /api/floors/:floorId/edges` -> `Edge[]`
- `PATCH /api/nodes/:id` -> `Node`
- `GET /api/buildings/:buildingId/destinations` -> `Destination[]`
- `GET /api/routes?buildingId=&fromNodeId=&toNodeId=` -> `RouteResult`
- `GET /api/floors/:floorId/stores` -> `Store[]`
- `GET /api/owners/:ownerId/stores` -> `Store[]`
- `GET /api/stores/:id` -> `Store`
- `POST /api/stores` -> `Store`
- `PATCH /api/stores/:id` -> `Store`

Toạ độ POI, Node, Room polygon và Route segment luôn là `x`/`y` phần trăm 0-100, không phải pixel.

Building uses `tenantId`. Floor uses `areaId: string | null`. User managers use `areaIds: string[]`; `createdByUserId` and `mustChangePassword` are part of the user contract. Store uses `ownerUserId`, which identifies the authenticated Store Owner and can be `null` before assignment. Plans expose `maxBuildings`, `maxManagers`, `maxStoreOwners`, `priceVnd`, and `durationMonths`. The mock seed password is `Demo@123` only and must never be returned to the frontend.

Các type canonical nằm trong `src/types/`: `building.ts`, `floor.ts`, `poi.ts`, `node.ts`, `store.ts`, `geometry.ts`, `route.ts`.

## Contract mở rộng cho demo quản trị

- Store: `GET /api/buildings/:buildingId/stores`, `GET /api/stores/mine`, `DELETE /api/stores/:id`. Store có `createdByUserId`, `ownerUserId`, vị trí tùy chọn `roomId`/`nodeId` và `openingHours`.
- Tài khoản Store Owner: `GET/POST /api/store-owners`, `PATCH /api/store-owners/:userId`, `POST /api/store-owners/:userId/reset-password`, `DELETE /api/store-owners/:userId`.
- Admin: `POST /api/admin/tenants/:tenantId/owners` để thêm chủ tòa nhà vào doanh nghiệp đã tồn tại; `POST /api/admin/tenants/:tenantId/buildings` để thêm tòa nhà.
- Khuyến mãi: `GET/POST /api/stores/:storeId/promotions`, `PATCH/DELETE /api/promotions/:promotionId`.
- Graph: `PATCH/DELETE /api/edges/:id`, `DELETE /api/nodes/:id`. Edge có `kind: walk | stairs | ramp`; edge `stairs` mặc định không accessible.
- Bảo trì: `GET/POST /api/floors/:floorId/maintenance-zones`, `PATCH/DELETE /api/maintenance-zones/:id`. Vùng dùng hình chữ nhật phần trăm `{ x, y, w, h }`.
- QR: `GET/POST /api/buildings/:buildingId/qr-codes`, `DELETE /api/qr-codes/:id`, `GET /api/qr/:code`.
- Xuất bản floor yêu cầu ảnh sơ đồ, tối thiểu 2 node và 1 edge; thiếu điều kiện trả `{ code: 'PUBLISH_REQUIREMENTS', message }` với HTTP 400.
- Route có thể nhận `accessible=true`; vùng bảo trì active được dùng để loại các node/edge và tạo cảnh báo tuyến.
