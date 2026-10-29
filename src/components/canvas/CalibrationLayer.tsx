import { memo } from 'react'
import { Circle, Layer, Line } from 'react-konva'
import type { MapSize, PercentPoint } from '../../types/geometry'
import { percentToPixel } from '../../utils/canvasCoordinates'

type CalibrationLayerProps = {
  points: readonly PercentPoint[]
  size: MapSize
}

/** Hai điểm chuẩn và đoạn thẳng nối chúng khi đang hiệu chuẩn tỉ lệ; không nhận sự kiện chuột. */
export const CalibrationLayer = memo(function CalibrationLayer({ points, size }: CalibrationLayerProps) {
  if (points.length === 0) return null
  const pixels = points.map((point) => percentToPixel(point.x, point.y, size.width, size.height))
  return (
    <Layer listening={false}>
      {pixels.length === 2 && (
        <Line
          points={[pixels[0].pixelX, pixels[0].pixelY, pixels[1].pixelX, pixels[1].pixelY]}
          stroke="#dc2626"
          strokeWidth={3}
          dash={[8, 5]}
        />
      )}
      {pixels.map((pixel, index) => (
        <Circle key={index} x={pixel.pixelX} y={pixel.pixelY} radius={7} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />
      ))}
    </Layer>
  )
})
