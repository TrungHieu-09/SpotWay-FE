# Mock API Contract

Các endpoint mock chính hiện có:

## Auth, tenant and admin

- `POST /api/auth/login` -> `{ token, user }`
- `GET /api/auth/me` -> authenticated user and tenant
- `POST /api/auth/logout`
- `GET /api/admin/overview`
- `GET/POST/PATCH /api/admin/tenants`
- `GET/POST/PATCH /api/admin/plans`
- `GET/PATCH/DELETE /api/admin/users`
- `GET /api/tenant/overview`
- `GET /api/tenant/users`
- `POST/PATCH/DELETE /api/tenant/users`
- `GET /api/tenant/plans`
- `POST /api/tenant/subscription/renew`
- `GET /api/tenant/invoices`

Protected handlers return `{ code: string, message: string }` for authorization and business errors. All tenant reads/writes are scoped by the authenticated user's `tenantId`.

- `GET /api/buildings` -> `Building[]`
- `POST /api/buildings` -> `Building`
- `PATCH /api/buildings/:id` -> `Building`
- `DELETE /api/buildings/:id`
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

Building uses `tenantId`. Store uses `ownerUserId`, which identifies the authenticated Store Owner and can be `null` before assignment. The mock seed password is `Demo@123` only and must never be returned to the frontend.

Các type canonical nằm trong `src/types/`: `building.ts`, `floor.ts`, `poi.ts`, `node.ts`, `store.ts`, `geometry.ts`, `route.ts`.
