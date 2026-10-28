/** Toạ độ chuẩn hoá của domain: 0-100, theo chiều rộng/cao ảnh sơ đồ. Không bao giờ là pixel. */
export type PercentPoint = {
  x: number
  y: number
}

/** Kích thước tham chiếu để đổi qua lại với pixel (ảnh sơ đồ hoặc Konva Stage). */
export type MapSize = {
  width: number
  height: number
}
