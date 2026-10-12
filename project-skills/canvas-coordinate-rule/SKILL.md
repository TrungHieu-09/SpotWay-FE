# Canvas Coordinate Rule

Mọi object trên bản đồ 2D/3D dùng `x`/`y` dạng phần trăm 0-100 theo kích thước ảnh sơ đồ nền, không lưu pixel tuyệt đối.

- Click/drag trên Konva: đổi pixel sang phần trăm bằng `pixelToPercent`.
- Render từ API/store: đổi phần trăm sang pixel bằng `percentToPixel`.
- `Room.polygon`, `RouteSegment.points`, POI, Node và Edge endpoint cùng dùng quy ước này.
- Dữ liệu chiều cao/3D như `wallHeight` lưu bằng field riêng, không đổi nghĩa `x`/`y`.
- Khi render 3D, chuyển sang toạ độ thế giới qua `src/utils/worldCoordinates.ts` tại runtime. Không persist world coordinate vào store/API/localStorage.
- Quy ước world hiện tại: đơn vị mét, gốc ở giữa sàn; ảnh `x` -> world `x`, ảnh `y` -> world `z`, world `y` là chiều cao.
