import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  List,
  message,
  Popconfirm,
  Modal,
  Radio,
  Select,
  Space,
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
  ApartmentOutlined,
  CheckCircleOutlined,
  ClearOutlined,
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
  deleteFloorGraph,
  deleteGraphEdge,
  deleteGraphNode,
  getBuildingConnectors,
  getGraph,
  updateGraphNode,
  type BuildingConnector,
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
import { usePoiStore } from '../../store/usePoiStore'
import { POI_CATEGORY_LABEL, type PoiCategory } from '../../types/poi'
import { validateFloorGraph, type FloorGraphIssue } from '../../api/floors'
import { estimateMetersPerPixel, findEdgesCrossingWalls, findIsolatedNodeIds } from '../../utils/graphGeometry'
import { planPoiPromotions } from '../../utils/poiPromotion'
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

const NO_POIS: never[] = []
const NODE_TYPE_OPTIONS = [
  { value: 'NORMAL', label: 'Lối đi' },
  { value: 'JUNCTION', label: 'Giao lộ' },
  { value: 'DOOR', label: 'Cửa ra vào' },
  { value: 'ELEVATOR', label: 'Thang máy' },
  { value: 'STAIR', label: 'Cầu thang bộ' },
  { value: 'ESCALATOR', label: 'Thang cuốn' },
  { value: 'EXIT', label: 'Lối ra' },
  { value: 'EMERGENCY_EXIT', label: 'Cửa thoát hiểm' },
]
const POI_CATEGORY_OPTIONS = (Object.keys(POI_CATEGORY_LABEL) as PoiCategory[]).map((value) => ({ value, label: POI_CATEGORY_LABEL[value] }))

