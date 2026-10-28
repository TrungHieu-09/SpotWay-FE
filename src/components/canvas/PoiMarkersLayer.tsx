import { memo } from 'react'
import { Circle, Group, Label, Layer, Tag as KonvaTag, Text } from 'react-konva'
import type { MapSize, PercentPoint } from '../../types/geometry'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'

/** Phần tối thiểu layer cần từ POI (`Poi` thoả mãn). */
type PoiMarker = PercentPoint & { id: string; name: string }

type PoiMarkersLayerProps = {
  pois: readonly PoiMarker[]
  size: MapSize
  selectedPoiId?: string
  onMove: (poiId: string, to: PercentPoint) => void
  onSelect: (poiId: string) => void
}

export const PoiMarkersLayer = memo(function PoiMarkersLayer({ pois, size, selectedPoiId, onMove, onSelect }: PoiMarkersLayerProps) {
  return (
    <Layer>
      {pois.map((poi) => {
        const { pixelX, pixelY } = percentToPixel(poi.x, poi.y, size.width, size.height)
        return (
          <Group key={poi.id}>
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
