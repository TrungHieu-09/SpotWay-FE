import { useCallback, useState } from 'react'
import type Konva from 'konva'
import { useGraphStore } from '../store/useGraphStore'
import type { MapSize, PercentPoint } from '../types/geometry'
import type { NodeType } from '../types/graph'
import { pixelToPercent } from '../utils/canvasCoordinates'

type EditorMode = 'poi' | 'node' | 'edge' | 'calibrate'

type UseCanvasToolOptions = {
  floorId?: string
  stageSize: MapSize
  onAddPoi: (at: PercentPoint) => void
  onError: (message: string) => void
}

/**
 * Công cụ vẽ trên canvas: chế độ, node đang vẽ tuyến, điểm đầu edge.
 * Mọi toạ độ ra khỏi hook đều là %; pixel chỉ đi vào từ sự kiện Konva.
 */
export function useCanvasTool({ floorId, stageSize, onAddPoi, onError }: UseCanvasToolOptions) {
  const [mode, setMode] = useState<EditorMode>('node')
  const [nodeType, setNodeType] = useState<NodeType>('NORMAL')
  const [nodeName, setNodeName] = useState('')
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string>()
  const [routeAnchorNodeId, setRouteAnchorNodeId] = useState<string>()
  /** Hai điểm (%) người dùng chấm để hiệu chuẩn tỉ lệ; chấm lần thứ ba thì bắt đầu lại. */
  const [calibrationPoints, setCalibrationPoints] = useState<PercentPoint[]>([])

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const createNode = useGraphStore((state) => state.createNode)
  const deleteNode = useGraphStore((state) => state.deleteNode)
  const createEdge = useGraphStore((state) => state.createEdge)
  const selectNode = useGraphStore((state) => state.selectNode)

  // Đổi tầng: bỏ mọi thao tác dở dang (điều chỉnh state ngay trong render, không cần effect).
  const [toolFloorId, setToolFloorId] = useState(floorId)
  if (toolFloorId !== floorId) {
    setToolFloorId(floorId)
    setEdgeStartNodeId(undefined)
    setRouteAnchorNodeId(undefined)
    setCalibrationPoints([])
  }

  const changeMode = useCallback((next: EditorMode) => {
    setMode(next)
    setEdgeStartNodeId(undefined)
    setCalibrationPoints([])
  }, [])

  const clearCalibration = useCallback(() => setCalibrationPoints([]), [])

  function handleStageClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!floorId) return
    const stage = event.target.getStage()
    const clickedMap = event.target === stage || event.target.name() === 'map-background'
    const pointer = stage?.getPointerPosition()
    if (!clickedMap || !pointer) return

    const at = pixelToPercent(pointer.x, pointer.y, stageSize.width, stageSize.height)

    if (mode === 'poi') {
      onAddPoi(at)
      return
    }

    if (mode === 'calibrate') {
      setCalibrationPoints((points) => (points.length >= 2 ? [at] : [...points, at]))
      return
    }

    if (mode !== 'node') return

    if (nodeType !== 'NORMAL' && !nodeName.trim()) {
      onError('Nhập tên điểm trước khi tạo Node chức năng.')
      return
    }

    const tempId = createNode(
      floorId,
      { ...at, name: nodeName.trim() || null, type: nodeType, accessible: true },
      { linkFromNodeId: routeAnchorNodeId },
    )
    if (tempId) setRouteAnchorNodeId(tempId)
    setNodeName('')
  }

  function handleNodeClick(nodeId: string) {
    if (!floorId) return
    if (mode === 'edge') {
      if (!edgeStartNodeId) {
        setEdgeStartNodeId(nodeId)
      } else if (edgeStartNodeId === nodeId) {
        setEdgeStartNodeId(undefined)
      } else {
        createEdge(floorId, edgeStartNodeId, nodeId)
        setEdgeStartNodeId(undefined)
      }
      return
    }
    selectNode(selectedNodeId === nodeId ? null : nodeId)
  }

  function handleNodeDelete(nodeId: string) {
    if (!floorId) return
    deleteNode(floorId, nodeId)
    if (routeAnchorNodeId === nodeId) setRouteAnchorNodeId(undefined)
    if (edgeStartNodeId === nodeId) setEdgeStartNodeId(undefined)
  }

  /** "Nối Edge từ đây" ở thanh node đang chọn. */
  function startEdgeFrom(nodeId: string) {
    setMode('edge')
    setEdgeStartNodeId(nodeId)
  }

  /** Sau khi xoá tất cả node: bỏ node đang chờ nối/neo tuyến vì không còn tồn tại. */
  function resetNodeContext() {
    setEdgeStartNodeId(undefined)
    setRouteAnchorNodeId(undefined)
  }

  return {
    mode,
    changeMode,
    nodeType,
    setNodeType,
    nodeName,
    setNodeName,
    edgeStartNodeId,
    routeAnchorNodeId,
    setRouteAnchorNodeId,
    startEdgeFrom,
    resetNodeContext,
    calibrationPoints,
    clearCalibration,
    handleStageClick,
    handleNodeClick,
    handleNodeDelete,
  }
}
