export type XY = { x: number; y: number }
export type Segment = { x1: number; y1: number; x2: number; y2: number }

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

function orientation(a: XY, b: XY, c: XY) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** Hai đoạn thẳng cắt nhau thực sự (không tính chạm đầu mút). */
export function segmentsCross(a: XY, b: XY, c: XY, d: XY) {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

/** Id các edge có đoạn thẳng cắt một vách tường. Mọi toạ độ phải cùng hệ (cùng % hoặc cùng pixel). */
export function findEdgesCrossingWalls(
  edges: readonly { id: string; fromNodeId: string; toNodeId: string }[],
  nodes: readonly (XY & { id: string })[],
  walls: readonly Segment[],
): Set<string> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const crossing = new Set<string>()
  for (const edge of edges) {
    const from = byId.get(edge.fromNodeId)
    const to = byId.get(edge.toNodeId)
    if (!from || !to) continue
    if (walls.some((wall) => segmentsCross(from, to, { x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 }))) {
      crossing.add(edge.id)
    }
  }
  return crossing
}

/** Tỉ lệ mét/pixel từ khoảng cách pixel giữa hai điểm và khoảng cách thật; null nếu không hợp lệ. */
export function estimateMetersPerPixel(a: XY, b: XY, realDistanceMeters: number) {
  const pixels = Math.hypot(a.x - b.x, a.y - b.y)
  return pixels > 1e-6 && realDistanceMeters > 0 ? realDistanceMeters / pixels : null
}
