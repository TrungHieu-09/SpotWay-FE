import { useCallback, useState } from 'react'
import type Konva from 'konva'
import { useGraphStore } from '../store/useGraphStore'
import type { MapSize, PercentPoint } from '../types/geometry'
import type { NodeType } from '../types/graph'
import { pixelToPercent } from '../utils/canvasCoordinates'

type EditorMode = 'poi' | 'node' | 'edge' | 'wall'

type UseCanvasToolOptions = {
  floorId?: string
  stageSize: MapSize
  onAddPoi: (at: PercentPoint) => void
  onAddWall: (from: PercentPoint, to: PercentPoint) => void
  onError: (message: string) => void
}

const round1 = (value: number) => Math.round(value * 10) / 10

/**
 * Công cụ vẽ trên canvas: chế độ, node đang vẽ tuyến, điểm đầu edge, tường đang vẽ dở.
 * Mọi toạ độ ra khỏi hook đều là %; pixel chỉ đi vào từ sự kiện Konva.
 */
export function useCanvasTool({ floorId, stageSize, onAddPoi, onAddWall, onError }: UseCanvasToolOptions) {
  const [mode, setMode] = useState<EditorMode>('node')
  const [nodeType, setNodeType] = useState<NodeType>('NORMAL')
  const [nodeName, setNodeName] = useState('')
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string>()
  const [routeAnchorNodeId, setRouteAnchorNodeId] = useState<string>()
  const [wallStart, setWallStart] = useState<PercentPoint | null>(null)
  const [wallPointer, setWallPointer] = useState<PercentPoint | null>(null)

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const createNode = useGraphStore((state) => state.createNode)
  const deleteNode = useGraphStore((state) => state.deleteNode)
  const createEdge = useGraphStore((state) => state.createEdge)
  const selectNode = useGraphStore((state) => state.selectNode)

  const cancelWall = useCallback(() => {
    setWallStart(null)
    setWallPointer(null)
  }, [])

  // Đổi tầng: bỏ mọi thao tác dở dang (điều chỉnh state ngay trong render, không cần effect).
  const [toolFloorId, setToolFloorId] = useState(floorId)
  if (toolFloorId !== floorId) {
    setToolFloorId(floorId)
    setEdgeStartNodeId(undefined)
    setRouteAnchorNodeId(undefined)
    cancelWall()
  }

  const changeMode = useCallback(
    (next: EditorMode) => {
      setMode(next)
      setEdgeStartNodeId(undefined)
      cancelWall()
    },
    [cancelWall],
  )

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

    if (mode === 'wall') {
      const point = { x: round1(at.x), y: round1(at.y) }
      if (!wallStart) {
        setWallStart(point)
      } else if (wallStart.x !== point.x || wallStart.y !== point.y) {
        onAddWall(wallStart, point)
        setWallStart(point)
      }
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

  function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    if (mode !== 'wall' || !wallStart) {
      if (wallPointer) setWallPointer(null)
      return
    }
    const pointer = event.target.getStage()?.getPointerPosition()
    if (pointer) setWallPointer(pixelToPercent(pointer.x, pointer.y, stageSize.width, stageSize.height))
  }

  function handleStageContextMenu(event: Konva.KonvaEventObject<PointerEvent>) {
    if (mode !== 'wall') return
    event.evt.preventDefault()
    cancelWall()
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
    wallDraft: wallStart && wallPointer ? { start: wallStart, pointer: wallPointer } : null,
    wallStart,
    cancelWall,
    handleStageClick,
    handleStageMouseMove,
    handleStageContextMenu,
    handleNodeClick,
    handleNodeDelete,
  }
}
