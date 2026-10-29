import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import { Stage } from 'react-konva'
import {
  ColumnWidthOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  LoadingOutlined,
  NodeIndexOutlined,
  PushpinOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { analyzeNavigationDraft, applyNavigationDraft } from '../../api/graphGateway'
import { positionToDto } from '../../api/graphMapper'
import { buildCorridorDraft } from '../../utils/navigationDraft'

import { useFloorStore } from '../../store/useFloorStore'
import { useGraphStore } from '../../store/useGraphStore'
import { usePoiStore } from '../../store/usePoiStore'
import { CanvasSidebar } from './CanvasSidebar'
import { CalibrationDistanceModal } from '../../components/canvas/CalibrationDistanceModal'
import { CalibrationLayer } from '../../components/canvas/CalibrationLayer'
import { ConnectorSuggestModal } from '../../components/canvas/ConnectorSuggestModal'
import { ConnectorFormModal } from '../../components/canvas/ConnectorFormModal'
import { ConnectorsLayer } from '../../components/canvas/ConnectorsLayer'
import { GraphEdgesLayer } from '../../components/canvas/GraphEdgesLayer'
import { GraphNodesLayer } from '../../components/canvas/GraphNodesLayer'
import { MapBackgroundLayer } from '../../components/canvas/MapBackgroundLayer'
import { PoiEditPopover } from '../../components/canvas/PoiEditPopover'
import { PoiMarkersLayer } from '../../components/canvas/PoiMarkersLayer'
import { useCanvasTool } from '../../hooks/useCanvasTool'
import { useWallMask } from '../../hooks/useWallMask'
import { useElementSize } from '../../hooks/useElementSize'
import { useImage } from '../../hooks/useImage'
import type { FloorPublishStatus } from '../../types/floor'
import type { PercentPoint } from '../../types/geometry'
import type { Connector, GraphDraft, GraphEdge, GraphNode } from '../../types/graph'
import type { Poi } from '../../types/poi'
import { distanceInMapUnits, findIsolatedNodeIds } from '../../utils/graphGeometry'
import { suggestEdges, type EdgeSuggestion } from '../../utils/graphSuggestions'
import { findWallCrossingEdgeIds, segmentCrossesWall } from '../../utils/wallMask'

const EMPTY_NODES: GraphNode[] = []
const EMPTY_EDGES: GraphEdge[] = []
const EMPTY_POIS: Poi[] = []
const EMPTY_CONNECTORS: Connector[] = []
const { Text: AntText } = Typography

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
  const [isGraphSaving, setIsGraphSaving] = useState(false)
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
  const deleteAllNodes = useGraphStore((state) => state.deleteAllNodes)
  const selectNode = useGraphStore((state) => state.selectNode)
  const buildingId = selectedFloor?.buildingId
  const connectors = useGraphStore((state) => (buildingId && state.connectorsByBuilding[buildingId]) || EMPTY_CONNECTORS)
  const loadConnectors = useGraphStore((state) => state.loadConnectors)
  const clearConnectors = useGraphStore((state) => state.clearConnectors)
  const createConnector = useGraphStore((state) => state.createConnector)
  const deleteConnector = useGraphStore((state) => state.deleteConnector)
  const [connectorModalOpen, setConnectorModalOpen] = useState(false)
  const [suggestModalOpen, setSuggestModalOpen] = useState(false)
  const [suggestedEdges, setSuggestedEdges] = useState<EdgeSuggestion[]>([])
  const createEdge = useGraphStore((state) => state.createEdge)
  const floors = useFloorStore((state) => state.floors)
  const calibrateFloor = useFloorStore((state) => state.calibrateFloor)
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
  const deleteAllPois = usePoiStore((state) => state.deleteAllPois)
  const updatePoiDetails = usePoiStore((state) => state.updatePoiDetails)
  const mapImageUrl = selectedFloor?.mapImageUrl?.trim() || null
  const mapImage = useImage(mapImageUrl)
  const wallMask = useWallMask(mapImageUrl)

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
  }, [selectedFloorId])

  // Đổi tầng: bỏ bản nháp điều hướng và lỗi của tầng cũ (điều chỉnh state ngay trong render).
  const [draftFloorId, setDraftFloorId] = useState(selectedFloorId)
  if (draftFloorId !== selectedFloorId) {
    setDraftFloorId(selectedFloorId)
    setNavigationDraft(undefined)
    setSuggestedEdges([])
    setGraphError(undefined)
  }

  const handleMovePoi = (poiId: string, to: PercentPoint) => {
    if (selectedFloorId) movePoi(selectedFloorId, poiId, to)
  }

  function handleSuggestEdges() {
    if (!selectedFloor) return
    const found = suggestEdges(currentFloorNodes, currentFloorEdges, { width: selectedFloor.mapWidth, height: selectedFloor.mapHeight }, {
      isBlocked: wallMask ? (a, b) => segmentCrossesWall(wallMask, a, b) : undefined,
    })
    setSuggestedEdges(found)
    if (!wallMask) message.warning('Chưa đọc được ảnh sơ đồ nên gợi ý không tránh được tường — hãy kiểm tra kỹ.')
    else if (found.length === 0) message.info('Không còn cặp node nào nối được mà không xuyên tường (hoặc đã nối liền).')
  }

  function handleApplySuggestedEdges() {
    if (!selectedFloorId) return
    const existing = new Set(currentFloorNodes.map((node) => node.id))
    for (const edge of suggestedEdges) {
      if (existing.has(edge.fromNodeId) && existing.has(edge.toNodeId)) createEdge(selectedFloorId, edge.fromNodeId, edge.toNodeId)
    }
    setSuggestedEdges([])
  }

  function handleDeleteCrossingEdges() {
    if (!selectedFloorId) return
    crossingEdgeIds?.forEach((edgeId) => deleteEdge(selectedFloorId, edgeId))
  }

  /**
   * BE chặn xoá node còn POI/connector gắn vào, nên gỡ chúng trước và chờ BE xác nhận rồi mới xoá node.
   * Cửa hàng và QR anchor gắn vào node chưa có giao diện ở đây: nếu còn, BE vẫn từ chối và lỗi hiện ra.
   */
  async function handleDeleteAllNodes() {
    if (!selectedFloorId) return
    const floorId = selectedFloorId
    setEditingPoiId(undefined)
    // Từng thao tác một: BE khoá dòng tầng ở mỗi lần xoá, gửi dồn sẽ quá hạn giao dịch và trả 500.
    await deleteAllPois(floorId)
    if (buildingId) {
      for (const connector of floorConnectors) {
        deleteConnector(buildingId, connector.id)
        await useGraphStore.getState().flush()
      }
    }
    await deleteAllNodes(floorId)
    tool.resetNodeContext()
  }

  function handleDeleteAllPois() {
    if (!selectedFloorId) return
    deleteAllPois(selectedFloorId)
    setEditingPoiId(undefined)
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

  // Edge có đoạn thẳng cắt nét tường trên ảnh sơ đồ: đường đi thật sẽ không đi được như vậy.
  const crossingEdgeIds = wallMask ? findWallCrossingEdgeIds(wallMask, currentFloorNodes, currentFloorEdges) : undefined

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

  async function handleCalibrate(realDistanceMeters: number) {
    const size = { width: selectedFloor!.mapWidth, height: selectedFloor!.mapHeight }
    const [pointA, pointB] = tool.calibrationPoints.map((point) => positionToDto(point, size))
    try {
      const edges = await calibrateFloor(selectedFloor!.id, { pointA, pointB, realDistanceMeters })
      message.success(`Đã hiệu chuẩn tầng, tính lại độ dài ${edges} edge.`)
      tool.clearCalibration()
      tool.changeMode('node')
      return true
    } catch (reason) {
      message.error((reason as Error).message)
      return false
    }
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
              <Radio.Button value="calibrate">
                <ColumnWidthOutlined /> Hiệu chuẩn
              </Radio.Button>
            </Radio.Group>
            <Button icon={<ScanOutlined />} onClick={() => void handleAnalyzeNavigation()} loading={isGraphSaving} disabled={!selectedFloor.mapImageUrl}>
              Analyze điều hướng
            </Button>
            <Button icon={<ThunderboltOutlined />} onClick={handleSuggestEdges} disabled={currentFloorNodes.length < 2}>
              Gợi ý nối edge
            </Button>
            {suggestedEdges.length > 0 && (
              <>
                <Tag color="green">Gợi ý: {suggestedEdges.length} edge (nét đứt xanh) — kiểm tra không xuyên tường</Tag>
                <Button type="primary" onClick={handleApplySuggestedEdges}>Áp dụng gợi ý</Button>
                <Button onClick={() => setSuggestedEdges([])}>Bỏ gợi ý</Button>
              </>
            )}
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
            {tool.mode === 'calibrate' && (
              <AntText type="secondary">
                {tool.calibrationPoints.length === 0
                  ? 'Click điểm đầu của một khoảng đã biết độ dài thật (vd. bề rộng cửa chính, hành lang).'
                  : 'Click điểm thứ hai. Click thêm lần nữa để chấm lại từ đầu.'}
              </AntText>
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
                <Checkbox checked={tool.autoLink} onChange={(event) => tool.setAutoLink(event.target.checked)}>
                  Tự nối edge với node trước
                </Checkbox>
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
                  >
                    <MapBackgroundLayer image={mapImage.image} status={mapImage.status} size={stageSize} />
                    <GraphEdgesLayer
                      edges={currentFloorEdges}
                      nodeById={nodeById}
                      draftEdges={navigationDraft?.edges}
                      draftNodeById={draftNodeById}
                      flaggedEdgeIds={crossingEdgeIds}
                      suggestions={suggestedEdges}
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
                    <CalibrationLayer points={tool.calibrationPoints} size={stageSize} />
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

      <CanvasSidebar
        nodes={currentFloorNodes}
        edges={currentFloorEdges}
        connectors={floorConnectors}
        pois={pois}
        floorNameById={floorNameById}
        isolatedNodeIds={isolatedNodeIds}
        crossingEdgeIds={crossingEdgeIds}
        selectedNodeId={selectedNodeId}
        edgeLength={edgeLength}
        onSelectNode={selectNode}
        onDeleteNode={tool.handleNodeDelete}
        onDeleteEdge={handleDeleteEdge}
        onDeleteCrossingEdges={handleDeleteCrossingEdges}
        onCreateConnector={() => setConnectorModalOpen(true)}
        onSuggestConnectors={() => setSuggestModalOpen(true)}
        onDeleteConnector={(connectorId) => buildingId && deleteConnector(buildingId, connectorId)}
        onDeletePoi={(poiId) => deletePoi(selectedFloor.id, poiId)}
        onDeleteAllNodes={() => void handleDeleteAllNodes()}
        onDeleteAllPois={handleDeleteAllPois}
      />
      <CalibrationDistanceModal
        points={tool.calibrationPoints}
        mapSize={{ width: selectedFloor.mapWidth, height: selectedFloor.mapHeight }}
        onSubmit={handleCalibrate}
        onCancel={tool.clearCalibration}
      />
      <ConnectorSuggestModal
        open={suggestModalOpen}
        floors={floors}
        connectors={connectors}
        onCreate={(input) => (buildingId ? createConnector(buildingId, input) : Promise.resolve(false))}
        onClose={() => setSuggestModalOpen(false)}
      />
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
