import { memo } from 'react'
import { Circle, Group, Label, Layer, Line, Tag as KonvaTag, Text } from 'react-konva'
import type { MapSize, PercentPoint } from '../../types/geometry'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'

/** Phần tối thiểu layer cần từ POI (`Poi` thoả mãn). */
type PoiMarker = PercentPoint & { id: string; name: string; nearestNodeId?: string | null }

type PoiMarkersLayerProps = {
  pois: readonly PoiMarker[]
  /** Vị trí node cùng tầng để vẽ đường nối POI → node neo. */
  nodes?: readonly (PercentPoint & { id: string })[]
  size: MapSize
  selectedPoiId?: string
  onMove: (poiId: string, to: PercentPoint) => void
  onSelect: (poiId: string) => void
}

export const PoiMarkersLayer = memo(function PoiMarkersLayer({
  pois,
  nodes = [],
  size,
  selectedPoiId,
  onMove,
  onSelect,
}: PoiMarkersLayerProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  return (
    <Layer>
      {pois.map((poi) => {
        const { pixelX, pixelY } = percentToPixel(poi.x, poi.y, size.width, size.height)
        const anchor = poi.nearestNodeId ? nodeById.get(poi.nearestNodeId) : undefined
        const anchorPixel = anchor && percentToPixel(anchor.x, anchor.y, size.width, size.height)
        return (
          <Group key={poi.id}>
            {anchorPixel && (
              <Line
                points={[pixelX, pixelY, anchorPixel.pixelX, anchorPixel.pixelY]}
                stroke="#f97316"
                strokeWidth={2}
                dash={[6, 4]}
                opacity={0.7}
                listening={false}
              />
            )}
            <Circle
              x={pixelX}
              y={pixelY}
              radius={16}
              fill="#f97316"
              stroke={selectedPoiId === poi.id ? '#0284c7' : '#ffffff'}
              strokeWidth={5}
              draggable
              onClick={(event) => {
                event.cancelBubble = true
                onSelect(poi.id)
              }}
              onDragEnd={(event) =>
                onMove(poi.id, pixelToPercent(event.target.x(), event.target.y(), size.width, size.height))
              }
            />
            <Label x={pixelX + 18} y={pixelY - 17} listening={false}>
              <KonvaTag fill="#111827" cornerRadius={4} />
              <Text text={poi.name} fontSize={14} fill="#ffffff" padding={6} />
            </Label>
          </Group>
        )
      })}
    </Layer>
  )
})
