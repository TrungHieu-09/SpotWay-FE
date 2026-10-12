import { Suspense, lazy, useEffect } from 'react'
import { Alert, Empty, Spin } from 'antd'
import { useFloorStore } from '../../store/useFloorStore'
import { useGeometryStore } from '../../store/useGeometryStore'
import { useNodeStore } from '../../store/useNodeStore'

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
  const nodesByFloorId = useNodeStore((state) => state.nodesByFloorId)
  const isNodeLoading = useNodeStore((state) => state.isLoading)
  const nodeError = useNodeStore((state) => state.error)
  const loadNodesByFloors = useNodeStore((state) => state.loadNodesByFloors)
  const floorIds = floors.map((floor) => floor.id)
  const floorIdKey = floorIds.join('|')

  useEffect(() => {
    const nextFloorIds = floorIdKey ? floorIdKey.split('|') : []
    if (nextFloorIds.length === 0) {
      return
    }

    loadGeometriesByFloors(nextFloorIds)
    loadNodesByFloors(nextFloorIds)
  }, [floorIdKey, loadGeometriesByFloors, loadNodesByFloors])

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
          route={null}
          onSelectFloor={selectFloor}
        />
      </Suspense>
    </Spin>
  )
}
