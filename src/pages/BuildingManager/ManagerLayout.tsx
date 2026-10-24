import { useEffect, useState } from 'react'
import { App as AntApp, Button, Select, Tabs, Tooltip, Typography, Upload } from 'antd'
import { ApartmentOutlined, ExperimentOutlined, UploadOutlined } from '@ant-design/icons'
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
import './ManagerLayout.css'

const { Text } = Typography

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

  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.editor-stage-column .ant-tabs-tab-active')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    })
  }, [activeTab])

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

        {/* ── Editor Shell & Tabs ── */}
        <main className="ml-content">
          <EditorShell
            buildings={buildings}
            buildingId={buildingId}
            floors={floors}
            selectedFloorId={selectedFloor?.id}
            isBuildingLoading={isBuildingLoading}
            readOnly={isReadOnly}
            secondaryAction={
              <Tooltip title={isReadOnly ? 'Tầng này chỉ đọc nên không thể chỉnh sửa' : undefined}>
                <span>
                  <Upload
                    accept="image/png,image/jpeg,image/webp"
                    showUploadList={false}
                    disabled={!selectedFloor || isReadOnly}
                    beforeUpload={(file) => {
                      void handlePlanUpload(file)
                      return Upload.LIST_IGNORE
                    }}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      disabled={!selectedFloor || isReadOnly}
                      aria-disabled={!selectedFloor || isReadOnly}
                    >
                      Tải ảnh 2D
                    </Button>
                  </Upload>
                </span>
              </Tooltip>
            }
            primaryAction={
              <Tooltip title={isReadOnly ? 'Tầng này chỉ đọc nên không thể chỉnh sửa' : undefined}>
                <span>
                  <Button
                    type="primary"
                    icon={<ExperimentOutlined />}
                    disabled={!selectedFloor || isReadOnly}
                    aria-disabled={!selectedFloor || isReadOnly}
                    onClick={() => {
                      setActiveTab('recognition')
                      setAutoRecognizeRequestId((requestId) => requestId + 1)
                    }}
                  >
                    Tạo mô hình 3D
                  </Button>
                </span>
              </Tooltip>
            }
            onBuildingChange={setBuildingId}
            onFloorChange={selectFloor}
          >
            <Tabs
              activeKey={activeTab}
              moreIcon={null}
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
        </main>
      </div>
    </div>
  )
}

