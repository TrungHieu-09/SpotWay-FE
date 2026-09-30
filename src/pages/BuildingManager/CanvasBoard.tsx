import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Space,
  Spin,
  Tag,
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
import { DeleteOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'

const { Text: AntText } = Typography

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
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!ref.current) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    })
    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}

export function CanvasBoard() {
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>()
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const pois = useFloorStore((state) => state.pois)
  const isPoiSaving = useFloorStore((state) => state.isPoiSaving)
  const error = useFloorStore((state) => state.error)
  const addPoi = useFloorStore((state) => state.addPoi)
  const movePoi = useFloorStore((state) => state.movePoi)
  const removePoi = useFloorStore((state) => state.removePoi)
  const mapImageUrl = selectedFloor?.mapImageUrl?.trim() || null
  const mapImage = useImage(mapImageUrl)

  const stageSize = useMemo(() => {
    if (!selectedFloor) {
      return { width: 0, height: 0 }
    }

    const scale = Math.min(
      stageHostSize.width / selectedFloor.mapWidth,
      stageHostSize.height / selectedFloor.mapHeight,
      1,
    )

    return {
      width: Math.round(selectedFloor.mapWidth * scale),
      height: Math.round(selectedFloor.mapHeight * scale),
    }
  }, [selectedFloor, stageHostSize.height, stageHostSize.width])

  const canRenderStage = stageSize.width > 0 && stageSize.height > 0

  if (!selectedFloor) {
    return (
      <Card className="tool-card canvas-card">
        <div className="canvas-shell canvas-shell-empty">
          <Empty description="Chọn building và tầng" />
        </div>
      </Card>
    )
  }

  async function handleStageClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!selectedFloor) {
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

    await addPoi({
      ...pixelToPercent(
        position.x,
        position.y,
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

  return (
    <div className="canvas-workspace">
      <Card className="tool-card canvas-card">
        <div className="canvas-shell">
          <div className="canvas-toolbar">
            <div>
              <strong>{selectedFloor.name}</strong>
              <span>
                {selectedFloor.mapWidth} x {selectedFloor.mapHeight}
              </span>
            </div>
            <span>{pois.length} POI</span>
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
                    onClick={handleStageClick}
                  >
                    <Layer>
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
                            fill="#f1f5f9"
                            stroke="#94a3b8"
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
                            fill="#475569"
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
                            radius={16}
                            fill="#f97316"
                            stroke="#ffffff"
                            strokeWidth={5}
                            draggable
                            onDragEnd={(event) =>
                              handlePoiDragEnd(poi.id, event)
                            }
                          />
                        )
                      })}
                      {pois.map((poi) => {
                        const { pixelX, pixelY } = percentToPixel(
                          poi.x,
                          poi.y,
                          stageSize.width,
                          stageSize.height,
                        )

                        return (
                          <Label
                            key={`${poi.id}-label`}
                            x={pixelX + 18}
                            y={pixelY - 17}
                            listening={false}
                          >
                            <KonvaTag fill="#111827" cornerRadius={4} />
                            <Text
                              text={poi.name}
                              fontSize={14}
                              fill="#ffffff"
                              padding={6}
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
        </div>
      </Card>

      <Card title="POI" className="tool-card poi-card">
        <List
          dataSource={pois}
          locale={{ emptyText: 'Click lên bản đồ để thêm POI' }}
          renderItem={(poi) => (
            <List.Item
              actions={[
                <Button
                  key="delete"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removePoi(poi.id)}
                />,
              ]}
            >
              <Space orientation="vertical" size={2}>
                <Space>
                  <AntText strong>{poi.name}</AntText>
                  <Tag color="blue">{poi.type}</Tag>
                </Space>
                <AntText type="secondary">
                  {poi.x.toFixed(1)}%, {poi.y.toFixed(1)}%
                </AntText>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
