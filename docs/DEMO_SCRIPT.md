# Demo Script - Indoor Spatial Management System

Kịch bản khoảng 5 phút cho bản demo frontend.

## 1. Chủ tòa nhà tạo và xem tòa nhà

- Vào `/`, chọn thẻ **Chủ tòa nhà**.
- Bấm **Tạo tòa nhà mới**, nhập tên, địa chỉ, chọn ảnh sơ đồ nếu có, rồi lưu.
- Mở **Xem chi tiết** ở một tòa nhà.
- Kết quả mong đợi: bảng tòa nhà cập nhật, trang chi tiết hiển thị thông tin và danh sách tầng.

## 2. Quản lý tòa nhà chỉnh tầng và POI

- Trên thanh điều hướng, chọn **Quản lý tòa nhà**.
- Chọn tòa nhà, chọn tầng trong sidebar.
- Bấm dấu `+` để thêm tầng, thử bật/tắt trạng thái xuất bản.
- Trong tab **Bản đồ 2D**, click lên canvas để thêm POI, kéo POI để đổi vị trí, xoá POI ở panel bên phải.
- Kết quả mong đợi: POI hiển thị đúng vị trí phần trăm và giữ lại sau khi tải lại trang.

## 3. Nhận diện sơ đồ

- Mở tab **Nhận diện sơ đồ**.
- Bấm **Chạy nhận diện (mô phỏng)**, chờ bản nháp polygon xuất hiện.
- Kéo đỉnh, nhấp đúp cạnh để thêm đỉnh, sửa tên/loại phòng ở panel phải.
- Bấm **Xác nhận và lưu**.
- Kết quả mong đợi: huy hiệu chuyển sang **Đã xác nhận** và dữ liệu phòng được dùng chung cho bản xem 3D.

## 4. Xem 3D

- Mở tab **Xem 3D**.
- Xoay, zoom, pan bản đồ 3D; bật chế độ xếp chồng tầng nếu cần.
- Kết quả mong đợi: sàn, phòng, tường, POI/node và geometry vừa lưu được phản ánh trên cảnh 3D.

## 5. Chủ gian hàng cập nhật hồ sơ

- Chọn **Chủ gian hàng**.
- Chọn một tòa nhà có gian hàng, bấm **Chỉnh sửa**.
- Sửa tên/mô tả, upload logo và 2-3 ảnh thực tế, bấm **Lưu thay đổi**.
- Kết quả mong đợi: danh sách gian hàng cập nhật, ảnh preview đúng và dữ liệu vẫn còn sau F5.

## 6. Khách tham quan tìm đường 2D và 3D

- Chọn **Khách tham quan**.
- Chọn điểm bắt đầu, điểm đến, bấm **Tìm đường**.
- Xem lộ trình ở chế độ **2D**, sau đó chuyển sang **3D**.
- Click từng bước trong panel chỉ dẫn.
- Kết quả mong đợi: tầng đang chọn, điểm bắt đầu/điểm đến và lộ trình được giữ khi chuyển 2D/3D; camera 3D focus theo bước.

## Nếu lỗi thì làm gì

- Bấm **Đặt lại dữ liệu demo** ở chân trang, xác nhận, rồi chờ trang tải lại.
- Nếu trình duyệt vẫn giữ dữ liệu cũ, mở DevTools và chạy `window.__resetMock()`, sau đó F5.
- Nếu bản đồ 3D không hiện, kiểm tra WebGL của trình duyệt và thử tải lại trang.
