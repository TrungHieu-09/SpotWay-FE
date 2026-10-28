import { Fragment, memo } from 'react'
import { Circle, Layer, Line } from 'react-konva'
import type { MapSize, PercentPoint } from '../../types/geometry'
import { percentToPixel } from '../../utils/canvasCoordinates'

type WallShape = { id: string; x1: number; y1: number; x2: number; y2: number }

type WallsLayerProps = {
  walls: readonly WallShape[]
  selectedWallId?: string
  /** Đoạn tường đang vẽ dở: điểm bắt đầu → vị trí con trỏ (đều là %). */
  draft: { start: PercentPoint; pointer: PercentPoint } | null
  size: MapSize
  onToggleSelect: (wallId: string) => void
  onDelete: (wallId: string) => void
}

export const WallsLayer = memo(function WallsLayer({
  walls,
  selectedWallId,
  draft,
  size,
  onToggleSelect,
  onDelete,
}: WallsLayerProps) {
  const draftStart = draft && percentToPixel(draft.start.x, draft.start.y, size.width, size.height)
  const draftPointer = draft && percentToPixel(draft.pointer.x, draft.pointer.y, size.width, size.height)

  return (
    <Layer>
      {walls.map((wall) => {
        const p1 = percentToPixel(wall.x1, wall.y1, size.width, size.height)
        const p2 = percentToPixel(wall.x2, wall.y2, size.width, size.height)
        const isSelected = selectedWallId === wall.id
        const endpoint = {
          radius: isSelected ? 5 : 4,
          fill: isSelected ? '#f43f5e' : '#3b82f6',
          stroke: '#ffffff',
          strokeWidth: 1.5,
          listening: false,
        }

        return (
          <Fragment key={wall.id}>
            <Line
              points={[p1.pixelX, p1.pixelY, p2.pixelX, p2.pixelY]}
              stroke={isSelected ? '#f43f5e' : '#2563eb'}
              strokeWidth={isSelected ? 8 : 6}
              lineCap="round"
              onClick={(event) => {
                event.cancelBubble = true
                onToggleSelect(wall.id)
              }}
              onContextMenu={(event) => {
                event.evt.preventDefault()
                event.cancelBubble = true
                onDelete(wall.id)
              }}
            />
            <Circle x={p1.pixelX} y={p1.pixelY} {...endpoint} />
            <Circle x={p2.pixelX} y={p2.pixelY} {...endpoint} />
          </Fragment>
        )
      })}
      {draftStart && draftPointer && (
        <Line
          points={[draftStart.pixelX, draftStart.pixelY, draftPointer.pixelX, draftPointer.pixelY]}
          stroke="#60a5fa"
          strokeWidth={4}
          dash={[8, 5]}
          lineCap="round"
          listening={false}
        />
      )}
    </Layer>
  )
})
