import { useEffect, useState } from 'react'
import { App as AntApp, Layout, Select, Tabs, Typography } from 'antd'
import { FloorSelector } from './FloorSelector'
import { CanvasBoard } from './CanvasBoard'
import { ElevatorLinkPanel } from './ElevatorLinkPanel'
import { StoreListPanel } from './StoreListPanel'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useFloorStore } from '../../store/useFloorStore'

const { Content, Sider } = Layout
const { Text, Title } = Typography

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

  return (
    <Layout className="workspace manager-layout">
      <Sider width={292} theme="light" className="manager-sider">
        <Text type="secondary">Building Manager</Text>
        <Title level={1}>Floor editor POC</Title>
        <Select
          className="full-width"
          loading={isBuildingLoading}
          value={buildingId}
          onChange={setBuildingId}
          options={buildings.map((building) => ({
            value: building.id,
            label: building.name,
          }))}
          placeholder="Chọn building"
        />
        <FloorSelector buildingId={buildingId} />
      </Sider>

      <Content className="manager-content">
        <Tabs
          items={[
            {
              key: 'canvas',
              label: 'Canvas',
              children: <CanvasBoard />,
            },
            {
              key: 'stores',
              label: 'Danh sách store',
              children: <StoreListPanel />,
            },
            {
              key: 'elevator-links',
              label: 'Liên kết thang máy',
              children: <ElevatorLinkPanel />,
            },
          ]}
        />
      </Content>
    </Layout>
  )
}
