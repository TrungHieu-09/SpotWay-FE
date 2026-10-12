# Canvas Coordinate Rule

Mọi object trên bản đồ 2D/3D dùng `x`/`y` dạng phần trăm 0-100 theo kích thước ảnh sơ đồ nền, không lưu pixel tuyệt đối.

- Click/drag trên Konva: đổi pixel sang phần trăm bằng `pixelToPercent`.
- Render từ API/store: đổi phần trăm sang pixel bằng `percentToPixel`.
- `Room.polygon`, `RouteSegment.points`, POI, Node và Edge endpoint cùng dùng quy ước này.
- Dữ liệu chiều cao/3D như `wallHeight` lưu bằng field riêng, không đổi nghĩa `x`/`y`.
