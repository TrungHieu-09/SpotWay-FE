/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import type Konva from 'konva'
import {
  Circle,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva'
import { useFloorStore } from '../../store/useFloorStore'
import { useGeometryStore } from '../../store/useGeometryStore'
import type { FloorGeometry, Point, Room, RoomType } from '../../types/geometry'
import {
  clampPercent,
  percentToPixel,
  pixelToPercent,
} from '../../utils/canvasCoordinates'

const { Text: AntText } = Typography

type FloorRecognitionPanelProps = {
  onDirtyChange?: (isDirty: boolean) => void
}

type ImageStatus = 'idle' | 'loading' | 'loaded' | 'failed'
type SelectedVertex = { roomId: string; pointIndex: number }

const roomTypeOptions: { value: RoomType; label: string }[] = [
  { value: 'store', label: 'Gian hàng' },
  { value: 'corridor', label: 'Hành lang' },
  { value: 'atrium', label: 'Sảnh' },
  { value: 'office', label: 'Văn phòng' },
  { value: 'toilet', label: 'Nhà vệ sinh' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'other', label: 'Khác' },
]

const roomFillByType: Record<RoomType, string> = {
  store: 'rgba(37, 99, 235, 0.18)',
  corridor: 'rgba(148, 163, 184, 0.18)',
  atrium: 'rgba(245, 158, 11, 0.2)',
  office: 'rgba(14, 165, 233, 0.18)',
  toilet: 'rgba(124, 58, 237, 0.18)',
  service: 'rgba(22, 163, 74, 0.18)',
  other: 'rgba(100, 116, 139, 0.16)',
}

const roomStrokeByType: Record<RoomType, string> = {
  store: '#2563eb',
  corridor: '#64748b',
  atrium: '#f59e0b',
  office: '#0284c7',
  toilet: '#7c3aed',
  service: '#16a34a',
  other: '#475569',
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

  return [ref, size] as const
}

function cloneGeometry(geometry: FloorGeometry): FloorGeometry {
  return {
    ...geometry,
    rooms: geometry.rooms.map((room) => ({
      ...room,
      polygon: room.polygon.map((point) => ({ ...point })),
    })),
  }
}

function flattenPolygon(points: Point[], width: number, height: number) {
  return points.flatMap((point) => {
    const { pixelX, pixelY } = percentToPixel(point.x, point.y, width, height)
    return [pixelX, pixelY]
  })
}

function roomCenter(room: Room) {
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

function updateRoom(
  geometry: FloorGeometry,
  roomId: string,
  update: (room: Room) => Room,
) {
  return {
    ...geometry,
    rooms: geometry.rooms.map((room) => (room.id === roomId ? update(room) : room)),
    status: 'draft' as const,
  }
}

export function FloorRecognitionPanel({
  onDirtyChange,
}: FloorRecognitionPanelProps) {
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>()
  const [draftGeometry, setDraftGeometry] = useState<FloorGeometry | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>()
  const [selectedVertex, setSelectedVertex] = useState<SelectedVertex | null>(null)
  const [undoStack, setUndoStack] = useState<FloorGeometry[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [newRoomPoints, setNewRoomPoints] = useState<Point[]>([])
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const geometry = useGeometryStore((state) =>
    selectedFloor ? state.geometriesByFloorId[selectedFloor.id] : undefined,
  )
  const isLoading = useGeometryStore((state) => state.isLoading)
  const isRecognizing = useGeometryStore((state) => state.isRecognizing)
  const isSaving = useGeometryStore((state) => state.isSaving)
  const error = useGeometryStore((state) => state.error)
  const loadGeometriesByFloors = useGeometryStore(
    (state) => state.loadGeometriesByFloors,
  )
  const recognizeGeometry = useGeometryStore((state) => state.recognizeGeometry)
  const saveGeometry = useGeometryStore((state) => state.saveGeometry)
  const mapImage = useImage(selectedFloor?.mapImageUrl ?? null)
  const { message } = AntApp.useApp()

  const selectedRoom = useMemo(
    () => draftGeometry?.rooms.find((room) => room.id === selectedRoomId),
    [draftGeometry, selectedRoomId],
  )
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
    if (!selectedFloor) {
      setDraftGeometry(null)
      return
    }

    loadGeometriesByFloors([selectedFloor.id]).catch((loadError: Error) => {
      message.error(loadError.message)
    })
  }, [loadGeometriesByFloors, message, selectedFloor])

  useEffect(() => {
    if (geometry) {
      setDraftGeometry(cloneGeometry(geometry))
      setSelectedRoomId(geometry.rooms[0]?.id)
      setSelectedVertex(null)
      setUndoStack([])
      setIsDirty(false)
      setIsAddingRoom(false)
      setNewRoomPoints([])
    }
  }, [geometry])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete') {
        deleteSelectedVertex()
      }

      if (event.key === 'Enter' && isAddingRoom) {
        closeNewRoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  function applyGeometryUpdate(update: (geometry: FloorGeometry) => FloorGeometry) {
    setDraftGeometry((currentGeometry) => {
      if (!currentGeometry) {
        return currentGeometry
      }

      setUndoStack((currentStack) =>
        [cloneGeometry(currentGeometry), ...currentStack].slice(0, 20),
      )
      setIsDirty(true)
      return update(cloneGeometry(currentGeometry))
    })
  }

  async function handleRecognize() {
    if (!selectedFloor) {
      return
    }

    try {
      const recognizedGeometry = await recognizeGeometry(selectedFloor.id)
      setDraftGeometry(cloneGeometry(recognizedGeometry))
      setSelectedRoomId(recognizedGeometry.rooms[0]?.id)
      setSelectedVertex(null)
      setUndoStack([])
      setIsDirty(true)
      message.success('Đã tạo bản nháp nhận diện sơ đồ')
    } catch (recognizeError) {
      message.error((recognizeError as Error).message)
    }
  }

  async function handleSave() {
    if (!selectedFloor || !draftGeometry) {
      return
    }

    try {
      const savedGeometry = await saveGeometry(selectedFloor.id, draftGeometry)
      setDraftGeometry(cloneGeometry(savedGeometry))
      setUndoStack([])
      setIsDirty(false)
      message.success('Đã xác nhận và lưu nhận diện sơ đồ')
    } catch (saveError) {
      message.error((saveError as Error).message)
    }
  }

  function handleUndo() {
    setUndoStack((currentStack) => {
      const [previousGeometry, ...nextStack] = currentStack
      if (previousGeometry) {
        setDraftGeometry(previousGeometry)
        setIsDirty(true)
      }
      return nextStack
    })
  }

  function handleStageClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!isAddingRoom) {
      return
    }

    const isBackground =
      event.target === event.target.getStage() ||
      event.target.name() === 'recognition-background'
    if (!isBackground) {
      return
    }

    const position = event.target.getStage()?.getPointerPosition()
    if (!position) {
      return
    }

    setNewRoomPoints((points) => [
      ...points,
      pixelToPercent(position.x, position.y, stageSize.width, stageSize.height),
    ])
  }

  function closeNewRoom() {
    if (!draftGeometry || newRoomPoints.length < 3) {
      return
    }

    const newRoom: Room = {
      id: `room-${crypto.randomUUID()}`,
      floorId: draftGeometry.floorId,
      name: 'Phòng mới',
      type: 'store',
      storeId: null,
      polygon: newRoomPoints,
    }

    applyGeometryUpdate((currentGeometry) => ({
      ...currentGeometry,
      rooms: [...currentGeometry.rooms, newRoom],
      status: 'draft',
    }))
    setSelectedRoomId(newRoom.id)
    setSelectedVertex(null)
    setNewRoomPoints([])
    setIsAddingRoom(false)
  }

  function addVertexToEdge(roomId: string, pointIndex: number, point: Point) {
    applyGeometryUpdate((currentGeometry) =>
      updateRoom(currentGeometry, roomId, (room) => {
        const polygon = [...room.polygon]
        polygon.splice(pointIndex + 1, 0, point)
        return { ...room, polygon }
      }),
    )
    setSelectedVertex({ roomId, pointIndex: pointIndex + 1 })
  }

  function updateVertex(roomId: string, pointIndex: number, point: Point) {
    applyGeometryUpdate((currentGeometry) =>
      updateRoom(currentGeometry, roomId, (room) => ({
        ...room,
        polygon: room.polygon.map((currentPoint, index) =>
          index === pointIndex ? point : currentPoint,
        ),
      })),
    )
  }

  function deleteSelectedVertex() {
    if (!selectedVertex) {
      return
    }

    const room = draftGeometry?.rooms.find(
      (item) => item.id === selectedVertex.roomId,
    )
    if (!room || room.polygon.length <= 3) {
      return
    }

    applyGeometryUpdate((currentGeometry) =>
      updateRoom(currentGeometry, selectedVertex.roomId, (currentRoom) => ({
        ...currentRoom,
        polygon: currentRoom.polygon.filter(
          (_point, index) => index !== selectedVertex.pointIndex,
        ),
      })),
    )
    setSelectedVertex(null)
  }

  function deleteSelectedRoom() {
    if (!selectedRoomId || !draftGeometry || draftGeometry.rooms.length <= 1) {
      return
    }

    applyGeometryUpdate((currentGeometry) => ({
      ...currentGeometry,
      rooms: currentGeometry.rooms.filter((room) => room.id !== selectedRoomId),
      status: 'draft',
    }))
    setSelectedRoomId(draftGeometry.rooms.find((room) => room.id !== selectedRoomId)?.id)
    setSelectedVertex(null)
  }

  function updateSelectedRoomField(field: 'name' | 'type', value: string) {
    if (!selectedRoomId) {
      return
    }

    applyGeometryUpdate((currentGeometry) =>
      updateRoom(currentGeometry, selectedRoomId, (room) => ({
        ...room,
        [field]: value,
      })),
    )
  }

  if (!selectedFloor) {
    return <Empty description="Chọn building và tầng để nhận diện sơ đồ" />
  }

  return (
    <div className="recognition-workspace">
      <Card className="tool-card recognition-canvas-card">
        <div className="recognition-toolbar">
          <Space wrap>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={isRecognizing}
              onClick={handleRecognize}
            >
              Chạy nhận diện (mô phỏng)
            </Button>
            <Button
              icon={<PlusOutlined />}
              type={isAddingRoom ? 'default' : 'dashed'}
              onClick={() => {
                setIsAddingRoom((current) => !current)
                setNewRoomPoints([])
              }}
            >
              Thêm phòng
            </Button>
            <Button
              icon={<UndoOutlined />}
              disabled={undoStack.length === 0}
              onClick={handleUndo}
            >
              Hoàn tác
            </Button>
            <Button
              type="primary"
              loading={isSaving}
              disabled={!draftGeometry || !isDirty}
              onClick={handleSave}
            >
              Xác nhận và lưu
            </Button>
          </Space>
          <Space>
            <Tag color={isDirty || draftGeometry?.status === 'draft' ? 'gold' : 'green'}>
              {isDirty || draftGeometry?.status === 'draft'
                ? 'Bản nháp'
                : 'Đã xác nhận'}
            </Tag>
            <AntText type="secondary">{selectedFloor.name}</AntText>
          </Space>
        </div>

        {error ? (
          <Alert className="canvas-alert" type="warning" showIcon message={error} />
        ) : null}
        {isDirty ? (
          <Alert
            className="canvas-alert"
            type="info"
            showIcon
            message="Bạn có thay đổi chưa lưu. Hãy xác nhận trước khi rời tab."
          />
        ) : null}

        <Spin spinning={isLoading || isRecognizing}>
          <div className="recognition-stage-host" ref={stageHostRef}>
            {canRenderStage && draftGeometry ? (
              <div
                className="stage-wrap"
                style={{ width: stageSize.width, height: stageSize.height }}
              >
                <Stage
                  width={stageSize.width}
                  height={stageSize.height}
                  onClick={handleStageClick}
                  onDblClick={() => {
                    if (isAddingRoom) {
                      closeNewRoom()
                    }
                  }}
                >
                  <Layer>
                    {mapImage.image ? (
                      <KonvaImage
                        name="recognition-background"
                        image={mapImage.image}
                        width={stageSize.width}
                        height={stageSize.height}
                      />
                    ) : (
                      <>
                        <Rect
                          name="recognition-background"
                          width={stageSize.width}
                          height={stageSize.height}
                          fill="#f8fafc"
                          stroke="#cbd5e1"
                          strokeWidth={2}
                        />
                        <Text
                          x={24}
                          y={24}
                          text={
                            mapImage.status === 'failed'
                              ? 'Không tải được ảnh sơ đồ'
                              : 'Chưa có ảnh sơ đồ'
                          }
                          fontSize={18}
                          fill="#64748b"
                          listening={false}
                        />
                      </>
                    )}
                    {draftGeometry.rooms.map((room) => {
                      const isSelected = selectedRoomId === room.id

                      return (
                        <Line
                          key={room.id}
                          closed
                          points={flattenPolygon(
                            room.polygon,
                            stageSize.width,
                            stageSize.height,
                          )}
                          fill={roomFillByType[room.type]}
                          stroke={isSelected ? '#ef4444' : roomStrokeByType[room.type]}
                          strokeWidth={isSelected ? 3 : 2}
                          onClick={() => {
                            setSelectedRoomId(room.id)
                            setSelectedVertex(null)
                          }}
                        />
                      )
                    })}
                    {draftGeometry.rooms.map((room) => {
                      const center = roomCenter(room)
                      const { pixelX, pixelY } = percentToPixel(
                        center.x,
                        center.y,
                        stageSize.width,
                        stageSize.height,
                      )

                      return (
                        <Text
                          key={`${room.id}-label`}
                          x={pixelX - 46}
                          y={pixelY - 9}
                          width={92}
                          align="center"
                          text={room.name}
                          fontSize={13}
                          fontStyle="bold"
                          fill="#111827"
                          listening={false}
                        />
                      )
                    })}
                    {selectedRoom
                      ? selectedRoom.polygon.map((point, pointIndex) => {
                          const nextPoint =
                            selectedRoom.polygon[
                              (pointIndex + 1) % selectedRoom.polygon.length
                            ]
                          const start = percentToPixel(
                            point.x,
                            point.y,
                            stageSize.width,
                            stageSize.height,
                          )
                          const end = percentToPixel(
                            nextPoint.x,
                            nextPoint.y,
                            stageSize.width,
                            stageSize.height,
                          )

                          return (
                            <Line
                              key={`${selectedRoom.id}-edge-${pointIndex}`}
                              points={[start.pixelX, start.pixelY, end.pixelX, end.pixelY]}
                              stroke="#2563eb"
                              strokeWidth={12}
                              opacity={0.01}
                              onDblClick={(event) => {
                                event.cancelBubble = true
                                const position =
                                  event.target.getStage()?.getPointerPosition()
                                if (!position) {
                                  return
                                }

                                addVertexToEdge(
                                  selectedRoom.id,
                                  pointIndex,
                                  pixelToPercent(
                                    position.x,
                                    position.y,
                                    stageSize.width,
                                    stageSize.height,
                                  ),
                                )
                              }}
                            />
                          )
                        })
                      : null}
                    {selectedRoom
                      ? selectedRoom.polygon.map((point, pointIndex) => {
                          const { pixelX, pixelY } = percentToPixel(
                            point.x,
                            point.y,
                            stageSize.width,
                            stageSize.height,
                          )
                          const isSelectedVertex =
                            selectedVertex?.roomId === selectedRoom.id &&
                            selectedVertex.pointIndex === pointIndex

                          return (
                            <Circle
                              key={`${selectedRoom.id}-vertex-${pointIndex}`}
                              x={pixelX}
                              y={pixelY}
                              radius={7}
                              fill={isSelectedVertex ? '#ef4444' : '#ffffff'}
                              stroke="#2563eb"
                              strokeWidth={2}
                              draggable
                              onClick={() =>
                                setSelectedVertex({
                                  roomId: selectedRoom.id,
                                  pointIndex,
                                })
                              }
                              onDragEnd={(event) =>
                                updateVertex(
                                  selectedRoom.id,
                                  pointIndex,
                                  {
                                    x: clampPercent(
                                      (event.target.x() / stageSize.width) * 100,
                                    ),
                                    y: clampPercent(
                                      (event.target.y() / stageSize.height) * 100,
                                    ),
                                  },
                                )
                              }
                            />
                          )
                        })
                      : null}
                    {newRoomPoints.length > 0 ? (
                      <Line
                        points={flattenPolygon(
                          newRoomPoints,
                          stageSize.width,
                          stageSize.height,
                        )}
                        stroke="#10b981"
                        strokeWidth={2}
                        dash={[8, 8]}
                      />
                    ) : null}
                    {newRoomPoints.map((point, pointIndex) => {
                      const { pixelX, pixelY } = percentToPixel(
                        point.x,
                        point.y,
                        stageSize.width,
                        stageSize.height,
                      )

                      return (
                        <Circle
                          key={`new-room-${pointIndex}`}
                          x={pixelX}
                          y={pixelY}
                          radius={5}
                          fill="#10b981"
                        />
                      )
                    })}
                  </Layer>
                </Stage>
              </div>
            ) : (
              <div className="stage-empty">
                <Empty
                  description={
                    draftGeometry
                      ? 'Đang đo kích thước canvas'
                      : 'Chạy nhận diện để tạo bản nháp phòng'
                  }
                />
              </div>
            )}
          </div>
        </Spin>
      </Card>

      <Card title="Thông tin phòng" className="tool-card recognition-side-card">
        {selectedRoom ? (
          <Space orientation="vertical" size={14} className="full-width">
            <Form layout="vertical">
              <Form.Item label="Tên phòng">
                <Input
                  value={selectedRoom.name}
                  onChange={(event) =>
                    updateSelectedRoomField('name', event.target.value)
                  }
                />
              </Form.Item>
              <Form.Item label="Loại phòng">
                <Select
                  value={selectedRoom.type}
                  options={roomTypeOptions}
                  onChange={(value: RoomType) =>
                    updateSelectedRoomField('type', value)
                  }
                />
              </Form.Item>
            </Form>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={!draftGeometry || draftGeometry.rooms.length <= 1}
              onClick={deleteSelectedRoom}
            >
              Xoá phòng
            </Button>
            <Button
              disabled={!selectedVertex}
              icon={<DeleteOutlined />}
              onClick={deleteSelectedVertex}
            >
              Xoá đỉnh đang chọn
            </Button>
            <AntText type="secondary">
              Kéo đỉnh để chỉnh polygon. Nhấp đúp lên cạnh để thêm đỉnh.
            </AntText>
          </Space>
        ) : (
          <Empty description="Chọn một phòng trên sơ đồ" />
        )}
      </Card>
    </div>
  )
}
