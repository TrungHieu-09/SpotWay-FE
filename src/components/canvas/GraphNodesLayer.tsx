import { Fragment, memo } from 'react'
import { Circle, Layer } from 'react-konva'
import type { MapSize, PercentPoint } from '../../types/geometry'
import type { GraphNode, NodeType } from '../../types/graph'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'

type GraphNodesLayerProps = {
  nodes: readonly GraphNode[]
  selectedNodeId: string | null
  edgeStartNodeId?: string
  /** Node chưa nối edge nào: vẽ vòng đỏ để người vẽ thấy ngay chỗ còn thiếu. */
  isolatedNodeIds?: ReadonlySet<string>
  size: MapSize
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  /** Có truyền thì node kéo thả được; vị trí mới tính theo % (chưa lưu pixel). */
  onNodeMove?: (nodeId: string, to: PercentPoint) => void
  /** Gọi liên tục khi đang kéo để edge/POI nối với node bám theo. */
  onNodeDragMove?: (nodeId: string, to: PercentPoint) => void
}

function nodeFill(type: NodeType) {
  if (type === 'ELEVATOR') return '#a855f7'
  if (type === 'DOOR') return '#f59e0b'
  if (type === 'EXIT' || type === 'EMERGENCY_EXIT') return '#10b981'
  return '#0ea5e9'
}

function setCursor(stageContainer: HTMLDivElement | undefined, cursor: string) {
  if (stageContainer) stageContainer.style.cursor = cursor
}

export const GraphNodesLayer = memo(function GraphNodesLayer({
  nodes,
  selectedNodeId,
  edgeStartNodeId,
  isolatedNodeIds,
  size,
  onNodeClick,
  onNodeDelete,
  onNodeMove,
  onNodeDragMove,
}: GraphNodesLayerProps) {
  return (
    <Layer>
      {nodes.map((node) => {
        const { pixelX: x, pixelY: y } = percentToPixel(node.x, node.y, size.width, size.height)
        const isSelected = selectedNodeId === node.id
        const isHighlighted = isSelected || edgeStartNodeId === node.id

        return (
          <Fragment key={node.id}>
            {isSelected && (
              <Circle x={x} y={y} radius={19} stroke="#0284c7" strokeWidth={3} dash={[4, 3]} listening={false} />
            )}
            {isolatedNodeIds?.has(node.id) && (
              <Circle x={x} y={y} radius={18} stroke="#ef4444" strokeWidth={3} dash={[3, 3]} listening={false} />
            )}
            <Circle
              x={x}
              y={y}
              radius={isHighlighted ? 15 : 11}
              fill={nodeFill(node.type)}
              stroke="#ffffff"
              strokeWidth={isHighlighted ? 4 : 3}
              draggable={Boolean(onNodeMove)}
              onDragMove={(event) =>
                onNodeDragMove?.(node.id, pixelToPercent(event.target.x(), event.target.y(), size.width, size.height))
              }
              onDragEnd={(event) =>
                onNodeMove?.(node.id, pixelToPercent(event.target.x(), event.target.y(), size.width, size.height))
              }
              onClick={(event) => {
                event.cancelBubble = true
                onNodeClick(node.id)
              }}
              onMouseEnter={(event) => setCursor(event.target.getStage()?.container(), 'pointer')}
              onMouseLeave={(event) => setCursor(event.target.getStage()?.container(), 'default')}
              onContextMenu={(event) => {
                event.evt.preventDefault()
                event.cancelBubble = true
                onNodeDelete(node.id)
              }}
            />
          </Fragment>
        )
      })}
    </Layer>
  )
})
