import { memo } from 'react'
import { Layer, Line } from 'react-konva'
import type { MapSize } from '../../types/geometry'
import type { DraftEdge, DraftNode, GraphEdge, GraphNode } from '../../types/graph'
import { percentToPixel } from '../../utils/canvasCoordinates'

type GraphEdgesLayerProps = {
  edges: readonly GraphEdge[]
  nodeById: ReadonlyMap<string, GraphNode>
  draftEdges?: readonly DraftEdge[]
  draftNodeById?: ReadonlyMap<string, DraftNode>
  /** Edge gợi ý tự động (chưa lưu): vẽ nét đứt xanh lá giữa các node thật. */
  suggestions?: readonly { id: string; fromNodeId: string; toNodeId: string }[]
  size: MapSize
}

/** Edge không tương tác nên toàn bộ `listening={false}`: Konva bỏ qua khi hit-test. */
export const GraphEdgesLayer = memo(function GraphEdgesLayer({
  edges,
  nodeById,
  draftEdges = [],
  draftNodeById,
  suggestions = [],
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
            stroke={edge.status === 'BLOCKED' ? '#ef4444' : '#22d3ee'}
            strokeWidth={5}
            lineCap="round"
          />
        )
      })}
      {draftEdges.map((edge) => {
        const from = draftNodeById?.get(edge.fromNodeId)
        const to = draftNodeById?.get(edge.toNodeId)
        if (!from || !to) return null
        return <Line key={edge.id} points={segment(from, to)} stroke="#f59e0b" dash={[8, 6]} strokeWidth={3} />
      })}
      {suggestions.map((edge) => {
        const from = nodeById.get(edge.fromNodeId)
        const to = nodeById.get(edge.toNodeId)
        if (!from || !to) return null
        return <Line key={edge.id} points={segment(from, to)} stroke="#16a34a" dash={[10, 6]} strokeWidth={4} lineCap="round" />
      })}
    </Layer>
  )
})
