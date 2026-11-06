import type { PercentPoint } from '../types/geometry.ts'

/** Ảnh sơ đồ đã nhị phân hoá: 1 = điểm tối (nét tường/cột), 0 = nền sáng hoặc trong suốt. */
export type WallMask = { width: number; height: number; dark: Uint8Array }

/**
 * Dựng mặt nạ tường từ dữ liệu RGBA của ảnh sơ đồ. Sơ đồ kiến trúc thường là nét đen trên nền trắng
 * nên chỉ cần ngưỡng độ sáng; điểm trong suốt coi như nền.
 */
export function buildWallMask(rgba: ArrayLike<number>, width: number, height: number, threshold = 110): WallMask {
  const dark = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i += 1) {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    const alpha = rgba[i * 4 + 3]
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    dark[i] = alpha > 128 && luminance < threshold ? 1 : 0
  }
  return { width, height, dark }
}

type CrossOptions = {
  /** Số điểm tối liên tiếp tối thiểu (tính theo pixel mặt nạ) mới coi là tường; nét mảnh (nhãn, vạch thang) bị bỏ qua. */
  minRun?: number
  /** Bỏ qua quanh hai đầu đoạn thẳng (pixel mặt nạ): node có thể nằm sát tường hoặc cột. */
  endMargin?: number
}

/**
 * Đoạn thẳng a→b có cắt tường không: đi dọc đoạn theo từng pixel và tìm một dải tối đủ dày.
 * Heuristic theo ảnh, không phải hình học thật — dùng để cảnh báo, không để chặn tuyệt đối.
 */
export function segmentCrossesWall(mask: WallMask, a: PercentPoint, b: PercentPoint, options: CrossOptions = {}) {
  const maxDimension = Math.max(mask.width, mask.height)
  const minRun = options.minRun ?? Math.max(3, Math.round(maxDimension / 300))
  const endMargin = options.endMargin ?? Math.max(4, Math.round(maxDimension / 200))
  const ax = (a.x / 100) * (mask.width - 1)
  const ay = (a.y / 100) * (mask.height - 1)
  const bx = (b.x / 100) * (mask.width - 1)
  const by = (b.y / 100) * (mask.height - 1)
  const length = Math.hypot(bx - ax, by - ay)
  const steps = Math.ceil(length)

  let run = 0
  for (let i = 0; i <= steps; i += 1) {
    const traveled = i
    if (traveled < endMargin || length - traveled < endMargin) {
      run = 0
      continue
    }
    const t = steps === 0 ? 0 : i / steps
    const x = Math.round(ax + (bx - ax) * t)
    const y = Math.round(ay + (by - ay) * t)
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) continue
    if (mask.dark[y * mask.width + x]) {
      run += 1
      if (run >= minRun) return true
    } else {
      run = 0
    }
  }
  return false
}

/** Id các edge có đoạn thẳng cắt tường. */
export function findWallCrossingEdgeIds(
  mask: WallMask,
  nodes: readonly (PercentPoint & { id: string })[],
  edges: readonly { id: string; fromNodeId: string; toNodeId: string }[],
) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const result = new Set<string>()
  for (const edge of edges) {
    const from = byId.get(edge.fromNodeId)
    const to = byId.get(edge.toNodeId)
    if (from && to && segmentCrossesWall(mask, from, to)) result.add(edge.id)
  }
  return result
}
