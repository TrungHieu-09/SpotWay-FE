import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type Konva from 'konva'
import {
  Circle,
  Image as KonvaImage,
  Label,
  Layer,
  Line,
  Rect,
  Stage,
  Tag as KonvaTag,
  Text,
} from 'react-konva'
import {
  BuildOutlined,
  DeleteOutlined,
  LinkOutlined,
  NodeIndexOutlined,
  PushpinOutlined,
  SaveOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import {
  createGraphEdge,
  createGraphNode,
  analyzeNavigationDraft,
  applyNavigationDraft,
  deleteGraphEdge,
  deleteGraphNode,
  getGraph,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
  type NavigationDraft,
} from '../../api/graph'

export interface WallSegment {
  id: string
  floorId: string
  x1: number
  y1: number
  x2: number
  y2: number
}
import { useFloorStore } from '../../store/useFloorStore'
import type { FloorPublishStatus } from '../../types/floor'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'
import {
  analyzeFloorPlan,
  getLatestFloorPlanRevision,
  saveFloorPlanRevision,
} from '../../api/floorPlanAnalysis'
import { detectWallsFromFloorPlanImage } from '../../utils/wallDetection'

const { Text: AntText } = Typography

type ImageStatus = 'idle' | 'loading' | 'loaded' | 'failed'

function floorStatusColor(status: FloorPublishStatus) {
  return status === 'published' ? 'green' : 'gold'
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

function useElementSize<T extends HTMLElement>(isEnabled: boolean) {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!isEnabled || !element) {
      setSize({ width: 0, height: 0 })
      return
    }

    const updateSize = (entry: ResizeObserverEntry) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    }

    const observer = new ResizeObserver(([entry]) => updateSize(entry))
    observer.observe(element)

    const bounds = element.getBoundingClientRect()
    setSize({ width: Math.floor(bounds.width), height: Math.floor(bounds.height) })

    return () => observer.disconnect()
  }, [isEnabled])

  return [ref, size] as const
}

