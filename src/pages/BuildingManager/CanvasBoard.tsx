import { useEffect, useMemo, useRef, useState } from 'react'
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
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { Stage } from 'react-konva'
import {
  BuildOutlined,
  DeleteOutlined,
  LinkOutlined,
  LoadingOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  PushpinOutlined,
  SaveOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { analyzeNavigationDraft, applyNavigationDraft } from '../../api/graphGateway'
import { buildCorridorDraft } from '../../utils/navigationDraft'

export interface WallSegment {
  id: string
  floorId: string
  x1: number
  y1: number
  x2: number
  y2: number
}
import { useFloorStore } from '../../store/useFloorStore'
import { useGraphStore } from '../../store/useGraphStore'
import { usePoiStore } from '../../store/usePoiStore'
import { ConnectorFormModal } from '../../components/canvas/ConnectorFormModal'
import { CONNECTOR_STYLE, ConnectorsLayer } from '../../components/canvas/ConnectorsLayer'
import { GraphEdgesLayer } from '../../components/canvas/GraphEdgesLayer'
import { GraphNodesLayer } from '../../components/canvas/GraphNodesLayer'
import { MapBackgroundLayer } from '../../components/canvas/MapBackgroundLayer'
import { PoiEditPopover } from '../../components/canvas/PoiEditPopover'
import { PoiMarkersLayer } from '../../components/canvas/PoiMarkersLayer'
import { WallsLayer } from '../../components/canvas/WallsLayer'
import { useCanvasTool } from '../../hooks/useCanvasTool'
import { useElementSize } from '../../hooks/useElementSize'
import { useImage } from '../../hooks/useImage'
import type { FloorPublishStatus } from '../../types/floor'
import type { PercentPoint } from '../../types/geometry'
import type { Connector, GraphDraft, GraphEdge, GraphNode } from '../../types/graph'
import type { Poi } from '../../types/poi'
import { distanceInMapUnits, findIsolatedNodeIds } from '../../utils/graphGeometry'

const EMPTY_NODES: GraphNode[] = []
const EMPTY_EDGES: GraphEdge[] = []
const EMPTY_POIS: Poi[] = []
const EMPTY_CONNECTORS: Connector[] = []
import {
  analyzeFloorPlan,
  getLatestFloorPlanRevision,
  saveFloorPlanRevision,
} from '../../api/floorPlanAnalysis'
import { detectWallsFromFloorPlanImage } from '../../utils/wallDetection'

const { Text: AntText } = Typography

const makeLocalId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

function floorStatusColor(status: FloorPublishStatus) {
  return status === 'published' ? 'green' : 'gold'
}

export function CanvasBoard() {
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>(
    Boolean(selectedFloor),
  )
  const error = useFloorStore((state) => state.error)
  const selectedFloorId = selectedFloor?.id
  const [walls, setWalls] = useState<WallSegment[]>([])
  const [selectedWallId, setSelectedWallId] = useState<string>()
  const [isGraphSaving, setIsGraphSaving] = useState(false)
  const [isSavingWalls, setIsSavingWalls] = useState(false)
  const [graphError, setGraphError] = useState<string>()
  const [navigationDraft, setNavigationDraft] = useState<GraphDraft>()
  const floorIdRef = useRef(selectedFloorId)
  const mapWidth = selectedFloor?.mapWidth
  const mapHeight = selectedFloor?.mapHeight

  // Graph (node/edge/selection/optimistic) nằm trong useGraphStore
  const currentFloorNodes = useGraphStore((state) => (selectedFloorId && state.nodesByFloor[selectedFloorId]) || EMPTY_NODES)
  const currentFloorEdges = useGraphStore((state) => (selectedFloorId && state.edgesByFloor[selectedFloorId]) || EMPTY_EDGES)
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const pendingOps = useGraphStore((state) => state.pendingOps)
  const graphStoreError = useGraphStore((state) => state.error)
  const loadFloorGraph = useGraphStore((state) => state.loadFloorGraph)
  const clearFloor = useGraphStore((state) => state.clearFloor)
  const deleteEdge = useGraphStore((state) => state.deleteEdge)
  const selectNode = useGraphStore((state) => state.selectNode)
  const buildingId = selectedFloor?.buildingId
  const connectors = useGraphStore((state) => (buildingId && state.connectorsByBuilding[buildingId]) || EMPTY_CONNECTORS)
  const loadConnectors = useGraphStore((state) => state.loadConnectors)
  const clearConnectors = useGraphStore((state) => state.clearConnectors)
  const createConnector = useGraphStore((state) => state.createConnector)
  const deleteConnector = useGraphStore((state) => state.deleteConnector)
  const [connectorModalOpen, setConnectorModalOpen] = useState(false)
  const floors = useFloorStore((state) => state.floors)
  const [editingPoiId, setEditingPoiId] = useState<string>()

  // POI là entity riêng trong usePoiStore (tự snap vào node gần nhất khi tạo/kéo)
  const pois = usePoiStore((state) => (selectedFloorId && state.poisByFloor[selectedFloorId]) || EMPTY_POIS)
  const poiPendingOps = usePoiStore((state) => state.pendingOps)
  const poiStoreError = usePoiStore((state) => state.error)
  const loadFloorPois = usePoiStore((state) => state.loadFloorPois)
  const clearPoiFloor = usePoiStore((state) => state.clearFloor)
  const createPoi = usePoiStore((state) => state.createPoi)
  const movePoi = usePoiStore((state) => state.movePoi)
  const deletePoi = usePoiStore((state) => state.deletePoi)
  const updatePoiDetails = usePoiStore((state) => state.updatePoiDetails)
  const mapImageUrl = selectedFloor?.mapImageUrl?.trim() || null
  const mapImage = useImage(mapImageUrl)

  // Graph nằm trong useGraphStore theo tầng; rời tầng thì dọn để dữ liệu không lọt sang tầng khác
  useEffect(() => {
    if (!selectedFloorId || !mapWidth || !mapHeight) return
    void loadFloorGraph(selectedFloorId, { width: mapWidth, height: mapHeight })
    return () => clearFloor(selectedFloorId)
  }, [selectedFloorId, mapWidth, mapHeight, loadFloorGraph, clearFloor])

  useEffect(() => {
    if (!selectedFloorId || !mapWidth || !mapHeight) return
    void loadFloorPois(selectedFloorId, { width: mapWidth, height: mapHeight })
    return () => clearPoiFloor(selectedFloorId)
  }, [selectedFloorId, mapWidth, mapHeight, loadFloorPois, clearPoiFloor])

  // Connector theo toà nhà (đổi tầng trong cùng toà không cần nạp lại)
  useEffect(() => {
    if (!buildingId) return
    void loadConnectors(buildingId)
    return () => clearConnectors(buildingId)
  }, [buildingId, loadConnectors, clearConnectors])

  useEffect(() => {
    if (graphStoreError) message.error(graphStoreError)
  }, [graphStoreError])

  useEffect(() => {
    if (poiStoreError) message.error(poiStoreError)
  }, [poiStoreError])

  useEffect(() => {
    floorIdRef.current = selectedFloorId
    setWalls([])
    setNavigationDraft(undefined)
    setGraphError(undefined)
    setSelectedWallId(undefined)
    if (!selectedFloorId) return

    // Only a persisted server revision may initialize the editor.  Restoring
    // browser-local walls made a newly uploaded, unanalyzed plan look as if
    // it had already been processed by the AI.
    let cancelled = false
    getLatestFloorPlanRevision(selectedFloorId)
      .then((revision) => {
        if (cancelled) return
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
      .catch(() => {
        if (!cancelled) setWalls([])
      })

    return () => {
      cancelled = true
    }
  }, [selectedFloorId])

  function saveWalls(nextWalls: WallSegment[]) {
    setWalls(nextWalls)
    if (selectedFloor) {
      try {
        localStorage.setItem(`spotway.walls.${selectedFloor.id}`, JSON.stringify(nextWalls))
      } catch {}
    }
  }

  const handleMovePoi = (poiId: string, to: PercentPoint) => {
    if (selectedFloorId) movePoi(selectedFloorId, poiId, to)
  }

  const toggleWallSelection = (wallId: string) =>
    setSelectedWallId((current) => (current === wallId ? undefined : wallId))

  function handleDeleteWall(wallId: string) {
    const next = walls.filter((w) => w.id !== wallId)
    saveWalls(next)
    if (selectedWallId === wallId) setSelectedWallId(undefined)
  }

  function handleClearWalls() {
    saveWalls([])
    tool.cancelWall()
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
      tool.cancelWall()
    } catch (reason) {
      setGraphError((reason as Error).message)
    } finally {
      setIsGraphSaving(false)
    }
  }

  async function handleAnalyzeNavigation() {
    if (!selectedFloor) return
    const floor = selectedFloor
    const size = { width: floor.mapWidth, height: floor.mapHeight }
    setIsGraphSaving(true); setGraphError(undefined)
    try {
      const draft = await analyzeNavigationDraft(floor.id, size)
      if (floorIdRef.current !== floor.id) return
      if (draft.nodes.length === 0) {
        setNavigationDraft(buildCorridorDraft(draft.warnings))
        message.warning('AI không nhận diện được node nào. Đã tạo bản nháp mẫu dọc hành lang — hãy kéo các điểm vàng cho khớp sơ đồ rồi bấm Áp dụng nháp.', 6)
        return
      }
      setNavigationDraft(draft)
      message.info(`Đã tạo ${draft.nodes.length} node và ${draft.edges.length} đường đi nháp. Hãy kiểm tra trước khi áp dụng.`)
    } catch (reason) {
      if (floorIdRef.current !== floor.id) return
      setNavigationDraft(buildCorridorDraft())
      message.warning(`Analyze điều hướng chưa trả về node (${(reason as Error).message}). Đã tạo bản nháp mẫu dọc hành lang để bạn chỉnh sửa ngay.`, 6)
    } finally { setIsGraphSaving(false) }
  }
  async function handleApplyNavigationDraft() {
    if (!selectedFloor || !navigationDraft) return
    const floorId = selectedFloor.id
    const size = { width: selectedFloor.mapWidth, height: selectedFloor.mapHeight }
    setIsGraphSaving(true)
    try {
      const result = await applyNavigationDraft(floorId, size, navigationDraft)
      await loadFloorGraph(floorId, size)
      if (floorIdRef.current !== floorId) return
      setNavigationDraft(undefined)
      message.success(`Đã áp dụng ${result.nodesCreated} Node và ${result.edgesCreated} đường đi.`)
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  function moveDraftNode(id: string, to: PercentPoint) {
    setNavigationDraft((draft) => draft && { ...draft, nodes: draft.nodes.map((node) => node.id === id ? { ...node, ...to } : node) })
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

  const tool = useCanvasTool({
    floorId: selectedFloorId,
    stageSize,
    onAddPoi: (at) => {
      if (selectedFloorId) createPoi(selectedFloorId, { ...at, name: `POI ${pois.length + 1}`, category: 'custom', icon: null })
    },
    onAddWall: (from, to) => {
      if (!selectedFloorId) return
      saveWalls([
        ...walls,
        { id: makeLocalId('wall'), floorId: selectedFloorId, x1: from.x, y1: from.y, x2: to.x, y2: to.y },
      ])
    },
    onError: setGraphError,
  })

  const nodeById = useMemo(() => new Map(currentFloorNodes.map((node) => [node.id, node])), [currentFloorNodes])
  const draftNodeById = useMemo(
    () => new Map((navigationDraft?.nodes ?? []).map((node) => [node.id, node])),
    [navigationDraft],
  )
  // Một node lẻ loi là bình thường (mới đặt); từ 2 node trở lên, node chưa nối edge sẽ bị tô đỏ.
  const isolatedNodeIds = useMemo(
    () => (currentFloorNodes.length > 1 ? findIsolatedNodeIds(currentFloorNodes, currentFloorEdges) : undefined),
    [currentFloorNodes, currentFloorEdges],
  )

  if (!selectedFloor) {
    return (
      <Card className="tool-card canvas-card">
        <div className="canvas-shell canvas-shell-empty">
          <Empty description="Chọn building và tầng" />
        </div>
      </Card>
    )
  }

  function handleDeleteEdge(edgeId: string) {
    if (selectedFloor) deleteEdge(selectedFloor.id, edgeId)
  }

  /** Độ dài edge theo đơn vị pixel ảnh sơ đồ (chỉ để hiển thị; weight không lưu ở FE). */
  function edgeLength(edge: GraphEdge) {
    const from = nodeById.get(edge.fromNodeId)
    const to = nodeById.get(edge.toNodeId)
    return from && to ? distanceInMapUnits(from, to, { width: selectedFloor!.mapWidth, height: selectedFloor!.mapHeight }) : 0
  }

  const floorConnectors = connectors.filter((connector) => connector.stops.some((stop) => stop.floorId === selectedFloor.id))
  const floorNameById = new Map(floors.map((floor) => [floor.id, floor.name]))
  const editingPoi = pois.find((poi) => poi.id === editingPoiId)
  const selectedNode = currentFloorNodes.find((n) => n.id === selectedNodeId)

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
              {(pendingOps > 0 || poiPendingOps > 0 || isGraphSaving) && (
                <Tag icon={<LoadingOutlined spin />} color="processing">
                  Đang lưu...
                </Tag>
              )}
              <span>{currentFloorNodes.length} Node</span>
              <span>{currentFloorEdges.length} Edge</span>
              <span>{pois.length} POI</span>
              <span>{walls.length} Tường</span>
            </Space>
          </div>

          <Space wrap style={{ padding: '0 16px 12px' }}>
            <Radio.Group
              value={tool.mode}
              onChange={(event) => tool.changeMode(event.target.value)}
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
              {navigationDraft.warnings.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ width: '100%' }}
                  message="Cảnh báo từ Analyze điều hướng"
                  description={<ul style={{ margin: 0, paddingLeft: 18 }}>{navigationDraft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                />
              )}
              <Tag color="gold">Nháp: {navigationDraft.nodes.length} Node · {navigationDraft.edges.length} đường</Tag>
              <Button type="primary" onClick={() => void handleApplyNavigationDraft()} loading={isGraphSaving}>Áp dụng nháp</Button>
              <Button onClick={() => setNavigationDraft(undefined)}>Bỏ nháp</Button>
            </>}
            {tool.mode === 'node' && (
              <>
                <Select
                  value={tool.nodeType}
                  onChange={tool.setNodeType}
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
                  value={tool.nodeName}
                  onChange={(event) => tool.setNodeName(event.target.value)}
                  placeholder="Tên điểm, ví dụ: Cửa vào Zara"
                  maxLength={100}
                  style={{ width: 230 }}
                />
              </>
            )}
            {tool.mode === 'edge' && (
              <AntText type="secondary">
                {tool.edgeStartNodeId
                  ? 'Chọn Node thứ hai để nối.'
                  : 'Chọn Node đầu tiên để nối.'}
              </AntText>
            )}
            {tool.mode === 'node' && (
              <>
                <AntText type="secondary">
                  Click liên tiếp trên lối đi: Node mới tự nối với Node trước. Chuột phải vào Node để xóa nhanh.
                </AntText>
                <Button size="small" onClick={() => tool.setRouteAnchorNodeId(undefined)}>
                  Bắt đầu tuyến mới
                </Button>
              </>
            )}
            {tool.mode === 'wall' && (
              <>
                <AntText type="secondary">
                  {tool.wallStart
                    ? `Đang vẽ từ (${Math.round(tool.wallStart.x)}%, ${Math.round(tool.wallStart.y)}%). Click điểm tiếp theo để tạo vách tường. Chuột phải để ngắt.`
                    : 'Click lên bản đồ để bắt đầu vách tường.'}
                </AntText>
                {tool.wallStart && (
                  <Button
                    size="small"
                    onClick={tool.cancelWall}
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
                  ({Math.round(selectedNode.x)}%, {Math.round(selectedNode.y)}%)
                </AntText>
              </Space>
              <Space>
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => tool.startEdgeFrom(selectedNode.id)}
                >
                  Nối Edge từ đây
                </Button>
                <Button
                  size="small"
                  onClick={() => tool.setRouteAnchorNodeId(selectedNode.id)}
                >
                  Tiếp tục vẽ tuyến
                </Button>
                <Popconfirm
                  title="Xác nhận xóa Node này?"
                  description="Các lối đi (Edge) nối với Node này cũng sẽ bị xóa."
                  onConfirm={() => tool.handleNodeDelete(selectedNode.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    Xóa Node
                  </Button>
                </Popconfirm>
                <Button size="small" onClick={() => selectNode(null)}>
                  Bỏ chọn
                </Button>
              </Space>
            </div>
          )}

          {error || graphError ? (
            <Alert
              className="canvas-alert"
              message={error ?? graphError ?? graphStoreError ?? poiStoreError}
              type="error"
              showIcon
            />
          ) : null}

            <div className="stage-host" ref={stageHostRef}>
              {canRenderStage ? (
                <div
                  className="stage-wrap"
                  style={{ width: stageSize.width, height: stageSize.height, position: 'relative' }}
                >
                  <Stage
                    width={stageSize.width}
                    height={stageSize.height}
                    onClick={tool.handleStageClick}
                    onMouseMove={tool.handleStageMouseMove}
                    onContextMenu={tool.handleStageContextMenu}
                  >
                    <MapBackgroundLayer image={mapImage.image} status={mapImage.status} size={stageSize} />
                    <WallsLayer
                      walls={walls}
                      selectedWallId={selectedWallId}
                      draft={tool.wallDraft}
                      size={stageSize}
                      onToggleSelect={toggleWallSelection}
                      onDelete={handleDeleteWall}
                    />
                    <GraphEdgesLayer
                      edges={currentFloorEdges}
                      nodeById={nodeById}
                      draftEdges={navigationDraft?.edges}
                      draftNodeById={draftNodeById}
                      size={stageSize}
                    />
                    <ConnectorsLayer floorId={selectedFloor.id} connectors={connectors} nodeById={nodeById} size={stageSize} />
                    <GraphNodesLayer
                      nodes={currentFloorNodes}
                      selectedNodeId={selectedNodeId}
                      edgeStartNodeId={tool.edgeStartNodeId}
                      isolatedNodeIds={isolatedNodeIds}
                      draftNodes={navigationDraft?.nodes}
                      size={stageSize}
                      onNodeClick={tool.handleNodeClick}
                      onNodeDelete={tool.handleNodeDelete}
                      onDraftNodeMove={moveDraftNode}
                    />
                    <PoiMarkersLayer pois={pois} nodes={currentFloorNodes} size={stageSize} selectedPoiId={editingPoiId} onMove={handleMovePoi} onSelect={setEditingPoiId} />
                  </Stage>
                  {editingPoi && (
                    <PoiEditPopover
                      poi={editingPoi}
                      size={stageSize}
                      onSave={(patch) => updatePoiDetails(selectedFloor.id, editingPoi.id, patch)}
                      onDelete={() => {
                        deletePoi(selectedFloor.id, editingPoi.id)
                        setEditingPoiId(undefined)
                      }}
                      onClose={() => setEditingPoiId(undefined)}
                    />
                  )}
                </div>
              ) : (
                <div className="stage-empty">
                  <Empty description="Đang đo kích thước canvas" />
                </div>
              )}
            </div>

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
              label: `Node (${currentFloorNodes.length})`,
              children: (
                <List
                  size="small"
                  dataSource={currentFloorNodes}
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
                      onClick={() => selectNode(selectedNodeId === node.id ? null : node.id)}
                      actions={[
                        <div key="delete" onClick={(e) => e.stopPropagation()}>
                          <Popconfirm
                            title="Xác nhận xóa Node?"
                            onConfirm={() => tool.handleNodeDelete(node.id)}
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
                          {isolatedNodeIds?.has(node.id) && <Tag color="error">Chưa nối Edge</Tag>}
                        </Space>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          {Math.round(node.x)}%, {Math.round(node.y)}%
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'edges',
              label: `Edge (${currentFloorEdges.length})`,
              children: (
                <List
                  size="small"
                  dataSource={currentFloorEdges}
                  locale={{ emptyText: 'Chưa có Edge. Nối 2 Node ở chế độ Edge' }}
                  style={{ maxHeight: 520, overflowY: 'auto' }}
                  renderItem={(edge) => (
                    <List.Item
                      style={{ padding: '6px 8px' }}
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="Xác nhận xóa Edge?"
                          onConfirm={() => handleDeleteEdge(edge.id)}
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
                          Khoảng cách: {Math.round(edgeLength(edge))}px bản đồ
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'connectors',
              label: `Connector (${floorConnectors.length})`,
              children: (
                <>
                <Button
                  size="small"
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  style={{ marginBottom: 8 }}
                  onClick={() => setConnectorModalOpen(true)}
                >
                  Tạo connector
                </Button>
                <List
                  size="small"
                  dataSource={floorConnectors}
                  locale={{ emptyText: 'Tầng này chưa có thang máy/cầu thang liên kết tầng khác' }}
                  style={{ maxHeight: 520, overflowY: 'auto' }}
                  renderItem={(connector) => (
                    <List.Item
                      style={{ padding: '6px 8px' }}
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="Xóa connector này?"
                          description="Các node vẫn giữ nguyên, chỉ gỡ liên kết giữa các tầng."
                          onConfirm={() => buildingId && deleteConnector(buildingId, connector.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                        </Popconfirm>,
                      ]}
                    >
                      <Space orientation="vertical" size={1}>
                        <Space>
                          <Tag color={CONNECTOR_STYLE[connector.kind].color}>{CONNECTOR_STYLE[connector.kind].label}</Tag>
                          <AntText strong style={{ fontSize: 12 }}>
                            {connector.name}
                          </AntText>
                          {!connector.accessible && <Tag>Không xe lăn</Tag>}
                        </Space>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          Nối: {connector.stops.map((stop) => floorNameById.get(stop.floorId) ?? '?').join(' ↔ ')}
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
                </>
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
                          onClick={() => deletePoi(selectedFloor.id, poi.id)}
                        />,
                      ]}
                    >
                      <Space orientation="vertical" size={1}>
                        <Space>
                          <AntText strong style={{ fontSize: 12 }}>
                            {poi.name}
                          </AntText>
                          <Tag color="blue">{poi.category}</Tag>
                          {!poi.nearestNodeId && <Tag color="warning">Chưa gắn Node</Tag>}
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
      <ConnectorFormModal
        open={connectorModalOpen}
        floors={floors}
        defaultFloorId={selectedFloor.id}
        onSubmit={(input) => (buildingId ? createConnector(buildingId, input) : Promise.resolve(false))}
        onClose={() => setConnectorModalOpen(false)}
      />
    </div>
  )
}
