import { useEffect, useState } from 'react'
import { App as AntApp, Button, Layout, Tabs, Typography, Upload } from 'antd'
import { ExperimentOutlined, UploadOutlined } from '@ant-design/icons'
import { FloorSelector } from './FloorSelector'
import { CanvasBoard } from './CanvasBoard'
import { ElevatorLinkPanel } from './ElevatorLinkPanel'
import { FloorRecognitionPanel } from './FloorRecognitionPanel'
import { Manager3DPanel } from './Manager3DPanel'
import { NavigationGraphPanel } from './NavigationGraphPanel'
import { StoreListPanel } from './StoreListPanel'
import { MaintenancePanel } from './MaintenancePanel'
import { QrCodePanel } from './QrCodePanel'
import { EditorShell } from '../../components/ui/EditorShell'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useFloorStore } from '../../store/useFloorStore'
import { usePermissions } from '../../auth/usePermissions'
import { compressPlanImageFile } from '../../utils/planRecognition'

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
  const floors = useFloorStore((state) => state.floors)
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const selectFloor = useFloorStore((state) => state.selectFloor)
  const updateFloorPlan = useFloorStore((state) => state.updateFloorPlan)
  const { message, modal } = AntApp.useApp()
  const permissions = usePermissions()
  const isReadOnly = Boolean(selectedFloor && !permissions.canEditFloor(selectedFloor))

  useEffect(() => {
    setActiveTab('canvas')
    setIsRecognitionDirty(false)
  }, [buildingId, selectedFloor?.id])

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

  async function handlePlanUpload(file: File) {
    if (!selectedFloor || isReadOnly) {
      return
    }

    try {
      const compressedImage = await compressPlanImageFile(file)
      await updateFloorPlan(selectedFloor.id, {
        mapImageUrl: compressedImage.dataUrl,
        mapWidth: compressedImage.width,
        mapHeight: compressedImage.height,
      })
      setActiveTab('recognition')
      message.success('Đã tải ảnh sơ đồ 2D cho tầng')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải ảnh sơ đồ')
    }
  }

  return (
    <Layout className="workspace manager-layout">
      <Sider width={292} theme="light" className="manager-sider">
        <Text type="secondary">Quản lý tòa nhà</Text>
        <Title level={1}>Quản lý sơ đồ tầng</Title>
        <FloorSelector buildingId={buildingId} />
      </Sider>

      <Content className="manager-content">
        <EditorShell
          buildings={buildings}
          buildingId={buildingId}
          floors={floors}
          selectedFloorId={selectedFloor?.id}
          isBuildingLoading={isBuildingLoading}
          readOnly={isReadOnly}
          secondaryAction={<Upload
            accept="image/png,image/jpeg,image/webp"
            showUploadList={false}
            beforeUpload={(file) => {
              void handlePlanUpload(file)
              return Upload.LIST_IGNORE
            }}
          >
            <Button icon={<UploadOutlined />} disabled={!selectedFloor || isReadOnly}>
              Tải ảnh 2D
            </Button>
          </Upload>}
          primaryAction={<Button
            type="primary"
            icon={<ExperimentOutlined />}
            disabled={!selectedFloor}
            onClick={() => {
              setActiveTab('recognition')
              setAutoRecognizeRequestId((requestId) => requestId + 1)
            }}
          >
            Tạo mô hình 3D
          </Button>}
          onBuildingChange={setBuildingId}
          onFloorChange={selectFloor}
        >
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
              children: <CanvasBoard readOnly={isReadOnly} />,
            },
            {
              key: 'stores',
              label: 'Danh sách gian hàng',
              children: <StoreListPanel readOnly={isReadOnly} />,
            },
            {
              key: 'recognition',
              label: 'Nhận diện sơ đồ',
              children: (
                <FloorRecognitionPanel
                  autoRecognizeRequestId={autoRecognizeRequestId}
                  onDirtyChange={setIsRecognitionDirty}
                  onView3D={() => setActiveTab('map-3d')}
                  readOnly={isReadOnly}
                />
              ),
            },
            {
              key: 'map-3d',
              label: 'Xem 3D',
              children: <Manager3DPanel />,
            },
            {
              key: 'navigation-graph',
              label: 'Graph chỉ đường',
              children: <NavigationGraphPanel readOnly={isReadOnly} />,
            },
            {
              key: 'elevator-links',
              label: 'Liên kết thang máy',
              children: <ElevatorLinkPanel readOnly={isReadOnly} />,
            },
            {
              key: 'maintenance',
              label: 'Bảo trì',
              children: <MaintenancePanel readOnly={isReadOnly} />,
            },
            {
              key: 'qr-codes',
              label: 'Mã QR',
              children: <QrCodePanel readOnly={isReadOnly} />,
            },
            ]}
          />
        </EditorShell>
      </Content>
    </Layout>
  )
}