export function CanvasBoard() {
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>(
    Boolean(selectedFloor),
  )
  const pois = useFloorStore((state) => state.pois)
  const isPoiSaving = useFloorStore((state) => state.isPoiSaving)
  const error = useFloorStore((state) => state.error)
  const addPoi = useFloorStore((state) => state.addPoi)
  const movePoi = useFloorStore((state) => state.movePoi)
  const removePoi = useFloorStore((state) => state.removePoi)
  const selectedFloorId = selectedFloor?.id
  const [editorMode, setEditorMode] = useState<'poi' | 'node' | 'edge' | 'wall'>('node')
  const [nodeType, setNodeType] = useState<GraphNodeType>('NORMAL')
  const [nodeName, setNodeName] = useState('')
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [routeAnchorNodeId, setRouteAnchorNodeId] = useState<string>()
  const [walls, setWalls] = useState<WallSegment[]>([])
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null)
  const [previewPointer, setPreviewPointer] = useState<{ x: number; y: number } | null>(null)
  const [selectedWallId, setSelectedWallId] = useState<string>()
  const [isGraphSaving, setIsGraphSaving] = useState(false)
  const [isSavingWalls, setIsSavingWalls] = useState(false)
  const [graphError, setGraphError] = useState<string>()
  const [navigationDraft, setNavigationDraft] = useState<NavigationDraft>()
  const mapImageUrl = selectedFloor?.mapImageUrl?.trim() || null
  const mapImage = useImage(mapImageUrl)

  useEffect(() => {
    if (!selectedFloorId) {
      setNodes([])
      setEdges([])
      setWalls([])
      return
    }
    getGraph(selectedFloorId)
      .then(({ nodes: nextNodes, edges: nextEdges }) => {
        setNodes(nextNodes)
        setEdges(nextEdges)
        setEdgeStartNodeId(undefined)
        setSelectedNodeId(undefined)
        setRouteAnchorNodeId(undefined)
      })
      .catch((reason: Error) => setGraphError(reason.message))

    // Only a persisted server revision may initialize the editor.  Restoring
    // browser-local walls made a newly uploaded, unanalyzed plan look as if
    // it had already been processed by the AI.
    getLatestFloorPlanRevision(selectedFloorId)
      .then((revision) => {
        const draftWalls = revision?.editorState?.walls
        if (Array.isArray(draftWalls) && draftWalls.length > 0) {
          const loaded: WallSegment[] = draftWalls.map((w) => ({
            ...w,
            floorId: selectedFloorId,
          }))
          setWalls(loaded)
          return
        }
        setWalls([])
      })
      .catch(() => setWalls([]))

    setWallStart(null)
    setPreviewPointer(null)
    setSelectedWallId(undefined)
  }, [selectedFloorId])

  function saveWalls(nextWalls: WallSegment[]) {
    setWalls(nextWalls)
    if (selectedFloor) {
      try {
        localStorage.setItem(`spotway.walls.${selectedFloor.id}`, JSON.stringify(nextWalls))
      } catch {}
    }
  }

  function handleDeleteWall(wallId: string) {
    const next = walls.filter((w) => w.id !== wallId)
    saveWalls(next)
    if (selectedWallId === wallId) setSelectedWallId(undefined)
  }

  function handleClearWalls() {
    saveWalls([])
    setWallStart(null)
    setPreviewPointer(null)
    setSelectedWallId(undefined)
  }

  async function handleAutoExtractWallsFromImage() {
    if (!selectedFloor?.mapImageUrl) return
    setIsGraphSaving(true)
    setGraphError(undefined)
    try {
      let detectedWalls: WallSegment[] = []
      try {
        const revision = await analyzeFloorPlan(selectedFloor.id)
        if (revision.editorState.walls && revision.editorState.walls.length > 0) {
          detectedWalls = revision.editorState.walls.map((wall) => ({
            ...wall,
            floorId: selectedFloor.id,
          }))
        }
      } catch {
        // Fallback to client-side extraction using canvas image
      }

      if (detectedWalls.length === 0 && selectedFloor.mapImageUrl) {
        const clientWalls = await detectWallsFromFloorPlanImage(selectedFloor.mapImageUrl, selectedFloor.id)
        detectedWalls = clientWalls
      }

      if (detectedWalls.length > 0) {
        saveWalls(detectedWalls)
        message.success(`Đã tự động nhận diện và dựng ${detectedWalls.length} vách tường!`)
        // Auto-persist draft to backend revision
        try {
          await saveFloorPlanRevision(selectedFloor.id, { walls: detectedWalls })
        } catch {}
      } else {
        message.warning('Không tìm thấy vách tường rõ nét trên sơ đồ.')
      }
      setWallStart(null)
    } catch (reason) {
      setGraphError((reason as Error).message)
    } finally {
      setIsGraphSaving(false)
    }
  }

  async function handleAnalyzeNavigation() {
    if (!selectedFloor) return
    setIsGraphSaving(true); setGraphError(undefined)
    try {
      const draft = await analyzeNavigationDraft(selectedFloor.id)
      setNavigationDraft(draft)
      message.info(`Đã tạo ${draft.nodes.length} node và ${draft.edges.length} đường đi nháp. Hãy kiểm tra trước khi áp dụng.`)
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  async function handleApplyNavigationDraft() {
    if (!selectedFloor || !navigationDraft) return
    setIsGraphSaving(true)
    try {
      const result = await applyNavigationDraft(selectedFloor.id, navigationDraft)
      const graph = await getGraph(selectedFloor.id); setNodes(graph.nodes); setEdges(graph.edges); setNavigationDraft(undefined)
      message.success(`Đã áp dụng ${result.nodesCreated} Node và ${result.edgesCreated} đường đi.`)
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  function moveDraftNode(id: string, x: number, y: number) {
    setNavigationDraft((draft) => draft && { ...draft, nodes: draft.nodes.map((node) => node.id === id ? { ...node, x, y } : node) })
  }

  async function handleSaveWallsDraft() {
    if (!selectedFloor) return
    setIsSavingWalls(true)
    try {
      await saveFloorPlanRevision(selectedFloor.id, {
        walls,
        updatedAt: new Date().toISOString(),
      })
      message.success('Đã lưu bản vẽ vách tường thành công! Mô hình 3D sẽ tự động cập nhật.')
    } catch (err) {
      message.error((err as Error).message || 'Không thể lưu bản vẽ vách tường')
    } finally {
      setIsSavingWalls(false)
    }
  }

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

    if (editorMode === 'poi') {
      await addPoi({
        ...pixelToPercent(position.x, position.y, stageSize.width, stageSize.height),
        type: 'custom',
      })
      return
    }

    if (editorMode === 'wall') {
      const percentCoords = pixelToPercent(position.x, position.y, stageSize.width, stageSize.height)
      const roundedX = Math.round(percentCoords.x * 10) / 10
      const roundedY = Math.round(percentCoords.y * 10) / 10

      if (!wallStart) {
        setWallStart({ x: roundedX, y: roundedY })
      } else {
        if (wallStart.x !== roundedX || wallStart.y !== roundedY) {
          const newWall: WallSegment = {
            id: `wall_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            floorId: selectedFloor.id,
            x1: wallStart.x,
            y1: wallStart.y,
            x2: roundedX,
            y2: roundedY,
          }
          saveWalls([...walls, newWall])
          setWallStart({ x: roundedX, y: roundedY })
        }
      }
      return
    }

    if (editorMode !== 'node') return

    if (nodeType !== 'NORMAL' && !nodeName.trim()) {
      setGraphError('Nhập tên điểm trước khi tạo Node chức năng.')
      return
    }

    setIsGraphSaving(true)
    setGraphError(undefined)
    try {
      const node = await createGraphNode(selectedFloor.id, {
        x: (position.x / stageSize.width) * selectedFloor.mapWidth,
        y: (position.y / stageSize.height) * selectedFloor.mapHeight,
        name: nodeName.trim() || null,
        type: nodeType,
        accessible: true,
      })
      setNodes((current) => [...current, node])
      if (routeAnchorNodeId) {
        const edge = await createGraphEdge(selectedFloor.id, routeAnchorNodeId, node.id)
        setEdges((current) => [...current, edge])
      }
      setRouteAnchorNodeId(node.id)
      setSelectedNodeId(node.id)
      setNodeName('')
    } catch (reason) {
      setGraphError((reason as Error).message)
    } finally {
      setIsGraphSaving(false)
    }
  }

  function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    if (editorMode !== 'wall' || !wallStart) {
      if (previewPointer) setPreviewPointer(null)
      return
    }
    const stage = event.target.getStage()
    const pos = stage?.getPointerPosition()
    if (pos) {
      setPreviewPointer(pos)
    }
  }

  async function handleNodeClick(nodeId: string) {
    if (!selectedFloor) return

    if (editorMode === 'edge') {
      if (!edgeStartNodeId) {
        setEdgeStartNodeId(nodeId)
        return
      }
      if (edgeStartNodeId === nodeId) {
        setEdgeStartNodeId(undefined)
        return
      }
      setIsGraphSaving(true)
      setGraphError(undefined)
      try {
        const edge = await createGraphEdge(selectedFloor.id, edgeStartNodeId, nodeId)
        setEdges((current) => [...current, edge])
        setEdgeStartNodeId(undefined)
      } catch (reason) {
        setGraphError((reason as Error).message)
      } finally {
        setIsGraphSaving(false)
      }
      return
    }

    // In node/poi mode: toggle node selection
    setSelectedNodeId((current) => (current === nodeId ? undefined : nodeId))
  }

  async function handleDeleteNode(nodeId: string) {
    if (!selectedFloor) return
    setIsGraphSaving(true)
    setGraphError(undefined)
    try {
      await deleteGraphNode(nodeId)
      setNodes((current) => current.filter((n) => n.id !== nodeId))
      setEdges((current) => current.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId))
      if (selectedNodeId === nodeId) setSelectedNodeId(undefined)
      if (routeAnchorNodeId === nodeId) setRouteAnchorNodeId(undefined)
      if (edgeStartNodeId === nodeId) setEdgeStartNodeId(undefined)
    } catch (reason) {
      setGraphError((reason as Error).message)
    } finally {
      setIsGraphSaving(false)
    }
  }

  async function handleDeleteEdge(edgeId: string) {
    if (!selectedFloor) return
    setIsGraphSaving(true)
    setGraphError(undefined)
    try {
      await deleteGraphEdge(edgeId)
      setEdges((current) => current.filter((e) => e.id !== edgeId))
    } catch (reason) {
      setGraphError((reason as Error).message)
    } finally {
      setIsGraphSaving(false)
    }
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

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="canvas-workspace">
      <Card className="tool-card canvas-card">
        <div className="canvas-shell">
          <div className="canvas-toolbar">
            <div>
              <strong>{selectedFloor.name}</strong>
              <Tag color={floorStatusColor(selectedFloor.publishStatus)}>
                {selectedFloor.publishStatus}
              </Tag>
              <span>
                {selectedFloor.mapWidth} x {selectedFloor.mapHeight}
              </span>
            </div>
            <Space size="middle">
              <span>{nodes.length} Node</span>
              <span>{edges.length} Edge</span>
              <span>{pois.length} POI</span>
              <span>{walls.length} Tường</span>
            </Space>
          </div>

          <Space wrap style={{ padding: '0 16px 12px' }}>
            <Radio.Group
              value={editorMode}
              onChange={(event) => {
                setEditorMode(event.target.value)
                setEdgeStartNodeId(undefined)
                setWallStart(null)
                setPreviewPointer(null)
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="node">
                <NodeIndexOutlined /> Vẽ tuyến
              </Radio.Button>
              <Radio.Button value="edge">
                <LinkOutlined /> Edge
              </Radio.Button>
              <Radio.Button value="poi">
                <PushpinOutlined /> POI
              </Radio.Button>
              <Radio.Button value="wall">
                <BuildOutlined /> Vẽ tường 3D
              </Radio.Button>
            </Radio.Group>
            <Button icon={<ScanOutlined />} onClick={() => void handleAnalyzeNavigation()} loading={isGraphSaving} disabled={!selectedFloor.mapImageUrl}>
              Analyze điều hướng
            </Button>
            {navigationDraft && <>
              <Tag color="gold">Nháp: {navigationDraft.nodes.length} Node · {navigationDraft.edges.length} đường</Tag>
              <Button type="primary" onClick={() => void handleApplyNavigationDraft()} loading={isGraphSaving}>Áp dụng nháp</Button>
              <Button onClick={() => setNavigationDraft(undefined)}>Bỏ nháp</Button>
            </>}
            {editorMode === 'node' && (
              <>
                <Select
                  value={nodeType}
                  onChange={setNodeType}
                  style={{ width: 150 }}
                  options={[
                    { value: 'NORMAL', label: 'Lối đi' },
                    { value: 'JUNCTION', label: 'Giao lộ' },
                    { value: 'DOOR', label: 'Cửa ra vào' },
                    { value: 'ELEVATOR', label: 'Thang máy' },
                    { value: 'STAIR', label: 'Cầu thang bộ' },
                    { value: 'ESCALATOR', label: 'Thang cuốn' },
                    { value: 'EXIT', label: 'Cửa thoát hiểm' },
                    { value: 'EMERGENCY_EXIT', label: 'Thang thoát hiểm PCCC' },
                  ]}
                />
                <Input
                  value={nodeName}
                  onChange={(event) => setNodeName(event.target.value)}
                  placeholder="Tên điểm, ví dụ: Cửa vào Zara"
                  maxLength={100}
                  style={{ width: 230 }}
                />
              </>
            )}
            {editorMode === 'edge' && (
              <AntText type="secondary">
                {edgeStartNodeId
                  ? 'Chọn Node thứ hai để nối.'
                  : 'Chọn Node đầu tiên để nối.'}
              </AntText>
            )}
            {editorMode === 'node' && (
              <>
                <AntText type="secondary">
                  Click liên tiếp trên lối đi: Node mới tự nối với Node trước. Chuột phải vào Node để xóa nhanh.
                </AntText>
                <Button size="small" onClick={() => setRouteAnchorNodeId(undefined)}>
                  Bắt đầu tuyến mới
                </Button>
              </>
            )}
            {editorMode === 'wall' && (
              <>
                <AntText type="secondary">
                  {wallStart
                    ? `Đang vẽ từ (${Math.round(wallStart.x)}%, ${Math.round(wallStart.y)}%). Click điểm tiếp theo để tạo vách tường. Chuột phải để ngắt.`
                    : 'Click lên bản đồ để bắt đầu vách tường.'}
                </AntText>
                {wallStart && (
                  <Button
                    size="small"
                    onClick={() => {
                      setWallStart(null)
                      setPreviewPointer(null)
                    }}
                  >
                    Ngắt đoạn tường
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<ScanOutlined />}
                  onClick={() => void handleAutoExtractWallsFromImage()}
                  disabled={!selectedFloor.mapImageUrl}
                >
                  Quét vách tường từ ảnh
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => void handleSaveWallsDraft()}
                  loading={isSavingWalls}
                  disabled={walls.length === 0}
                >
                  Lưu vách tường (Save 3D)
                </Button>
                {walls.length > 0 && (
                  <Popconfirm
                    title="Xác nhận xóa toàn bộ tường của tầng này?"
                    onConfirm={handleClearWalls}
                    okText="Xóa tất cả"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      Xóa tất cả tường
                    </Button>
                  </Popconfirm>
                )}
              </>
            )}
          </Space>

          {/* Active Node Selection Action Bar */}
          {selectedNode && (
            <div
              style={{
                margin: '0 16px 12px',
                padding: '8px 12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Space>
                <Tag color="cyan">{selectedNode.type}</Tag>
                <AntText strong>Node #{selectedNode.id.slice(0, 8)}</AntText>
                <AntText type="secondary">
                  ({Math.round((selectedNode.x / selectedFloor.mapWidth) * 100)}%,{' '}
                  {Math.round((selectedNode.y / selectedFloor.mapHeight) * 100)}%)
                </AntText>
              </Space>
              <Space>
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => {
                    setEditorMode('edge')
                    setEdgeStartNodeId(selectedNode.id)
                  }}
                >
                  Nối Edge từ đây
                </Button>
                <Button
                  size="small"
                  onClick={() => setRouteAnchorNodeId(selectedNode.id)}
                >
                  Tiếp tục vẽ tuyến
                </Button>
                <Popconfirm
                  title="Xác nhận xóa Node này?"
                  description="Các lối đi (Edge) nối với Node này cũng sẽ bị xóa."
                  onConfirm={() => handleDeleteNode(selectedNode.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    Xóa Node
                  </Button>
                </Popconfirm>
                <Button size="small" onClick={() => setSelectedNodeId(undefined)}>
                  Bỏ chọn
                </Button>
              </Space>
            </div>
          )}

          {error || graphError ? (
            <Alert
              className="canvas-alert"
              message={error ?? graphError}
              type="error"
              showIcon
            />
          ) : null}

          <Spin spinning={isPoiSaving || isGraphSaving}>
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
                    onMouseMove={handleStageMouseMove}
                    onContextMenu={(e) => {
                      if (editorMode === 'wall') {
                        e.evt.preventDefault()
                        setWallStart(null)
                        setPreviewPointer(null)
                      }
                    }}
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

                      {/* 2D Architectural Partition Walls */}
                      {walls.map((wall) => {
                        const p1 = percentToPixel(wall.x1, wall.y1, stageSize.width, stageSize.height)
                        const p2 = percentToPixel(wall.x2, wall.y2, stageSize.width, stageSize.height)
                        const isSelected = selectedWallId === wall.id

                        return (
                          <React.Fragment key={wall.id}>
                            <Line
                              points={[p1.pixelX, p1.pixelY, p2.pixelX, p2.pixelY]}
                              stroke={isSelected ? '#f43f5e' : '#2563eb'}
                              strokeWidth={isSelected ? 8 : 6}
                              lineCap="round"
                              onClick={(e) => {
                                e.cancelBubble = true
                                setSelectedWallId((curr) => (curr === wall.id ? undefined : wall.id))
                              }}
                              onContextMenu={(e) => {
                                e.evt.preventDefault()
                                e.cancelBubble = true
                                handleDeleteWall(wall.id)
                              }}
                            />
                            <Circle
                              x={p1.pixelX}
                              y={p1.pixelY}
                              radius={isSelected ? 5 : 4}
                              fill={isSelected ? '#f43f5e' : '#3b82f6'}
                              stroke="#ffffff"
                              strokeWidth={1.5}
                              listening={false}
                            />
                            <Circle
                              x={p2.pixelX}
                              y={p2.pixelY}
                              radius={isSelected ? 5 : 4}
                              fill={isSelected ? '#f43f5e' : '#3b82f6'}
                              stroke="#ffffff"
                              strokeWidth={1.5}
                              listening={false}
                            />
                          </React.Fragment>
                        )
                      })}

                      {/* Dynamic Wall Drawing Preview Line */}
                      {wallStart && previewPointer && (
                        <Line
                          points={[
                            (wallStart.x / 100) * stageSize.width,
                            (wallStart.y / 100) * stageSize.height,
                            previewPointer.x,
                            previewPointer.y,
                          ]}
                          stroke="#60a5fa"
                          strokeWidth={4}
                          dash={[8, 5]}
                          lineCap="round"
                          listening={false}
                        />
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
                      {edges.map((edge) => {
                        const from = nodes.find((node) => node.id === edge.fromNodeId)
                        const to = nodes.find((node) => node.id === edge.toNodeId)
                        if (!from || !to) return null
                        const fromPoint = {
                          x: (from.x / selectedFloor.mapWidth) * stageSize.width,
                          y: (from.y / selectedFloor.mapHeight) * stageSize.height,
                        }
                        const toPoint = {
                          x: (to.x / selectedFloor.mapWidth) * stageSize.width,
                          y: (to.y / selectedFloor.mapHeight) * stageSize.height,
                        }
                        return (
                          <Line
                            key={edge.id}
                            points={[fromPoint.x, fromPoint.y, toPoint.x, toPoint.y]}
                            stroke={edge.status === 'BLOCKED' ? '#ef4444' : '#22d3ee'}
                            strokeWidth={5}
                            lineCap="round"
                            listening={false}
                          />
                        )
                      })}
                      {navigationDraft?.edges.map((edge) => {
                        const from = navigationDraft.nodes.find((node) => node.id === edge.fromNodeId); const to = navigationDraft.nodes.find((node) => node.id === edge.toNodeId)
                        if (!from || !to) return null
                        return <Line key={edge.id} points={[from.x / selectedFloor.mapWidth * stageSize.width, from.y / selectedFloor.mapHeight * stageSize.height, to.x / selectedFloor.mapWidth * stageSize.width, to.y / selectedFloor.mapHeight * stageSize.height]} stroke="#f59e0b" dash={[8, 6]} strokeWidth={3} listening={false} />
                      })}
                      {nodes.map((node) => {
                        const x = (node.x / selectedFloor.mapWidth) * stageSize.width
                        const y = (node.y / selectedFloor.mapHeight) * stageSize.height
                        const isPendingEdgeStart = edgeStartNodeId === node.id
                        const isSelected = selectedNodeId === node.id

                        return (
                          <React.Fragment key={node.id}>
                            {isSelected && (
                              <Circle
                                x={x}
                                y={y}
                                radius={19}
                                stroke="#0284c7"
                                strokeWidth={3}
                                dash={[4, 3]}
                                listening={false}
                              />
                            )}
                            <Circle
                              x={x}
                              y={y}
                              radius={isPendingEdgeStart || isSelected ? 15 : 11}
                              fill={
                                node.type === 'ELEVATOR'
                                  ? '#a855f7'
                                  : node.type === 'DOOR'
                                    ? '#f59e0b'
                                    : node.type === 'EXIT' || node.type === 'EMERGENCY_EXIT'
                                      ? '#10b981'
                                      : '#0ea5e9'
                              }
                              stroke="#ffffff"
                              strokeWidth={isPendingEdgeStart || isSelected ? 4 : 3}
                              onClick={(event) => {
                                event.cancelBubble = true
                                void handleNodeClick(node.id)
                              }}
                              onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container()
                                if (container) container.style.cursor = 'pointer'
                              }}
                              onMouseLeave={(e) => {
                                const container = e.target.getStage()?.container()
                                if (container) container.style.cursor = 'default'
                              }}
                              onContextMenu={(event) => {
                                event.evt.preventDefault()
                                event.cancelBubble = true
                                void handleDeleteNode(node.id)
                              }}
                            />
                          </React.Fragment>
                        )
                      })}
                      {navigationDraft?.nodes.map((node) => <Circle key={node.id} x={node.x / selectedFloor.mapWidth * stageSize.width} y={node.y / selectedFloor.mapHeight * stageSize.height} radius={10} fill="#facc15" stroke="#854d0e" strokeWidth={2} draggable onDragEnd={(event) => moveDraftNode(node.id, event.target.x() / stageSize.width * selectedFloor.mapWidth, event.target.y() / stageSize.height * selectedFloor.mapHeight)} />)}
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

          {selectedFloor.publishStatus === 'draft' ? (
            <Typography.Paragraph
              style={{ margin: '8px 16px', fontSize: 12 }}
              type="secondary"
            >
              Tầng này đang ở chế độ nháp, chưa hiển thị cho Guest.
            </Typography.Paragraph>
          ) : null}
        </div>
      </Card>

      {/* Multi-Tab Sidebar: Nodes, Edges, POIs */}
      <Card
        className="tool-card poi-card"
        styles={{ body: { padding: '12px 14px' } }}
      >
        <Tabs
          defaultActiveKey="nodes"
          items={[
            {
              key: 'nodes',
              label: `Node (${nodes.length})`,
              children: (
                <List
                  size="small"
                  dataSource={nodes}
                  locale={{ emptyText: 'Chưa có Node. Click lên bản đồ để thêm' }}
                  style={{ maxHeight: 520, overflowY: 'auto' }}
                  renderItem={(node) => (
                    <List.Item
                      style={{
                        padding: '6px 8px',
                        background: selectedNodeId === node.id ? '#f0f9ff' : undefined,
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedNodeId((curr) => (curr === node.id ? undefined : node.id))}
                      actions={[
                        <div key="delete" onClick={(e) => e.stopPropagation()}>
                          <Popconfirm
                            title="Xác nhận xóa Node?"
                            onConfirm={() => void handleDeleteNode(node.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              danger
                              size="small"
                              type="text"
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </div>,
                      ]}
                    >
                      <Space orientation="vertical" size={1}>
                        <Space>
                          <Tag
                            color={
                              node.type === 'ELEVATOR'
                                ? 'purple'
                                : node.type === 'DOOR'
                                  ? 'orange'
                                  : node.type === 'EXIT' || node.type === 'EMERGENCY_EXIT'
                                    ? 'green'
                                    : 'cyan'
                            }
                          >
                            {node.type}
                          </Tag>
                          <AntText strong style={{ fontSize: 12 }}>
                            #{node.id.slice(0, 6)}
                          </AntText>
                        </Space>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          {Math.round((node.x / selectedFloor.mapWidth) * 100)}%,{' '}
                          {Math.round((node.y / selectedFloor.mapHeight) * 100)}%
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'edges',
              label: `Edge (${edges.length})`,
              children: (
                <List
                  size="small"
                  dataSource={edges}
                  locale={{ emptyText: 'Chưa có Edge. Nối 2 Node ở chế độ Edge' }}
                  style={{ maxHeight: 520, overflowY: 'auto' }}
                  renderItem={(edge) => (
                    <List.Item
                      style={{ padding: '6px 8px' }}
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="Xác nhận xóa Edge?"
                          onConfirm={() => void handleDeleteEdge(edge.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            danger
                            size="small"
                            type="text"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <Space orientation="vertical" size={1}>
                        <AntText style={{ fontSize: 12 }}>
                          #{edge.fromNodeId.slice(0, 5)} → #{edge.toNodeId.slice(0, 5)}
                        </AntText>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          Khoảng cách: {Math.round(edge.weight)}px
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'pois',
              label: `POI (${pois.length})`,
              children: (
                <List
                  size="small"
                  dataSource={pois}
                  locale={{ emptyText: 'Chuyển sang chế độ POI để thêm' }}
                  style={{ maxHeight: 520, overflowY: 'auto' }}
                  renderItem={(poi) => (
                    <List.Item
                      style={{ padding: '6px 8px' }}
                      actions={[
                        <Button
                          key="delete"
                          danger
                          size="small"
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => removePoi(poi.id)}
                        />,
                      ]}
                    >
                      <Space orientation="vertical" size={1}>
                        <Space>
                          <AntText strong style={{ fontSize: 12 }}>
                            {poi.name}
                          </AntText>
                          <Tag color="blue">{poi.type}</Tag>
                        </Space>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          {poi.x.toFixed(1)}%, {poi.y.toFixed(1)}%
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'walls',
              label: `Tường (${walls.length})`,
              children: (
                <List
                  size="small"
                  dataSource={walls}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '16px 0', textAlign: 'center' }}>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                          Chưa có vách tường nào.
                        </p>
                        <Button
                          size="small"
                          type="link"
                          icon={<ScanOutlined />}
                          onClick={() => void handleAutoExtractWallsFromImage()}
                          disabled={!selectedFloor.mapImageUrl}
                          style={{ marginTop: 4, padding: 0 }}
                        >
                          Quét vách tường từ ảnh sơ đồ
                        </Button>
                      </div>
                    ),
                  }}
                  style={{ maxHeight: 520, overflowY: 'auto' }}
                  renderItem={(wall, idx) => (
                    <List.Item
                      style={{
                        padding: '6px 8px',
                        background: selectedWallId === wall.id ? '#f0f9ff' : undefined,
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedWallId((curr) => (curr === wall.id ? undefined : wall.id))}
                      actions={[
                        <div key="delete" onClick={(e) => e.stopPropagation()}>
                          <Popconfirm
                            title="Xác nhận xóa vách tường này?"
                            onConfirm={() => handleDeleteWall(wall.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              danger
                              size="small"
                              type="text"
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </div>,
                      ]}
                    >
                      <Space orientation="vertical" size={1}>
                        <Space>
                          <Tag color="geekblue">Vách #{idx + 1}</Tag>
                          <AntText strong style={{ fontSize: 12 }}>
                            ({Math.round(wall.x1)}%, {Math.round(wall.y1)}%) → ({Math.round(wall.x2)}%, {Math.round(wall.y2)}%)
                          </AntText>
                        </Space>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          Dài ~{Math.round(Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1))}% ảnh · Tự extrude sang 3D
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
