import type { MapSize, PercentPoint } from '../types/geometry.ts'

/**
 * Khoảng cách giữa 2 điểm % theo đơn vị của `size` (pixel ảnh hoặc Stage).
 * Phải nhân theo kích thước vì 1% chiều ngang ≠ 1% chiều dọc khi ảnh không vuông.
 */
export function distanceInMapUnits(a: PercentPoint, b: PercentPoint, size: MapSize) {
  return Math.hypot(((a.x - b.x) / 100) * size.width, ((a.y - b.y) / 100) * size.height)
}

/** Id các node không nằm trong edge nào: tìm đường không thể đi tới/đi qua chúng. */
export function findIsolatedNodeIds(
  nodes: readonly { id: string }[],
  edges: readonly { fromNodeId: string; toNodeId: string }[],
): Set<string> {
  const connected = new Set<string>()
  for (const edge of edges) {
    connected.add(edge.fromNodeId)
    connected.add(edge.toNodeId)
  }
  return new Set(nodes.filter((node) => !connected.has(node.id)).map((node) => node.id))
}

/**
 * Node gần `point` nhất; `maxDistance` (đơn vị của `size`) giới hạn bán kính snap.
 * Hoà khoảng cách → node đứng trước trong mảng. Không có ứng viên → null.
 */
export function findNearestNode<T extends PercentPoint & { id: string }>(
  point: PercentPoint,
  nodes: readonly T[],
  size: MapSize,
  maxDistance = Infinity,
): T | null {
  let best: T | null = null
  let bestDistance = maxDistance
  for (const node of nodes) {
    const distance = distanceInMapUnits(point, node, size)
    if (distance < bestDistance || (best === null && distance <= bestDistance)) {
      best = node
      bestDistance = distance
    }
  }
  return best
}