export function CanvasBoard({ readOnly: _readOnly = false }: { readOnly?: boolean } = {}) {
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>(
    Boolean(selectedFloor),
  )
  const pois = usePoiStore((state) => (selectedFloor ? state.poisByFloorId[selectedFloor.id] : undefined)) ?? NO_POIS
  const isPoiSaving = usePoiStore((state) => state.isSaving)
  const error = usePoiStore((state) => state.error)
  const loadPois = usePoiStore((state) => state.loadPois)
  const createPoi = usePoiStore((state) => state.createPoi)
  const updatePoi = usePoiStore((state) => state.updatePoi)
  const removePoi = usePoiStore((state) => state.removePoi)
  const clearPois = usePoiStore((state) => state.clearPois)
  const calibrateFloor = useFloorStore((state) => state.calibrateFloor)
  const selectedFloorId = selectedFloor?.id
  const [editorMode, setEditorMode] = useState<'poi' | 'node' | 'edge' | 'wall' | 'calibrate'>('node')
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
  const [connectors, setConnectors] = useState<BuildingConnector[]>([])
  const [calibrationOpen, setCalibrationOpen] = useState(false)
  const [poiName, setPoiName] = useState('')
  const [poiCategory, setPoiCategory] = useState<PoiCategory>('CUSTOM')
  const [selectedPoiId, setSelectedPoiId] = useState<string>()
  const [calibrationPoints, setCalibrationPoints] = useState<Array<{ x: number; y: number }>>([])
  const [realDistance, setRealDistance] = useState<number | null>(null)
  const [graphIssues, setGraphIssues] = useState<FloorGraphIssue[] | null>(null)
  const [metersPerPixel, setMetersPerPixel] = useState<number | null>(selectedFloor?.metersPerPixel ?? null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const mapImageUrl = selectedFloor?.mapImageUrl?.trim() || null
  const mapImage = useImage(mapImageUrl)

  useEffect(() => {
    let cancelled = false
    // Đổi tầng phải xóa state ngay: phản hồi tầng cũ không được phép lọt vào canvas mới.
    setNodes([])
    setEdges([])
    setWalls([])
    setNavigationDraft(undefined)
    setSelectedNodeId(undefined)
    setEdgeStartNodeId(undefined)
    setRouteAnchorNodeId(undefined)
    setWallStart(null)
    setPreviewPointer(null)
    setSelectedWallId(undefined)
    setSelectedPoiId(undefined)
    setCalibrationPoints([])
    setGraphIssues(null)
    if (!selectedFloorId) {
      return
    }
    if (selectedFloor) void loadPois(selectedFloor).catch(() => undefined)
    getGraph(selectedFloorId)
      .then(({ nodes: nextNodes, edges: nextEdges }) => {
        if (cancelled) return
        setNodes(Array.isArray(nextNodes) ? nextNodes : [])
        setEdges(Array.isArray(nextEdges) ? nextEdges : [])
      })
      .catch((reason: Error) => { if (!cancelled) setGraphError(reason.message) })

    // Only a persisted server revision may initialize the editor.  Restoring
    // browser-local walls made a newly uploaded, unanalyzed plan look as if
    // it had already been processed by the AI.
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
      .catch(() => { if (!cancelled) setWalls([]) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFloorId])

  useEffect(() => {
    const buildingId = selectedFloor?.buildingId
    if (!buildingId) { setConnectors([]); return }
    let cancelled = false
    getBuildingConnectors(buildingId)
      .then((items) => { if (!cancelled) setConnectors(items) })
      .catch(() => { if (!cancelled) setConnectors([]) })
    return () => { cancelled = true }
  }, [selectedFloor?.buildingId])

  const floorConnectors = useMemo(
    () => connectors.filter((connector) => connector.stops.some((stop) => stop.floorId === selectedFloorId)),
    [connectors, selectedFloorId],
  )

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
  function applyTwoPointCalibration() {
    if (!selectedFloor || calibrationPoints.length < 2 || !realDistance) return
    const [a, b] = calibrationPoints
    const scale = estimateMetersPerPixel(a, b, realDistance)
    if (!scale) {
      setGraphError('Hai điểm đo quá gần nhau hoặc khoảng cách thật không hợp lệ.')
      return
    }
    setMetersPerPixel(Number(scale.toFixed(6)))
  }
  async function handleValidateGraph() {
    if (!selectedFloor) return
    setIsGraphSaving(true); setGraphError(undefined)
    try {
      const report = await validateFloorGraph(selectedFloor.id)
      setGraphIssues(report.issues)
      if (report.valid) message.success('Graph hợp lệ, sẵn sàng publish.')
      else message.warning(`Graph còn ${report.issues.filter((issue) => issue.severity === 'ERROR').length} lỗi chặn publish.`)
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  async function handleClearGraph() {
    if (!selectedFloor) return
    setIsGraphSaving(true); setGraphError(undefined)
    try {
      await deleteFloorGraph(selectedFloor.id)
      setNodes([]); setEdges([]); setSelectedNodeId(undefined); setEdgeStartNodeId(undefined); setRouteAnchorNodeId(undefined)
      await loadPois(selectedFloor)
      message.success('Đã xoá toàn bộ Node/Edge của tầng.')
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  async function handleDeleteCrossingEdges() {
    setIsGraphSaving(true); setGraphError(undefined)
    try {
      const ids = [...crossingEdgeIds]
      await Promise.all(ids.map((id) => deleteGraphEdge(id)))
      setEdges((current) => current.filter((edge) => !crossingEdgeIds.has(edge.id)))
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  async function handlePromotePois() {
    if (!selectedFloor) return
    setIsGraphSaving(true); setGraphError(undefined)
    try {
      for (const plan of promotions) {
        const pixel = { x: (plan.at.x / 100) * selectedFloor.mapWidth, y: (plan.at.y / 100) * selectedFloor.mapHeight }
        const node = await createGraphNode(selectedFloor.id, { ...pixel, name: plan.name, type: plan.nodeType, accessible: true })
        setNodes((current) => [...current, node])
        if (plan.anchorNodeId) {
          const edge = await createGraphEdge(selectedFloor.id, plan.anchorNodeId, node.id)
          setEdges((current) => [...current, edge])
        }
        await updatePoi(selectedFloor, plan.poiId, { nodeId: node.id })
      }
      await loadPois(selectedFloor)
      message.success(`Đã tạo ${promotions.length} node cho POI thang máy / lối ra.`)
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsGraphSaving(false) }
  }
  async function handleNodeDragEnd(nodeId: string, event: Konva.KonvaEventObject<DragEvent>) {
    if (!selectedFloor) return
    const x = (event.target.x() / stageSize.width) * selectedFloor.mapWidth
    const y = (event.target.y() / stageSize.height) * selectedFloor.mapHeight
    const previous = nodes
    setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, x, y } : node)))
    try {
      const saved = await updateGraphNode(nodeId, { x, y })
      setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, ...saved } : node)))
      const graph = await getGraph(selectedFloor.id)
      setEdges(graph.edges)
    } catch (reason) {
      setNodes(previous)
      setGraphError((reason as Error).message)
    }
  }
  async function handleNodePatch(nodeId: string, patch: { name?: string | null; type?: GraphNodeType }) {
    try {
      const saved = await updateGraphNode(nodeId, patch as { name?: string; type?: GraphNodeType })
      setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, ...saved } : node)))
    } catch (reason) { setGraphError((reason as Error).message) }
  }
  async function handleSaveCalibration() {
    if (!selectedFloor || !metersPerPixel || metersPerPixel <= 0) return
    setIsCalibrating(true)
    try {
      const edgesRecomputed = await calibrateFloor(selectedFloor.id, metersPerPixel)
      message.success(`Đã hiệu chuẩn ${metersPerPixel} m/px và tính lại ${edgesRecomputed} cạnh.`)
      setCalibrationOpen(false)
      setCalibrationPoints([])
      setRealDistance(null)
    } catch (reason) { setGraphError((reason as Error).message) } finally { setIsCalibrating(false) }
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
      const percent = pixelToPercent(position.x, position.y, stageSize.width, stageSize.height)
      try {
        const poi = await createPoi(selectedFloor, {
          ...percent,
          name: poiName.trim() || `POI ${pois.length + 1}`,
          category: poiCategory,
        })
        setSelectedPoiId(poi.id)
        setPoiName('')
        if (poi.snapDistanceMeters != null) message.info(`POI gắn vào node gần nhất (${poi.snapDistanceMeters.toFixed(1)} m).`)
      } catch (reason) {
        setGraphError((reason as Error).message)
      }
      return
    }

    if (editorMode === 'calibrate') {
      const point = {
        x: (position.x / stageSize.width) * selectedFloor.mapWidth,
        y: (position.y / stageSize.height) * selectedFloor.mapHeight,
      }
      const next = calibrationPoints.length >= 2 ? [point] : [...calibrationPoints, point]
      setCalibrationPoints(next)
      if (next.length === 2) {
        setMetersPerPixel(selectedFloor.metersPerPixel ?? null)
        setCalibrationOpen(true)
      }
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

    try {
      await updatePoi(selectedFloor, poiId, pixelToPercent(event.target.x(), event.target.y(), stageSize.width, stageSize.height))
    } catch (reason) {
      setGraphError((reason as Error).message)
    }
  }

  const selectedNode = Array.isArray(nodes) ? nodes.find((n) => n.id === selectedNodeId) : undefined
  const isolatedNodeIds = findIsolatedNodeIds(nodes, edges)
  const crossingEdgeIds = findEdgesCrossingWalls(
    edges,
    nodes,
    walls.map((wall) => ({
      x1: (wall.x1 / 100) * selectedFloor.mapWidth,
      y1: (wall.y1 / 100) * selectedFloor.mapHeight,
      x2: (wall.x2 / 100) * selectedFloor.mapWidth,
      y2: (wall.y2 / 100) * selectedFloor.mapHeight,
    })),
  )
  const promotions = planPoiPromotions(pois, nodes, selectedFloor)

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
              {(isPoiSaving || isGraphSaving) && <Tag color="processing">Đang lưu…</Tag>}
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
              <Radio.Button value="calibrate">
                <ApartmentOutlined /> Đo tỉ lệ
              </Radio.Button>
            </Radio.Group>
            <Button icon={<ScanOutlined />} onClick={() => void handleAnalyzeNavigation()} loading={isGraphSaving} disabled={!selectedFloor.mapImageUrl}>
              Analyze điều hướng
            </Button>
            <Button onClick={() => { setMetersPerPixel(selectedFloor.metersPerPixel ?? null); setCalibrationOpen(true) }}>
              Hiệu chuẩn tỉ lệ{selectedFloor.metersPerPixel ? ` (${selectedFloor.metersPerPixel} m/px)` : ''}
            </Button>
            <Button icon={<CheckCircleOutlined />} onClick={() => void handleValidateGraph()} loading={isGraphSaving}>
              Kiểm tra graph
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
                  options={NODE_TYPE_OPTIONS}
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
            {editorMode === 'poi' && (
              <>
                <Select value={poiCategory} onChange={setPoiCategory} style={{ width: 160 }} options={POI_CATEGORY_OPTIONS} />
                <Input
                  value={poiName}
                  onChange={(event) => setPoiName(event.target.value)}
                  placeholder="Tên POI, ví dụ: WC tầng 1"
                  maxLength={100}
                  style={{ width: 220 }}
                />
                <AntText type="secondary">Click lên bản đồ để thêm POI; BE tự gắn POI vào node gần nhất.</AntText>
              </>
            )}
            {editorMode === 'calibrate' && (
              <AntText type="secondary">
                {calibrationPoints.length === 0 ? 'Click điểm đầu của một khoảng cách đã biết (vd. chiều rộng cửa).' : calibrationPoints.length === 1 ? 'Click điểm thứ hai.' : 'Đã chọn 2 điểm.'}
              </AntText>
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
                <AntText strong>Node #{(selectedNode.id ?? '').slice(0, 8)}</AntText>
                <AntText type="secondary">
                  ({Math.round((selectedNode.x / selectedFloor.mapWidth) * 100)}%,{' '}
                  {Math.round((selectedNode.y / selectedFloor.mapHeight) * 100)}%)
                </AntText>
              </Space>
              <Space wrap>
                <Select
                  size="small"
                  value={selectedNode.type}
                  style={{ width: 140 }}
                  options={NODE_TYPE_OPTIONS}
                  onChange={(type) => void handleNodePatch(selectedNode.id, { type })}
                />
                <Input
                  key={selectedNode.id}
                  size="small"
                  style={{ width: 160 }}
                  defaultValue={selectedNode.name ?? ''}
                  placeholder="Tên điểm"
                  maxLength={100}
                  onBlur={(event) => {
                    const name = event.target.value.trim()
                    if (name !== (selectedNode.name ?? '')) void handleNodePatch(selectedNode.id, { name: name || null })
                  }}
                />
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

          {graphIssues && graphIssues.length > 0 ? (
            <Alert
              className="canvas-alert"
              type={graphIssues.some((issue) => issue.severity === 'ERROR') ? 'error' : 'warning'}
              showIcon
              closable
              onClose={() => setGraphIssues(null)}
              message="Kết quả kiểm tra graph"
              description={<ul style={{ margin: 0, paddingLeft: 18 }}>{graphIssues.map((issue, index) => <li key={`${issue.code}-${index}`}><Tag color={issue.severity === 'ERROR' ? 'error' : 'warning'}>{issue.severity}</Tag>{issue.message}{issue.ids?.length ? ` (${issue.ids.length})` : ''}</li>)}</ul>}
            />
          ) : null}

          {error || graphError ? (
            <Alert
              className="canvas-alert"
              message={error ?? graphError}
              type="error"
              showIcon
            />
          ) : null}

          <div>
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
                      {calibrationPoints.map((point, index) => (
                        <Circle
                          key={`cal-${index}`}
                          x={(point.x / selectedFloor.mapWidth) * stageSize.width}
                          y={(point.y / selectedFloor.mapHeight) * stageSize.height}
                          radius={7}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={2}
                          listening={false}
                        />
                      ))}
                      {calibrationPoints.length === 2 && (
                        <Line
                          points={calibrationPoints.flatMap((point) => [
                            (point.x / selectedFloor.mapWidth) * stageSize.width,
                            (point.y / selectedFloor.mapHeight) * stageSize.height,
                          ])}
                          stroke="#ef4444"
                          strokeWidth={3}
                          dash={[6, 4]}
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
                            fill={selectedPoiId === poi.id ? '#ea580c' : '#f97316'}
                            stroke={selectedPoiId === poi.id ? '#0284c7' : '#ffffff'}
                            strokeWidth={5}
                            draggable={editorMode === 'poi'}
                            onClick={(event) => {
                              event.cancelBubble = true
                              setSelectedPoiId((current) => (current === poi.id ? undefined : poi.id))
                            }}
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
                            stroke={edge.status === 'BLOCKED' || crossingEdgeIds.has(edge.id) ? '#ef4444' : '#22d3ee'}
                            dash={crossingEdgeIds.has(edge.id) ? [8, 5] : undefined}
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
                      {floorConnectors.flatMap((connector) => connector.stops
                        .filter((stop) => stop.floorId === selectedFloor.id)
                        .flatMap((stop) => {
                          const node = nodes.find((item) => item.id === stop.nodeId)
                          if (!node) return []
                          const x = (node.x / selectedFloor.mapWidth) * stageSize.width
                          const y = (node.y / selectedFloor.mapHeight) * stageSize.height
                          const color = connector.kind === 'ELEVATOR' ? '#a855f7' : connector.kind === 'STAIR' ? '#f59e0b' : '#14b8a6'
                          const glyph = connector.kind === 'ELEVATOR' ? 'T' : connector.kind === 'STAIR' ? 'B' : 'C'
                          return <React.Fragment key={`${connector.id}-${node.id}`}>
                            <Circle x={x} y={y} radius={22} stroke={color} strokeWidth={4} dash={connector.accessible ? undefined : [6, 4]} listening={false} />
                            <Circle x={x} y={y} radius={8} fill={color} listening={false} />
                            <Text x={x - 4} y={y - 6} text={glyph} fontSize={10} fontStyle="bold" fill="#fff" listening={false} />
                            <Text x={x + 26} y={y - 24} text={`${connector.name} · ${connector.stops.length} tầng`} fontSize={12} fill={color} listening={false} />
                          </React.Fragment>
                        }))}
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
                                  : node.type === 'EXIT' || node.type === 'EMERGENCY_EXIT'
                                    ? '#16a34a'
                                  : node.type === 'DOOR'
                                    ? '#f59e0b'
                                    : '#0ea5e9'
                              }
                              stroke={isolatedNodeIds.has(node.id) ? '#f59e0b' : '#ffffff'}
                              strokeWidth={isPendingEdgeStart || isSelected ? 4 : 3}
                              draggable={editorMode === 'node' || editorMode === 'edge'}
                              onDragEnd={(event) => void handleNodeDragEnd(node.id, event)}
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
                      {navigationDraft?.nodes?.map((node) => <Circle key={node.id} x={node.x / selectedFloor.mapWidth * stageSize.width} y={node.y / selectedFloor.mapHeight * stageSize.height} radius={10} fill="#facc15" stroke="#854d0e" strokeWidth={2} draggable onDragEnd={(event) => moveDraftNode(node.id, event.target.x() / stageSize.width * selectedFloor.mapWidth, event.target.y() / stageSize.height * selectedFloor.mapHeight)} />)}
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
      <Modal
        title={`Hiệu chuẩn tỉ lệ — ${selectedFloor.name}`}
        open={calibrationOpen}
        okText="Lưu tỉ lệ"
        cancelText="Hủy"
        confirmLoading={isCalibrating}
        onOk={() => void handleSaveCalibration()}
        onCancel={() => { setCalibrationOpen(false); setCalibrationPoints([]) }}
      >
        <Alert type="info" showIcon message="Tỉ lệ này dùng để tính chiều dài tuyến và kiểm tra trước khi publish." style={{ marginBottom: 12 }} />
        {calibrationPoints.length === 2 && (
          <Space style={{ marginBottom: 12 }} wrap>
            <AntText>Khoảng cách thật giữa 2 điểm đã chọn:</AntText>
            <InputNumber min={0.01} max={10000} step={0.1} value={realDistance} onChange={setRealDistance} addonAfter="m" />
            <Button onClick={applyTwoPointCalibration} disabled={!realDistance}>Tính tỉ lệ</Button>
          </Space>
        )}
        <InputNumber min={0.000001} max={100} step={0.01} value={metersPerPixel} onChange={setMetersPerPixel} addonAfter="m/px" style={{ width: '100%' }} />
      </Modal>

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
                <>
                {nodes.length > 0 && (
                  <Popconfirm
                    title={`Xóa toàn bộ ${nodes.length} Node và ${edges.length} Edge của tầng này?`}
                    description="POI vẫn giữ lại nhưng sẽ mất liên kết node."
                    onConfirm={() => void handleClearGraph()}
                    okText="Xóa tất cả"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger size="small" block icon={<ClearOutlined />} style={{ marginBottom: 8 }}>Xóa toàn bộ Node/Edge</Button>
                  </Popconfirm>
                )}
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
                                : node.type === 'EXIT' || node.type === 'EMERGENCY_EXIT'
                                  ? 'green'
                                : node.type === 'DOOR'
                                  ? 'orange'
                                  : 'cyan'
                            }
                          >
                            {node.type}
                          </Tag>
                          <AntText strong style={{ fontSize: 12 }}>
                            {node.name?.trim() || `#${(node.id ?? '').slice(0, 6)}`}
                          </AntText>
                          {isolatedNodeIds.has(node.id) && <Tag color="warning">Chưa nối Edge</Tag>}
                        </Space>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          {Math.round((node.x / selectedFloor.mapWidth) * 100)}%,{' '}
                          {Math.round((node.y / selectedFloor.mapHeight) * 100)}%
                        </AntText>
                      </Space>
                    </List.Item>
                  )}
                />
                </>
              ),
            },
            {
              key: 'edges',
              label: `Edge (${edges.length})`,
              children: (
                <>
                {crossingEdgeIds.size > 0 && (
                  <Popconfirm
                    title={`Xóa ${crossingEdgeIds.size} edge nghi xuyên tường?`}
                    onConfirm={() => void handleDeleteCrossingEdges()}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger size="small" block icon={<ClearOutlined />} style={{ marginBottom: 8 }}>Xóa {crossingEdgeIds.size} edge xuyên tường</Button>
                  </Popconfirm>
                )}
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
                          #{(edge.fromNodeId ?? '').slice(0, 5)} → #{(edge.toNodeId ?? '').slice(0, 5)}
                        </AntText>
                        <AntText type="secondary" style={{ fontSize: 11 }}>
                          Khoảng cách: {Math.round(edge.weight)}px
                          {crossingEdgeIds.has(edge.id) && <Tag color="error" style={{ marginLeft: 6 }}>Xuyên tường?</Tag>}
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
                <>
                  {promotions.length > 0 && (
                    <Popconfirm
                      title={`Tạo node cho ${promotions.length} POI thang máy / lối ra?`}
                      description="Node mới đặt tại vị trí POI và nối vào node gần nhất."
                      onConfirm={() => void handlePromotePois()}
                      okText="Tạo"
                      cancelText="Hủy"
                    >
                      <Button size="small" block icon={<ApartmentOutlined />} style={{ marginBottom: 8 }}>
                        Tạo node cho {promotions.length} POI thang máy / lối ra
                      </Button>
                    </Popconfirm>
                  )}
                  {pois.length > 0 && (
                    <Popconfirm
                      title={`Xóa toàn bộ ${pois.length} POI của tầng này?`}
                      onConfirm={() => void clearPois(selectedFloor).catch((reason: Error) => setGraphError(reason.message))}
                      okText="Xóa tất cả"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger size="small" block icon={<ClearOutlined />} style={{ marginBottom: 8 }}>Xóa toàn bộ POI</Button>
                    </Popconfirm>
                  )}
                  <List
                    size="small"
                    dataSource={pois}
                    locale={{ emptyText: 'Chuyển sang chế độ POI để thêm' }}
                    style={{ maxHeight: 520, overflowY: 'auto' }}
                    renderItem={(poi) => (
                      <List.Item
                        style={{
                          padding: '6px 8px',
                          background: selectedPoiId === poi.id ? '#f0f9ff' : undefined,
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedPoiId((curr) => (curr === poi.id ? undefined : poi.id))}
                        actions={[
                          <div key="delete" onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                              title="Xác nhận xóa POI?"
                              onConfirm={() => void removePoi(selectedFloor, poi.id).catch((reason: Error) => setGraphError(reason.message))}
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </div>,
                        ]}
                      >
                        <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                          {selectedPoiId === poi.id ? (
                            <Space wrap onClick={(e) => e.stopPropagation()}>
                              <Input
                                key={poi.id}
                                size="small"
                                style={{ width: 130 }}
                                defaultValue={poi.name}
                                maxLength={100}
                                onBlur={(event) => {
                                  const name = event.target.value.trim()
                                  if (name && name !== poi.name) void updatePoi(selectedFloor, poi.id, { name }).catch((reason: Error) => setGraphError(reason.message))
                                }}
                              />
                              <Select
                                size="small"
                                value={poi.category}
                                style={{ width: 130 }}
                                options={POI_CATEGORY_OPTIONS}
                                onChange={(category) => void updatePoi(selectedFloor, poi.id, { category }).catch((reason: Error) => setGraphError(reason.message))}
                              />
                            </Space>
                          ) : (
                            <Space>
                              <AntText strong style={{ fontSize: 12 }}>{poi.name}</AntText>
                              <Tag color="blue">{POI_CATEGORY_LABEL[poi.category]}</Tag>
                            </Space>
                          )}
                          <AntText type="secondary" style={{ fontSize: 11 }}>
                            {poi.x.toFixed(1)}%, {poi.y.toFixed(1)}%
                            {poi.snapDistanceMeters != null && ` · cách node ${poi.snapDistanceMeters.toFixed(1)} m`}
                            {!poi.nodeId && <Tag color="warning" style={{ marginLeft: 6 }}>Chưa gắn Node</Tag>}
                          </AntText>
                        </Space>
                      </List.Item>
                    )}
                  />
                </>
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
