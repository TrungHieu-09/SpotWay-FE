/* oxlint-disable react/set-state-in-effect react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Space, Tag, Typography } from 'antd'
import type Konva from 'konva'
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva'
import type { Floor } from '../../types/floor'
import type { FloorGeometry, Point, Room } from '../../types/geometry'
import type { Poi, PoiType } from '../../types/poi'
import type { RouteResult } from '../../types/route'
import type { Destination } from '../../types/route'
import type { Store } from '../../types/store'
import { percentToPixel } from '../../utils/canvasCoordinates'
import { designTokens, mapTokens } from '../../theme/theme'

const { Text: AntText } = Typography

type FocusTarget = {
  floorId: string
  x: number
  y: number
  nonce: number
}

type MapViewer2DProps = {
  floor?: Floor
  geometry?: FloorGeometry
  stores: Store[]
  destinations: Destination[]
  route: RouteResult | null
  focusTarget?: FocusTarget
  onSelectDestination: (nodeId: string) => void
}

type Size = {
  width: number
  height: number
}

type Position = {
  x: number
  y: number
}

type ImageStatus = 'idle' | 'loading' | 'loaded' | 'failed'

function useImage(src?: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [status, setStatus] = useState<ImageStatus>('idle')

  useEffect(() => {
    const normalizedSrc = src?.trim()
    if (!normalizedSrc) {
      setImage(null)
      setStatus('idle')
      return
    }

    const nextImage = new window.Image()
    setImage(null)
    setStatus('loading')
    nextImage.onload = () => {
      setImage(nextImage)
      setStatus('loaded')
    }
    nextImage.onerror = () => {
      setImage(null)
      setStatus('failed')
    }
    nextImage.src = normalizedSrc
  }, [src])

  return { image, status }
}

function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    if (!element) {
      setSize({ width: 0, height: 0 })
      return
    }

    const updateSize = (width: number, height: number) => {
      setSize({ width: Math.floor(width), height: Math.floor(height) })
    }
    const rect = element.getBoundingClientRect()
    updateSize(rect.width, rect.height)

    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, size] as const
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roomCenter(room: Room): Point {
  const total = room.polygon.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  )

  return {
    x: total.x / room.polygon.length,
    y: total.y / room.polygon.length,
  }
}

function poiColor(type: PoiType) {
  return mapTokens.poi[type]
}

function poiIcon(type: PoiType) {
  const iconByType: Record<PoiType, string> = {
    entrance: 'EN',
    shop: 'S',
    store: 'S',
    service: 'SV',
    elevator: 'EL',
    toilet: 'WC',
    exit: 'EX',
    custom: 'P',
  }
  return iconByType[type]
}

function shouldShowPoi(type: PoiType, zoom: number) {
  return ['entrance', 'elevator', 'exit'].includes(type) || zoom >= 1.5
}

function getPoiStore(poi: Poi, stores: Store[]) {
  return stores.find((store) => store.name === poi.name)
}

function getRouteSegment(route: RouteResult | null, floorId?: string) {
  if (!route || !floorId) {
    return null
  }

  return route.segments.find((segment) => segment.floorId === floorId) ?? null
}

export function MapViewer2D({
  floor,
  geometry,
  stores,
  destinations,
  route,
  focusTarget,
  onSelectDestination,
}: MapViewer2DProps) {
  const [hostRef, hostSize] = useElementSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [dashOffset, setDashOffset] = useState(0)
  const planImage = useImage(floor?.mapImageUrl)

  const baseScale = useMemo(() => {
    if (!floor || hostSize.width <= 0 || hostSize.height <= 0) {
      return 1
    }

    return Math.min(
      hostSize.width / floor.mapWidth,
      hostSize.height / floor.mapHeight,
    )
  }, [floor, hostSize.height, hostSize.width])

  const totalScale = baseScale * zoom
  const canRenderStage = Boolean(floor && hostSize.width > 0 && hostSize.height > 0)

  function clampPosition(nextPosition: Position, nextZoom = zoom) {
    if (!floor) {
      return nextPosition
    }

    const scaledWidth = floor.mapWidth * baseScale * nextZoom
    const scaledHeight = floor.mapHeight * baseScale * nextZoom
    const minX = Math.min(0, hostSize.width - scaledWidth)
    const minY = Math.min(0, hostSize.height - scaledHeight)
    const maxX = scaledWidth < hostSize.width ? (hostSize.width - scaledWidth) / 2 : 0
    const maxY = scaledHeight < hostSize.height ? (hostSize.height - scaledHeight) / 2 : 0

    return {
      x: clamp(nextPosition.x, minX, maxX),
      y: clamp(nextPosition.y, minY, maxY),
    }
  }

  function resetView() {
    if (!floor) {
      return
    }

    setZoom(1)
    setPosition(
      clampPosition({
        x: (hostSize.width - floor.mapWidth * baseScale) / 2,
        y: (hostSize.height - floor.mapHeight * baseScale) / 2,
      }, 1),
    )
  }

  useEffect(() => {
    resetView()
    setSelectedPoiId(null)
  }, [floor?.id, hostSize.width, hostSize.height, baseScale])

  useEffect(() => {
    if (!floor || !focusTarget || focusTarget.floorId !== floor.id) {
      return
    }

    const nextZoom = 2
    const { pixelX, pixelY } = percentToPixel(
      focusTarget.x,
      focusTarget.y,
      floor.mapWidth,
      floor.mapHeight,
    )
    setZoom(nextZoom)
    setPosition(
      clampPosition({
        x: hostSize.width / 2 - pixelX * baseScale * nextZoom,
        y: hostSize.height / 2 - pixelY * baseScale * nextZoom,
      }, nextZoom),
    )
  }, [focusTarget?.nonce])

  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    if (!floor) {
      return
    }

    event.evt.preventDefault()
    const stage = event.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) {
      return
    }

    const nextZoom = clamp(zoom * (event.evt.deltaY > 0 ? 0.9 : 1.1), 0.5, 4)
    const mapX = (pointer.x - position.x) / totalScale
    const mapY = (pointer.y - position.y) / totalScale
    const nextPosition = clampPosition(
      {
        x: pointer.x - mapX * baseScale * nextZoom,
        y: pointer.y - mapY * baseScale * nextZoom,
      },
      nextZoom,
    )

    setZoom(nextZoom)
    setPosition(nextPosition)
  }

  function handleDragEnd(event: Konva.KonvaEventObject<DragEvent>) {
    setPosition(
      clampPosition({
        x: event.target.x(),
        y: event.target.y(),
      }),
    )
  }

  const selectedPoi = floor?.pois.find((poi) => poi.id === selectedPoiId) ?? null
  const selectedPoiStore = selectedPoi ? getPoiStore(selectedPoi, stores) : null
  const selectedPoiScreenPosition = useMemo(() => {
    if (!floor || !selectedPoi) {
      return null
    }

    const { pixelX, pixelY } = percentToPixel(
      selectedPoi.x,
      selectedPoi.y,
      floor.mapWidth,
      floor.mapHeight,
    )

    return {
      x: position.x + pixelX * totalScale,
      y: position.y + pixelY * totalScale,
    }
  }, [floor, position.x, position.y, selectedPoi, totalScale])
  const routeSegment = getRouteSegment(route, floor?.id)

  useEffect(() => {
    let frameId = 0

    function tick() {
      setDashOffset((value) => (value + 0.6) % 30)
      frameId = window.requestAnimationFrame(tick)
    }

    if (route) {
      frameId = window.requestAnimationFrame(tick)
    }

    return () => window.cancelAnimationFrame(frameId)
  }, [route])

  if (!floor) {
    return (
      <div className="guest-map-host">
        <Empty description="Chọn tòa nhà để xem bản đồ" />
      </div>
    )
  }

  return (
    <div className="guest-map-shell">
      <div className="guest-map-toolbar">
        <Space>
          <Button onClick={() => setZoom((value) => clamp(value + 0.25, 0.5, 4))}>
            +
          </Button>
          <Button onClick={() => setZoom((value) => clamp(value - 0.25, 0.5, 4))}>
            -
          </Button>
          <Button onClick={resetView}>Về mặc định</Button>
        </Space>
        <AntText type="secondary">{Math.round(zoom * 100)}%</AntText>
      </div>

      <div className="guest-map-host" ref={hostRef}>
        {canRenderStage ? (
          <>
            <Stage
              width={hostSize.width}
              height={hostSize.height}
              x={position.x}
              y={position.y}
              scaleX={totalScale}
              scaleY={totalScale}
              draggable
              onDragEnd={handleDragEnd}
              onWheel={handleWheel}
              onMouseDown={() => setSelectedPoiId(null)}
            >
              <Layer>
                {planImage.image ? (
                  <KonvaImage
                    image={planImage.image}
                    width={floor.mapWidth}
                    height={floor.mapHeight}
                  />
                ) : (
                  <Rect
                    width={floor.mapWidth}
                    height={floor.mapHeight}
                    fill={designTokens.surfaceMuted}
                    stroke={designTokens.ink400}
                    strokeWidth={2 / totalScale}
                  />
                )}

                {geometry?.rooms.map((room) => {
                  const points = room.polygon.flatMap((point) => {
                    const { pixelX, pixelY } = percentToPixel(
                      point.x,
                      point.y,
                      floor.mapWidth,
                      floor.mapHeight,
                    )
                    return [pixelX, pixelY]
                  })
                  const center = roomCenter(room)
                  const centerPixel = percentToPixel(
                    center.x,
                    center.y,
                    floor.mapWidth,
                    floor.mapHeight,
                  )

                  return (
                    <Group key={room.id} listening={false}>
                      <Line
                        points={points}
                        closed
                        fill={mapTokens.roomOverlay}
                        stroke={designTokens.ink700}
                        strokeWidth={1.5 / totalScale}
                      />
                      {zoom >= 1.2 ? (
                        <Text
                          x={centerPixel.pixelX - 70 / totalScale}
                          y={centerPixel.pixelY - 8 / totalScale}
                          width={140 / totalScale}
                          align="center"
                          text={room.name}
                          fontSize={13 / totalScale}
                          fontStyle="bold"
                          fill={designTokens.ink900}
                        />
                      ) : null}
                    </Group>
                  )
                })}

                {routeSegment ? (
                  <Group listening={false}>
                    <Line
                      points={routeSegment.points.flatMap((point) => {
                        const { pixelX, pixelY } = percentToPixel(
                          point.x,
                          point.y,
                          floor.mapWidth,
                          floor.mapHeight,
                        )
                        return [pixelX, pixelY]
                      })}
                      stroke={designTokens.blue600}
                      strokeWidth={8 / totalScale}
                      dash={[18 / totalScale, 12 / totalScale]}
                      dashOffset={dashOffset / totalScale}
                      lineCap="round"
                      lineJoin="round"
                    />
                    {routeSegment.points.map((point, index) => {
                      if (index !== 0 && index !== routeSegment.points.length - 1) {
                        return null
                      }

                      const { pixelX, pixelY } = percentToPixel(
                        point.x,
                        point.y,
                        floor.mapWidth,
                        floor.mapHeight,
                      )

                      return (
                        <Circle
                          key={`${point.x}-${point.y}-${index}`}
                          x={pixelX}
                          y={pixelY}
                          radius={index === 0 ? 9 / totalScale : 12 / totalScale}
                          fill={index === 0 ? designTokens.success : designTokens.danger}
                          stroke={designTokens.surface}
                          strokeWidth={3 / totalScale}
                        />
                      )
                    })}
                  </Group>
                ) : null}

                {floor.pois.filter((poi) => shouldShowPoi(poi.type, zoom)).map((poi) => {
                  const { pixelX, pixelY } = percentToPixel(
                    poi.x,
                    poi.y,
                    floor.mapWidth,
                    floor.mapHeight,
                  )

                  return (
                    <Group
                      key={poi.id}
                      x={pixelX}
                      y={pixelY}
                      onClick={(event) => {
                        event.cancelBubble = true
                        setSelectedPoiId(poi.id)
                      }}
                    >
                      <Circle
                        radius={15 / totalScale}
                        fill={poiColor(poi.type)}
                        stroke={designTokens.surface}
                        strokeWidth={4 / totalScale}
                      />
                      <Text
                        x={-13 / totalScale}
                        y={-5 / totalScale}
                        width={26 / totalScale}
                        text={poiIcon(poi.type)}
                        fontSize={9 / totalScale}
                        fontStyle="bold"
                        align="center"
                        fill={designTokens.surface}
                      />
                    </Group>
                  )
                })}
              </Layer>
            </Stage>

            {selectedPoi && selectedPoiScreenPosition ? (
              <div
                className="guest-poi-popover"
                style={{
                  left: selectedPoiScreenPosition.x,
                  top: selectedPoiScreenPosition.y,
                }}
              >
                <strong>{selectedPoi.name}</strong>
                <Tag color="blue">{selectedPoi.type}</Tag>
                {selectedPoiStore ? (
                  <AntText type="secondary">
                    {selectedPoiStore.category} - {selectedPoiStore.status}
                  </AntText>
                ) : null}
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    const destination = destinations.find(
                      (item) =>
                        item.floorId === floor.id &&
                        item.label === selectedPoi.name,
                    )
                    if (destination) {
                      onSelectDestination(destination.nodeId)
                    }
                  }}
                >
                  Đi tới đây
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="guest-map-empty">
            <Empty description="Đang đo kích thước bản đồ" />
          </div>
        )}
      </div>
    </div>
  )
}
