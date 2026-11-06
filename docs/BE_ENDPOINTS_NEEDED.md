# Trạng thái endpoint FE <-> BE (SpotWay-BE)

Các trang Owner (Dashboard, Nhân sự, Gói dịch vụ, Khu vực) vẫn được giữ trong FE và sẽ báo lỗi
("Cannot GET ...") cho tới khi BE bổ sung các endpoint dưới đây. Xử lý sau.

| Tính năng | FE gọi | Ghi chú |
| --- | --- | --- |
| Dashboard, gói, hoá đơn, gia hạn | `/tenant/overview`, `/tenant/plans`, `/tenant/invoices`, `/tenant/subscription/renew` | Đồng đội đã có `plan_orders` ở DB, cần thống nhất thiết kế. |
| Nhân sự, chủ gian hàng | `/tenant/users`, `/store-owners` | BE chỉ có gán manager theo toà nhà. |
| Khu vực | `/tenant/areas`, `/buildings/:id/areas` | BE phân quyền theo toà nhà. |
| Admin | `/admin/*` | BE chỉ có `/tenants`. |
| Gian hàng | `GET /floors/:id/stores`, `POST /stores`, `PUT /stores/:id` | BE chỉ có GET/PATCH/DELETE `/stores/:id`. |
| Tenant trong `/auth/me` | — | Hiện `tenant: null`. |

Bản thử API workspace nằm ở nhánh BE cục bộ `wip/workspace-api` (chưa merge, chưa áp migration).
