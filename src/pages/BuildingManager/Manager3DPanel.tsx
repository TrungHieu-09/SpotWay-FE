import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Alert, Empty, Spin } from 'antd'
import { getRoute } from '../../api/geometry'
import { useFloorStore } from '../../store/useFloorStore'
import { useGeometryStore } from '../../store/useGeometryStore'
import { getGraph, type GraphNode } from '../../api/graph'
import type { Node } from '../../types/node'
import type { RouteResult } from '../../types/route'

const Map3DViewer = lazy(() => import('../../components/map3d/Map3DViewer'))

export function Manager3DPanel() {
  const floors = useFloorStore((state) => state.floors)
  const selectedFloorId = useFloorStore((state) => state.selectedFloorId)
  const selectFloor = useFloorStore((state) => state.selectFloor)
  const geometriesByFloorId = useGeometryStore((state) => state.geometriesByFloorId)
  const isGeometryLoading = useGeometryStore((state) => state.isLoading)
  const geometryError = useGeometryStore((state) => state.error)
  const loadGeometriesByFloors = useGeometryStore(
    (state) => state.loadGeometriesByFloors,
  )
  const [nodesByFloorId, setNodesByFloorId] = useState<Record<string, Node[]>>({})
  const [isNodeLoading, setIsNodeLoading] = useState(false)
  const [nodeError, setNodeError] = useState<string | null>(null)
  const floorIds = floors.map((floor) => floor.id)
  const floorIdKey = floorIds.join('|')
  const selectedFloor = useMemo(
    () => floors.find((floor) => floor.id === selectedFloorId),
    [floors, selectedFloorId],
  )
  const selectedFloorNodes = useMemo(
    () => (selectedFloorId ? (nodesByFloorId[selectedFloorId] ?? []) : []),
    [nodesByFloorId, selectedFloorId],
  )
  const selectedBuildingId = selectedFloor?.buildingId ?? null
  const [previewRoute, setPreviewRoute] = useState<RouteResult | null>(null)
  const [previewRouteError, setPreviewRouteError] = useState<string | null>(null)
  const previewRouteNodes = useMemo(() => {
    if (selectedFloorNodes.length < 2) {
      return null
    }

    const startNode =
      selectedFloorNodes.find((node) =>
        node.label?.toLowerCase().includes('entrance'),
      ) ?? selectedFloorNodes[0]
    const endNode =
      [...selectedFloorNodes]
        .reverse()
        .find((node) => node.id !== startNode.id && node.label) ??
      selectedFloorNodes.find((node) => node.id !== startNode.id)

    return endNode ? { startNode, endNode } : null
  }, [selectedFloorNodes])
  const visiblePreviewRoute =
    selectedFloorId &&
    previewRoute?.segments.some((segment) => segment.floorId === selectedFloorId)
      ? previewRoute
      : null

  useEffect(() => {
    const nextFloorIds = floorIdKey ? floorIdKey.split('|') : []
    if (nextFloorIds.length === 0) {
      return
    }

    let cancelled = false
    loadGeometriesByFloors(nextFloorIds)
    setIsNodeLoading(true)
    void Promise.all(floors.map(async (floor) => {
      const graph = await getGraph(floor.id)
      return [floor.id, graph.nodes.map((node: GraphNode) => ({ id: node.id, floorId: node.floorId, x: (node.x / floor.mapWidth) * 100, y: (node.y / floor.mapHeight) * 100, label: node.name ?? undefined }))] as const
    }))
      .then((entries) => { if (!cancelled) { setNodesByFloorId(Object.fromEntries(entries)); setNodeError(null) } })
      .catch((error: Error) => { if (!cancelled) setNodeError(error.message) })
      .finally(() => { if (!cancelled) setIsNodeLoading(false) })
    return () => { cancelled = true }
  }, [floorIdKey, floors, loadGeometriesByFloors])

  useEffect(() => {
    if (!selectedBuildingId || !previewRouteNodes) {
      return
    }

    let ignore = false

    getRoute(
      selectedBuildingId,
      previewRouteNodes.startNode.id,
      previewRouteNodes.endNode.id,
    )
      .then((route) => {
        if (!ignore) {
          setPreviewRoute(route)
          setPreviewRouteError(null)
        }
      })
      .catch(() => {
        if (!ignore) {
          setPreviewRoute(null)
          setPreviewRouteError(
            'Chưa có đủ node để xem thử chỉ đường 3D. Hãy tạo graph chỉ đường trước.',
          )
        }
      })

    return () => {
      ignore = true
    }
  }, [previewRouteNodes, selectedBuildingId])

  if (floors.length === 0) {
    return <Empty description="Chưa có tầng để xem 3D" />
  }

  return (
    <Spin spinning={isGeometryLoading || isNodeLoading}>
      {geometryError || nodeError ? (
        <Alert
          className="canvas-alert"
          type="warning"
          showIcon
          message={geometryError ?? nodeError}
        />
      ) : null}
      {previewRouteNodes && previewRouteError ? (
        <Alert
          className="canvas-alert"
          type="info"
          showIcon
          message={previewRouteError}
        />
      ) : null}
      <Suspense
        fallback={
          <div className="map3d-host map3d-empty">
            <Spin />
          </div>
        }
      >
        <Map3DViewer
          floors={floors}
          geometriesByFloorId={geometriesByFloorId}
          nodesByFloorId={nodesByFloorId}
          selectedFloorId={selectedFloorId}
          route={visiblePreviewRoute}
          onSelectFloor={selectFloor}
        />
      </Suspense>
    </Spin>
  )
}
