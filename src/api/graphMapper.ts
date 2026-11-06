import { clampPercent } from '../utils/canvasCoordinates'

/**
 * Điểm DUY NHẤT đổi toạ độ pixel ảnh sơ đồ (BE lưu) <-> phần trăm 0-100 (FE dùng).
 */
export type MapSize = { mapWidth: number; mapHeight: number }

export function pixelToPercentPoint(x: number, y: number, size: MapSize) {
  return {
    x: clampPercent((x / size.mapWidth) * 100),
    y: clampPercent((y / size.mapHeight) * 100),
  }
}

export function percentToPixelPoint(x: number, y: number, size: MapSize) {
  return { x: (x / 100) * size.mapWidth, y: (y / 100) * size.mapHeight }
}
