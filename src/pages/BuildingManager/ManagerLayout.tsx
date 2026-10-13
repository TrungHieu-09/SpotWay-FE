import { useEffect, useState } from 'react'
import { App as AntApp, Button, Layout, Select, Tabs, Typography } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'
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
  const [autoRecognizeRequestId, setAutoRecognizeRequestId] = useState(0)
  const buildings = useBuildingStore((state) => state.buildings)
  const isBuildingLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const loadFloors = useFloorStore((state) => state.loadFloors)
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
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
        <Text type="secondary">Quản lý tòa nhà</Text>
        <Title level={1}>Quản lý sơ đồ tầng</Title>
        <Select
          className="full-width"
          loading={isBuildingLoading}
          value={buildingId}
          onChange={setBuildingId}
          options={buildings.map((building) => ({
            value: building.id,
            label: building.name,
          }))}
          placeholder="Chọn tòa nhà"
        />
        <FloorSelector buildingId={buildingId} />
      </Sider>

      <Content className="manager-content">
        <div className="manager-content-actions">
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            disabled={!selectedFloor}
            onClick={() => {
              setActiveTab('recognition')
              setAutoRecognizeRequestId((requestId) => requestId + 1)
            }}
          >
            Tạo mô hình 3D
          </Button>
        </div>
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
              label: 'Bản đồ 2D',
              children: <CanvasBoard />,
            },
            {
              key: 'stores',
              label: 'Danh sách gian hàng',
              children: <StoreListPanel />,
            },
            {
              key: 'recognition',
              label: 'Nhận diện sơ đồ',
              children: (
                <FloorRecognitionPanel
                  autoRecognizeRequestId={autoRecognizeRequestId}
                  onDirtyChange={setIsRecognitionDirty}
                  onView3D={() => setActiveTab('map-3d')}
                />
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
