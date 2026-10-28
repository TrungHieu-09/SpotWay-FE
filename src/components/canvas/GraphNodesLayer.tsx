import { Fragment, memo } from 'react'
import { Circle, Layer } from 'react-konva'
import type { MapSize, PercentPoint } from '../../types/geometry'
import type { DraftNode, GraphNode, NodeType } from '../../types/graph'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'

type GraphNodesLayerProps = {
  nodes: readonly GraphNode[]
  selectedNodeId: string | null
  edgeStartNodeId?: string
  draftNodes?: readonly DraftNode[]
  size: MapSize
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onDraftNodeMove: (nodeId: string, to: PercentPoint) => void
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
  draftNodes = [],
  size,
  onNodeClick,
  onNodeDelete,
  onDraftNodeMove,
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
            <Circle
              x={x}
              y={y}
              radius={isHighlighted ? 15 : 11}
              fill={nodeFill(node.type)}
              stroke="#ffffff"
              strokeWidth={isHighlighted ? 4 : 3}
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
      {draftNodes.map((node) => {
        const { pixelX, pixelY } = percentToPixel(node.x, node.y, size.width, size.height)
        return (
          <Circle
            key={node.id}
            x={pixelX}
            y={pixelY}
            radius={10}
            fill="#facc15"
            stroke="#854d0e"
            strokeWidth={2}
            draggable
            onDragEnd={(event) =>
              onDraftNodeMove(node.id, pixelToPercent(event.target.x(), event.target.y(), size.width, size.height))
            }
          />
        )
      })}
    </Layer>
  )
})
