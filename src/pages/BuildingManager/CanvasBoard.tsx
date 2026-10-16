import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type Konva from 'konva'
import {
  Circle,
  Image as KonvaImage,
  Label,
  Layer,
  Rect,
  Stage,
  Tag as KonvaTag,
  Text,
} from 'react-konva'
import {
  DeleteOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'
import { usePermissions } from '../../auth/usePermissions'
import { designTokens } from '../../theme/theme'

const { Text: AntText } = Typography

type ImageStatus = 'idle' | 'loading' | 'loaded' | 'failed'

const poiTypeLabels: Record<string, string> = {
  entrance: 'Lối vào',
  shop: 'Cửa hàng',
  store: 'Gian hàng',
  service: 'Dịch vụ',
  elevator: 'Thang máy',
  toilet: 'Nhà vệ sinh',
  exit: 'Lối thoát',
  custom: 'Điểm tùy chỉnh',
}

const MAX_ZOOM = 2.5
const LABEL_ZOOM_THRESHOLD = 1.55

type Pan = { x: number; y: number }
type LabelBox = { x: number; y: number; width: number; height: number }
type PoiLabelLayout = LabelBox & { hidden: boolean }

function clampPan(pan: Pan, zoom: number, width: number, height: number): Pan {
  const minX = Math.min(0, width - width * zoom)
  const minY = Math.min(0, height - height * zoom)
  return {
    x: Math.min(0, Math.max(minX, pan.x)),
    y: Math.min(0, Math.max(minY, pan.y)),
  }
}

function boxesOverlap(left: LabelBox, right: LabelBox) {
  return left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
}

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
  const [size, setSize] = useState({ width: 0, height: 0 })
  const ref = useCallback((node: T | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element) {
      setSize({ width: 0, height: 0 })
      return
    }

    function updateSize(width: number, height: number) {
      setSize({
        width: Math.floor(width),
        height: Math.floor(height),
      })
    }

    const rect = element.getBoundingClientRect()
    updateSize(rect.width, rect.height)

    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [element])

  return [ref, size] as const
}

