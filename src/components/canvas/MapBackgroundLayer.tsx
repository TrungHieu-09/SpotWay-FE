import { memo } from 'react'
import { Image as KonvaImage, Layer, Rect, Text } from 'react-konva'
import type { MapSize } from '../../types/geometry'

export type MapImageStatus = 'idle' | 'loading' | 'loaded' | 'failed'

type MapBackgroundLayerProps = {
  image: HTMLImageElement | null
  status: MapImageStatus
  size: MapSize
}

/** Nền sơ đồ: tên `map-background` là dấu hiệu để tool biết click rơi vào bản đồ trống. */
export const MapBackgroundLayer = memo(function MapBackgroundLayer({ image, status, size }: MapBackgroundLayerProps) {
  return (
    <Layer>
      {image ? (
        <KonvaImage name="map-background" image={image} width={size.width} height={size.height} />
      ) : (
        <>
          <Rect
            name="map-background"
            width={size.width}
            height={size.height}
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth={2}
          />
          <Text
            x={24}
            y={24}
            text={
              status === 'failed'
                ? 'Không tải được ảnh sơ đồ'
                : status === 'loading'
                  ? 'Đang tải ảnh sơ đồ'
                  : 'Chưa có ảnh sơ đồ'
            }
            fontSize={18}
            fill="#475569"
            listening={false}
          />
        </>
      )}
    </Layer>
  )
})
