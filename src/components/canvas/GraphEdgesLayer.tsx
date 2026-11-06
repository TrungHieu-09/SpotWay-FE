import { memo } from 'react'
import { Layer, Line } from 'react-konva'
import type { MapSize } from '../../types/geometry'
import type { GraphEdge, GraphNode } from '../../types/graph'
import { percentToPixel } from '../../utils/canvasCoordinates'

type GraphEdgesLayerProps = {
  edges: readonly GraphEdge[]
  nodeById: ReadonlyMap<string, GraphNode>
  /** Edge nghi xuyên tường: vẽ đỏ nét đứt để người vẽ thấy ngay. */
  flaggedEdgeIds?: ReadonlySet<string>
  /** Edge đang bị chặn bảo trì: xám nét chấm, tách biệt với màu đỏ của edge nghi xuyên tường. */
  size: MapSize
}

/** Edge không tương tác nên toàn bộ `listening={false}`: Konva bỏ qua khi hit-test. */
export const GraphEdgesLayer = memo(function GraphEdgesLayer({
  edges,
  nodeById,
  flaggedEdgeIds,
  size,
}: GraphEdgesLayerProps) {
  const segment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const a = percentToPixel(from.x, from.y, size.width, size.height)
    const b = percentToPixel(to.x, to.y, size.width, size.height)
    return [a.pixelX, a.pixelY, b.pixelX, b.pixelY]
  }

  return (
    <Layer listening={false}>
      {edges.map((edge) => {
        const from = nodeById.get(edge.fromNodeId)
        const to = nodeById.get(edge.toNodeId)
        if (!from || !to) return null
        return (
          <Line
            key={edge.id}
            points={segment(from, to)}
            stroke={flaggedEdgeIds?.has(edge.id) ? '#dc2626' : edge.status === 'BLOCKED' ? '#64748b' : '#22d3ee'}
            dash={flaggedEdgeIds?.has(edge.id) ? [10, 6] : edge.status === 'BLOCKED' ? [2, 8] : undefined}
            strokeWidth={5}
            lineCap="round"
          />
        )
      })}
    </Layer>
  )
})
