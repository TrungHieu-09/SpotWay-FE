import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, List, Space, Spin, Tag, Typography } from 'antd'
import type Konva from 'konva'
import { Circle, Image as KonvaImage, Label, Layer, Stage, Tag as KonvaTag, Text } from 'react-konva'
import { DeleteOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import type { Poi } from '../../types/poi'

const { Text: AntText } = Typography

function useImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }

    const nextImage = new window.Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.src = src
  }, [src])

  return image
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    if (!ref.current) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(320, Math.floor(entry.contentRect.width)))
    })
    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

function poiToImagePosition(poi: Poi, mapWidth: number, mapHeight: number) {
  return {
    x: (poi.xPercent / 100) * mapWidth,
    y: (poi.yPercent / 100) * mapHeight,
  }
}

export function CanvasBoard() {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const pois = useFloorStore((state) => state.pois)
  const isPoiSaving = useFloorStore((state) => state.isPoiSaving)
  const error = useFloorStore((state) => state.error)
  const addPoi = useFloorStore((state) => state.addPoi)
  const movePoi = useFloorStore((state) => state.movePoi)
  const removePoi = useFloorStore((state) => state.removePoi)
  const mapImage = useImage(selectedFloor?.mapImageUrl)

  const scale = useMemo(() => {
    if (!selectedFloor) {
      return 1
    }
    return Math.min(width / selectedFloor.mapWidth, 1)
  }, [selectedFloor, width])

  if (!selectedFloor) {
    return (
      <Card className="tool-card canvas-card">
        <div className="canvas-shell canvas-shell-empty">
          <Empty description="Chọn building và tầng" />
        </div>
      </Card>
    )
  }

  const stageWidth = Math.round(selectedFloor.mapWidth * scale)
  const stageHeight = Math.round(selectedFloor.mapHeight * scale)

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

    const imageX = position.x / scale
    const imageY = position.y / scale

    await addPoi({
      xPercent: (imageX / selectedFloor.mapWidth) * 100,
      yPercent: (imageY / selectedFloor.mapHeight) * 100,
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
      xPercent: (event.target.x() / selectedFloor.mapWidth) * 100,
      yPercent: (event.target.y() / selectedFloor.mapHeight) * 100,
    })
  }

  return (
    <div className="canvas-workspace">
      <Card className="tool-card canvas-card">
        <div className="canvas-shell" ref={containerRef}>
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

          <Spin spinning={isPoiSaving || !mapImage}>
            <div className="stage-wrap" style={{ width: stageWidth }}>
              <Stage
                width={stageWidth}
                height={stageHeight}
                scaleX={scale}
                scaleY={scale}
                onClick={handleStageClick}
              >
                <Layer>
                  {mapImage ? (
                    <KonvaImage
                      name="map-background"
                      image={mapImage}
                      width={selectedFloor.mapWidth}
                      height={selectedFloor.mapHeight}
                    />
                  ) : null}
                  {pois.map((poi) => {
                    const position = poiToImagePosition(
                      poi,
                      selectedFloor.mapWidth,
                      selectedFloor.mapHeight,
                    )

                    return (
                      <Circle
                        key={poi.id}
                        x={position.x}
                        y={position.y}
                        radius={16}
                        fill="#f97316"
                        stroke="#ffffff"
                        strokeWidth={5}
                        draggable
                        onDragEnd={(event) => handlePoiDragEnd(poi.id, event)}
                      />
                    )
                  })}
                  {pois.map((poi) => {
                    const position = poiToImagePosition(
                      poi,
                      selectedFloor.mapWidth,
                      selectedFloor.mapHeight,
                    )

                    return (
                      <Label
                        key={`${poi.id}-label`}
                        x={position.x + 18}
                        y={position.y - 17}
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
              <Space direction="vertical" size={2}>
                <Space>
                  <AntText strong>{poi.name}</AntText>
                  <Tag color="blue">{poi.type}</Tag>
                </Space>
                <AntText type="secondary">
                  {poi.xPercent.toFixed(1)}%, {poi.yPercent.toFixed(1)}%
                </AntText>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
