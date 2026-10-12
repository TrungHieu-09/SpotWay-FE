import { useEffect, useState } from 'react'
import { App as AntApp, Layout, Select, Tabs, Typography } from 'antd'
import { FloorSelector } from './FloorSelector'
import { CanvasBoard } from './CanvasBoard'
import { ElevatorLinkPanel } from './ElevatorLinkPanel'
import { FloorRecognitionPanel } from './FloorRecognitionPanel'
import { Manager3DPanel } from './Manager3DPanel'
import { StoreListPanel } from './StoreListPanel'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useFloorStore } from '../../store/useFloorStore'

const { Content, Sider } = Layout
const { Text, Title } = Typography

export function ManagerLayout() {
  const [buildingId, setBuildingId] = useState<string>()
  const [activeTab, setActiveTab] = useState('canvas')
  const [isRecognitionDirty, setIsRecognitionDirty] = useState(false)
  const buildings = useBuildingStore((state) => state.buildings)
  const isBuildingLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const loadFloors = useFloorStore((state) => state.loadFloors)
  const { message, modal } = AntApp.useApp()

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
          activeKey={activeTab}
          onChange={(nextTab) => {
            if (activeTab === 'recognition' && isRecognitionDirty) {
              modal.confirm({
                title: 'Rời tab nhận diện sơ đồ?',
                content: 'Bạn có thay đổi chưa lưu. Rời tab sẽ giữ bản nháp trên màn hình nhưng chưa lưu vào dữ liệu demo.',
                okText: 'Rời tab',
                cancelText: 'Ở lại',
                onOk: () => setActiveTab(nextTab),
              })
              return
            }

            setActiveTab(nextTab)
          }}
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
              key: 'recognition',
              label: 'Nhận diện sơ đồ',
              children: (
                <FloorRecognitionPanel onDirtyChange={setIsRecognitionDirty} />
              ),
            },
            {
              key: 'map-3d',
              label: 'Xem 3D',
              children: <Manager3DPanel />,
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
