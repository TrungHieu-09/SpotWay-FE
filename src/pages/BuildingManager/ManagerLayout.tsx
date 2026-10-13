import { useEffect, useState } from 'react'
import { App as AntApp, Select, Typography } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'
import { FloorSelector } from './FloorSelector'
import { CanvasBoard } from './CanvasBoard'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useFloorStore } from '../../store/useFloorStore'
import './ManagerLayout.css'

const { Text } = Typography

export function ManagerLayout() {
  const [buildingId, setBuildingId] = useState<string>()
  const buildings = useBuildingStore((state) => state.buildings)
  const isBuildingLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const loadFloors = useFloorStore((state) => state.loadFloors)
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
  }, [loadBuildings, message])

  useEffect(() => {
    if (!buildingId && buildings[0]) {
      setBuildingId(buildings[0].id)
    }
  }, [buildingId, buildings])

  useEffect(() => {
    if (buildingId) {
      loadFloors(buildingId).catch((error: Error) => message.error(error.message))
    }
  }, [buildingId, loadFloors, message])

  const selectedBuilding = buildings.find((b) => b.id === buildingId)

  return (
    <div className="workspace ml-workspace">
      <div className="ml-layout">
        {/* ── Sidebar ── */}
        <aside className="ml-sidebar">
          {/* Sidebar header */}
          <div className="ml-sidebar__header">
            <div className="ml-sidebar__icon">
              <ApartmentOutlined />
            </div>
            <div>
              <Text className="ml-sidebar__eyebrow">Building Manager</Text>
              <h1 className="ml-sidebar__title">Floor Editor</h1>
            </div>
          </div>

          {/* Building selector */}
          <div className="ml-sidebar__section">
            <span className="ml-sidebar__section-label">Select Building</span>
            <Select
              className="full-width"
              loading={isBuildingLoading}
              value={buildingId}
              onChange={setBuildingId}
              options={buildings.map((building) => ({
                value: building.id,
                label: building.name,
              }))}
              placeholder="Choose a building…"
            />
          </div>

          {/* Selected building meta */}
          {selectedBuilding && (
            <div className="ml-sidebar__meta">
              <div className="ml-sidebar__meta-row">
                <span className="ml-sidebar__meta-label">Address</span>
                <span className="ml-sidebar__meta-value">{selectedBuilding.address}</span>
              </div>
              <div className="ml-sidebar__meta-row">
                <span className="ml-sidebar__meta-label">Floors</span>
                <span className="ml-sidebar__meta-value">{selectedBuilding.floorCount}</span>
              </div>
            </div>
          )}

          {/* Floor selector section */}
          <div className="ml-sidebar__section">
            <FloorSelector buildingId={buildingId} />
          </div>
        </aside>

        {/* ── Canvas content ── */}
        <main className="ml-content">
          <CanvasBoard />
        </main>
      </div>
    </div>
  )
}
