# Mock API Contract

Các endpoint mock chính hiện có:

- `GET /api/buildings` -> `Building[]`
- `POST /api/buildings` -> `Building`
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

Các type canonical nằm trong `src/types/`: `building.ts`, `floor.ts`, `poi.ts`, `node.ts`, `store.ts`, `geometry.ts`, `route.ts`.
