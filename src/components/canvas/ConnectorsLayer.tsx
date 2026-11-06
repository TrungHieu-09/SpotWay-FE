import { memo } from 'react'
import { Circle, Group, Label, Layer, Tag as KonvaTag, Text } from 'react-konva'
import type { MapSize } from '../../types/geometry'
import type { Connector, ConnectorKind, GraphNode } from '../../types/graph'
import { percentToPixel } from '../../utils/canvasCoordinates'

export const CONNECTOR_STYLE: Record<ConnectorKind, { color: string; glyph: string; label: string }> = {
  ELEVATOR: { color: '#a855f7', glyph: 'T', label: 'Thang máy' },
  STAIR: { color: '#f59e0b', glyph: 'B', label: 'Cầu thang bộ' },
  ESCALATOR: { color: '#14b8a6', glyph: 'C', label: 'Thang cuốn' },
}

type ConnectorsLayerProps = {
  floorId: string
  connectors: readonly Connector[]
  nodeById: ReadonlyMap<string, GraphNode>
  size: MapSize
}

/**
 * Đánh dấu node thuộc connector xuyên tầng: vòng màu theo loại + nhãn "tên · số tầng".
 * Không tương tác (`listening={false}`) nên không cản click vào node bên dưới.
 */
export const ConnectorsLayer = memo(function ConnectorsLayer({ floorId, connectors, nodeById, size }: ConnectorsLayerProps) {
  return (
    <Layer listening={false}>
      {connectors.flatMap((connector) =>
        connector.stops
          .filter((stop) => stop.floorId === floorId)
          .flatMap((stop) => {
            const node = nodeById.get(stop.nodeId)
            if (!node) return []
            const { pixelX, pixelY } = percentToPixel(node.x, node.y, size.width, size.height)
            const style = CONNECTOR_STYLE[connector.kind]
            return (
              <Group key={`${connector.id}-${stop.nodeId}`}>
                <Circle x={pixelX} y={pixelY} radius={24} stroke={style.color} strokeWidth={4} dash={connector.accessible ? undefined : [6, 4]} />
                <Circle x={pixelX} y={pixelY} radius={9} fill={style.color} />
                <Text x={pixelX - 4} y={pixelY - 5} text={style.glyph} fontSize={10} fontStyle="bold" fill="#ffffff" />
                <Label x={pixelX + 28} y={pixelY - 28}>
                  <KonvaTag fill={style.color} cornerRadius={4} />
                  <Text text={`${connector.name} · ${connector.stops.length} tầng`} fontSize={12} fill="#ffffff" padding={4} />
                </Label>
              </Group>
            )
          }),
      )}
    </Layer>
  )
})