export function CanvasBoard({ readOnly = false }: { readOnly?: boolean }) {
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>()
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 })
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const pois = useFloorStore((state) => state.pois)
  const isPoiSaving = useFloorStore((state) => state.isPoiSaving)
  const error = useFloorStore((state) => state.error)
  const addPoi = useFloorStore((state) => state.addPoi)
  const movePoi = useFloorStore((state) => state.movePoi)
  const removePoi = useFloorStore((state) => state.removePoi)
  const mapImageUrl = selectedFloor?.mapImageUrl?.trim() || null
  const mapImage = useImage(mapImageUrl)
  const permissions = usePermissions()
  const canEdit = Boolean(selectedFloor && permissions.canEditFloor(selectedFloor) && !readOnly)

  useEffect(() => {
    setSelectedPoiId(null)
    setHoveredPoiId(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [selectedFloor?.id])

  const stageSize = useMemo(() => {
    if (!selectedFloor) {
      return { width: 0, height: 0 }
    }

    const mapWidth = selectedFloor.mapWidth || 1200
    const mapHeight = selectedFloor.mapHeight || 760
    const scale = Math.min(
      stageHostSize.width / mapWidth,
      stageHostSize.height / mapHeight,
      1,
    )

    return {
      width: Math.round(mapWidth * scale),
      height: Math.round(mapHeight * scale),
    }
  }, [selectedFloor, stageHostSize.height, stageHostSize.width])

  const canRenderStage = stageSize.width > 0 && stageSize.height > 0

  useEffect(() => {
    setPan((currentPan) =>
      clampPan(currentPan, zoom, stageSize.width, stageSize.height),
    )
  }, [stageSize.height, stageSize.width, zoom])

  const labelLayouts = useMemo(() => {
    const visibleEveryLabel = zoom >= LABEL_ZOOM_THRESHOLD
    const prioritizedPois = [...pois]
      .filter((poi) => visibleEveryLabel || poi.id === selectedPoiId || poi.id === hoveredPoiId)
      .sort((left, right) => {
        const priority = (poiId: string) =>
          poiId === selectedPoiId ? 0 : poiId === hoveredPoiId ? 1 : 2
        return priority(left.id) - priority(right.id)
      })
    const occupied: LabelBox[] = []
    const layouts = new Map<string, PoiLabelLayout>()

    for (const poi of prioritizedPois) {
      const { pixelX, pixelY } = percentToPixel(
        poi.x,
        poi.y,
        stageSize.width,
        stageSize.height,
      )
      const width = Math.min(180, Math.max(58, poi.name.length * 7 + 16))
      const height = 26
      const candidates: LabelBox[] = [
        { x: pixelX + 12, y: pixelY - height / 2, width, height },
        { x: pixelX - width - 12, y: pixelY - height / 2, width, height },
        { x: pixelX - width / 2, y: pixelY - height - 12, width, height },
        { x: pixelX - width / 2, y: pixelY + 12, width, height },
      ].map((candidate) => ({
        ...candidate,
        x: Math.max(0, Math.min(stageSize.width - width, candidate.x)),
        y: Math.max(0, Math.min(stageSize.height - height, candidate.y)),
      }))
      const available = candidates.find(
        (candidate) => !occupied.some((box) => boxesOverlap(candidate, box)),
      )
      const isPriority = poi.id === selectedPoiId || poi.id === hoveredPoiId
      const chosen = available ?? (isPriority ? candidates[0] : undefined)

      if (chosen) {
        occupied.push(chosen)
        layouts.set(poi.id, { ...chosen, hidden: false })
      }
    }

    return layouts
  }, [hoveredPoiId, pois, selectedPoiId, stageSize.height, stageSize.width, zoom])

  if (!selectedFloor) {
    return (
      <Card className="tool-card canvas-card">
        <div className="canvas-shell canvas-shell-empty">
          <Empty description="Chọn tòa nhà và tầng" />
        </div>
      </Card>
    )
  }

  async function handleStageClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!selectedFloor || !canEdit) {
      return
    }

    const clickedMap =
      event.target === event.target.getStage() ||
      event.target.name() === 'map-background'

    if (!clickedMap) {
      return
    }

    const stage = event.target.getStage()
    const position = stage?.getPointerPosition()
    if (!position) {
      return
    }

    const pixelX = (position.x - pan.x) / zoom
    const pixelY = (position.y - pan.y) / zoom
    if (
      pixelX < 0 ||
      pixelY < 0 ||
      pixelX > stageSize.width ||
      pixelY > stageSize.height
    ) {
      return
    }

    await addPoi({
      ...pixelToPercent(
        pixelX,
        pixelY,
        stageSize.width,
        stageSize.height,
      ),
      type: 'custom',
    })
  }

  async function handlePoiDragEnd(
    poiId: string,
    event: Konva.KonvaEventObject<DragEvent>,
  ) {
    if (!selectedFloor) {
      return
    }

    await movePoi(poiId, {
      ...pixelToPercent(
        event.target.x(),
        event.target.y(),
        stageSize.width,
        stageSize.height,
      ),
    })
  }

  function zoomAroundPoint(nextZoom: number, point?: { x: number; y: number }) {
    const clampedZoom = Math.max(1, Math.min(MAX_ZOOM, nextZoom))
    const focusPoint = point ?? {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    }
    const mapPoint = {
      x: (focusPoint.x - pan.x) / zoom,
      y: (focusPoint.y - pan.y) / zoom,
    }
    const nextPan = clampPan(
      {
        x: focusPoint.x - mapPoint.x * clampedZoom,
        y: focusPoint.y - mapPoint.y * clampedZoom,
      },
      clampedZoom,
      stageSize.width,
      stageSize.height,
    )
    setZoom(clampedZoom)
    setPan(nextPan)
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="canvas-workspace">
      <Card className="tool-card canvas-card">
        <div className="canvas-shell">
          <div className="canvas-toolbar">
            <div>
              <strong>Sơ đồ nền</strong>
              <span>
                Ảnh {selectedFloor.mapWidth} × {selectedFloor.mapHeight}px
              </span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <Space size={4}>
              <Tooltip title="Thu nhỏ">
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomOutOutlined />}
                  aria-label="Thu nhỏ bản đồ"
                  disabled={zoom <= 1}
                  onClick={() => zoomAroundPoint(zoom - 0.25)}
                />
              </Tooltip>
              <Tooltip title="Phóng to">
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomInOutlined />}
                  aria-label="Phóng to bản đồ"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() => zoomAroundPoint(zoom + 0.25)}
                />
              </Tooltip>
              <Tooltip title="Đặt lại khung nhìn">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  aria-label="Đặt lại khung nhìn bản đồ"
                  onClick={resetView}
                />
              </Tooltip>
            </Space>
          </div>

          {error ? (
            <Alert
              className="canvas-alert"
              message={error}
              type="error"
              showIcon
            />
          ) : null}

          <Spin spinning={isPoiSaving}>
            <div className="stage-host" ref={stageHostRef}>
              {canRenderStage ? (
                <div
                  className="stage-wrap"
                  style={{ width: stageSize.width, height: stageSize.height }}
                >
                  <Stage
                    width={stageSize.width}
                    height={stageSize.height}
                    x={pan.x}
                    y={pan.y}
                    draggable
                    onClick={handleStageClick}
                    onDragEnd={(event) => {
                      setPan(
                        clampPan(
                          { x: event.target.x(), y: event.target.y() },
                          zoom,
                          stageSize.width,
                          stageSize.height,
                        ),
                      )
                    }}
                    onWheel={(event) => {
                      event.evt.preventDefault()
                      const stage = event.target.getStage()
                      const pointer = stage?.getPointerPosition()
                      if (!pointer) return
                      zoomAroundPoint(
                        zoom + (event.evt.deltaY > 0 ? -0.15 : 0.15),
                        pointer,
                      )
                    }}
                  >
                    <Layer scaleX={zoom} scaleY={zoom}>
                      {mapImage.image ? (
                        <KonvaImage
                          name="map-background"
                          image={mapImage.image}
                          width={stageSize.width}
                          height={stageSize.height}
                        />
                      ) : (
                        <>
                          <Rect
                            name="map-background"
                            width={stageSize.width}
                            height={stageSize.height}
                            fill={designTokens.surfaceMuted}
                            stroke={designTokens.ink400}
                            strokeWidth={2}
                          />
                          <Text
                            x={24}
                            y={24}
                            text={
                              mapImage.status === 'failed'
                                ? 'Không tải được ảnh sơ đồ'
                                : mapImage.status === 'loading'
                                  ? 'Đang tải ảnh sơ đồ'
                                  : 'Chưa có ảnh sơ đồ'
                            }
                            fontSize={18}
                            fill={designTokens.ink700}
                            listening={false}
                          />
                        </>
                      )}
                      {pois.map((poi) => {
                        const { pixelX, pixelY } = percentToPixel(
                          poi.x,
                          poi.y,
                          stageSize.width,
                          stageSize.height,
                        )

                        return (
                          <Circle
                            key={poi.id}
                            x={pixelX}
                            y={pixelY}
                            radius={poi.id === selectedPoiId ? 11 : 9}
                            fill={poi.id === selectedPoiId ? designTokens.blue600 : designTokens.warning}
                            stroke={designTokens.surface}
                            strokeWidth={3}
                            hitStrokeWidth={10}
                            draggable={canEdit}
                            onMouseEnter={() => setHoveredPoiId(poi.id)}
                            onMouseLeave={() => setHoveredPoiId(null)}
                            onTap={(event) => {
                              event.cancelBubble = true
                              setSelectedPoiId(poi.id)
                            }}
                            onClick={(event) => {
                              event.cancelBubble = true
                              setSelectedPoiId(poi.id)
                            }}
                            onDragEnd={(event) =>
                              handlePoiDragEnd(poi.id, event)
                            }
                          />
                        )
                      })}
                      {pois.map((poi) => {
                        const layout = labelLayouts.get(poi.id)
                        if (!layout || layout.hidden) return null
                        return (
                          <Label
                            key={`${poi.id}-label`}
                            x={layout.x}
                            y={layout.y}
                            opacity={0.88}
                            listening={false}
                          >
                            <KonvaTag fill={designTokens.ink900} cornerRadius={3} />
                            <Text
                              text={poi.name}
                              width={layout.width}
                              height={layout.height}
                              fontSize={12}
                              fill={designTokens.surface}
                              padding={4}
                            />
                          </Label>
                        )
                      })}
                    </Layer>
                  </Stage>
                </div>
              ) : (
                <div className="stage-empty">
                  <Empty description="Đang đo kích thước canvas" />
                </div>
              )}
            </div>
          </Spin>

          {selectedFloor.publishStatus === 'draft' ? (
            <Text className="canvas-draft-note" type="secondary">
              Tầng này đang ở chế độ nháp, chưa hiển thị cho khách tham quan.
            </Text>
          ) : null}
        </div>
      </Card>

      <Card title="POI" className="tool-card poi-card">
        {pois.length > 0 ? (
          <div className="poi-list">
            {pois.map((poi) => (
              <div className="poi-list-item" key={poi.id}>
                <div
                  className={`poi-list-content${selectedPoiId === poi.id ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedPoiId === poi.id}
                  onClick={() => setSelectedPoiId(poi.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedPoiId(poi.id)
                    }
                  }}
                >
                  <Space orientation="vertical" size={2}>
                    <Space>
                      <AntText strong>{poi.name}</AntText>
                      <Tag color="blue">{poiTypeLabels[poi.type] ?? poi.type}</Tag>
                    </Space>
                    <AntText className="poi-coordinate" type="secondary">
                      {poi.x.toFixed(1)}%, {poi.y.toFixed(1)}%
                    </AntText>
                  </Space>
                </div>
                {canEdit ? <Popconfirm
                  title={`Xóa ${poi.name}?`}
                  description="Điểm này sẽ bị xóa khỏi sơ đồ."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => {
                    if (selectedPoiId === poi.id) setSelectedPoiId(null)
                    void removePoi(poi.id)
                  }}
                ><Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label={`Xóa ${poi.name}`}
                /></Popconfirm> : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Click lên bản đồ để thêm POI" />
        )}
      </Card>
    </div>
  )
}
