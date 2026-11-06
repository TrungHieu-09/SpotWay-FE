# Endpoint FE cần nhưng BE (SpotWay-BE, graph v2) chưa có

Phía Owner đã được rút gọn theo BE hiện có (toà nhà, tầng, gán manager theo toà nhà).
Các tính năng dưới đây đã gỡ khỏi menu Owner; chỉ làm lại khi BE bổ sung endpoint tương ứng.

| Tính năng đã gỡ | FE từng gọi | Ghi chú cho BE |
| --- | --- | --- |
| Dashboard: gói dịch vụ, hạn mức, mức sử dụng | `GET /tenant/overview` | Cần tenant (name, subdomain, servicePackage, hạn), hạn mức theo gói, usage (buildings, floors, publishedFloors, managers, stores, activePromotions). Hiện dashboard tự tính từ `/buildings` + `/buildings/:id/floors`. |
| Danh sách / tạo / sửa / xoá nhân sự | `GET/POST/PATCH/DELETE /tenant/users` | BE chỉ có thao tác theo toà nhà (`POST /buildings/:id/managers`, `/managers/by-email`, `/managers/:userId`, `DELETE`). Thiếu API **liệt kê manager** của toà nhà/tenant. |
| Chủ gian hàng | `/store-owners` | Chưa có quản lý store owner. |
| Khu vực | `/tenant/areas`, `/buildings/:id/areas` | BE phân quyền manager theo toà nhà, không có khái niệm khu vực. |
| Gói dịch vụ, hoá đơn, gia hạn | `/tenant/plans`, `/tenant/invoices`, `/tenant/subscription/renew` | Chưa có. `Tenant.servicePackage` mới chỉ là enum FREE/PRO/ENTERPRISE. |
| Admin overview/plans/accounts | `/admin/*` | BE chỉ có `/tenants` (tạo, liệt kê, sửa, xoá). |
| Thông tin tenant ở header | `GET /auth/me` → `tenant` | Hiện trả `tenant: null`, `name` lấy từ email. |
