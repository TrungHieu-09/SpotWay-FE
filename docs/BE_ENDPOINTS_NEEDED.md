# Trạng thái endpoint FE <-> BE (SpotWay-BE)

Phía Owner hiện chỉ giữ các tính năng BE đã hỗ trợ (giống nhánh `refactor/node-poi-graph-v2`):
danh sách/chi tiết toà nhà, tầng, tải ảnh sơ đồ, tổng quan 2.5D, gán manager theo toà nhà.
Dashboard tính từ `/buildings` + `/buildings/:id/floors`.

## Chưa có ở BE (đã tạm gỡ khỏi FE, làm lại khi BE bổ sung)
| Tính năng | FE từng gọi |
| --- | --- |
| Gói dịch vụ, hạn mức, hoá đơn, gia hạn | `/tenant/overview`, `/tenant/plans`, `/tenant/invoices`, `/tenant/subscription/renew` (đồng đội đang có `plan_orders` ở DB, cần thống nhất thiết kế) |
| Danh sách / tạo nhân sự, chủ gian hàng | `/tenant/users`, `/store-owners` |
| Khu vực | `/tenant/areas`, `/buildings/:id/areas` |
| Admin | `/admin/*` (BE chỉ có `/tenants`) |
| Gian hàng | `GET /floors/:id/stores`, `POST /stores`, `PUT /stores/:id` |
| Tenant trong `/auth/me` | hiện `tenant: null` |

Bản thử API workspace (tổng quan, gói, nhân sự, khu vực) nằm ở nhánh BE cục bộ `wip/workspace-api`, chưa áp migration.
