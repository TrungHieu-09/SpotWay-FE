# Trạng thái endpoint FE ↔ BE (SpotWay-BE)

## Đã bổ sung ở BE (commit `feat(workspace)`; cần `prisma migrate deploy` + khởi động lại BE)
- `GET /tenant/overview`, `GET /tenant/plans`, `GET /tenant/invoices`, `POST /tenant/subscription/renew`
- `GET/POST /tenant/users`, `PATCH/DELETE /tenant/users/:id` (manager, store owner; giới hạn theo gói; mật khẩu tạm một lần)
- `GET /tenant/areas`, `GET/POST /buildings/:id/areas`, `PATCH/DELETE /areas/:id`

## Còn thiếu
| FE gọi | Ghi chú |
| --- | --- |
| `/admin/overview`, `/admin/plans`, `/admin/tenants`, `/admin/users`… | BE chỉ có `/tenants` (admin). Trang Admin chưa dùng được. |
| `/store-owners` | Quản lý chủ gian hàng theo toà nhà/tầng. |
| `GET /floors/:id/stores`, `POST /stores`, `PUT /stores/:id` | BE chỉ có GET/PATCH/DELETE `/stores/:id`. |
| `GET /auth/me` → `tenant` | Hiện trả `tenant: null`, `name` lấy từ email. |
| Gán tầng vào khu vực (`floor.areaId`) | Khu vực hiện chỉ để gán manager; chưa ảnh hưởng quyền sửa tầng. |
