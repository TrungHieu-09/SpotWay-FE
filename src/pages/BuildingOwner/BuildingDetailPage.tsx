import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Empty,
  Image,
  Popconfirm,
  Spin,
} from 'antd'
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CompassOutlined,
  DeleteOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteFloor, getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Floor } from '../../types/floor'
import { GlassCard, StatusPill } from '../../components/ui'
import { CreateFloorModal } from './CreateFloorModal'
import { UploadFloorPlanModal } from './UploadFloorPlanModal'
import { CreateStoreModal } from './CreateStoreModal'
import { AssignManagerModal } from './AssignManagerModal'
import './BuildingDetailPage.css'

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [isFloorLoading, setIsFloorLoading] = useState(false)
  const [hasLoadedBuildings, setHasLoadedBuildings] = useState(false)
  const [createFloorOpen, setCreateFloorOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [createStoreOpen, setCreateStoreOpen] = useState(false)
  const [assignManagerOpen, setAssignManagerOpen] = useState(false)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const isBuildingLoading = useBuildingStore((state) => state.isLoading)
  const building = useBuildingStore((state) =>
    buildingId ? state.getBuildingById(buildingId) : undefined,
  )
  const { message } = AntApp.useApp()

  async function handleDeleteFloor(floorId: string) {
    try {
      await deleteFloor(floorId)
      setFloors((prev) => prev.filter((f) => f.id !== floorId))
      message.success('Đã xóa tầng')
    } catch (err) {
      message.error((err as Error).message)
    }
  }

  useEffect(() => {
    loadBuildings()
      .catch((error: Error) => message.error(error.message))
      .finally(() => setHasLoadedBuildings(true))
  }, [loadBuildings, message])

  useEffect(() => {
    if (!buildingId) { setFloors([]); return }
    setIsFloorLoading(true)
    getFloors(buildingId)
      .then(setFloors)
      .catch((error: Error) => message.error(error.message))
      .finally(() => setIsFloorLoading(false))
  }, [buildingId, message])

  if (!building && hasLoadedBuildings && !isBuildingLoading) {
    return (
      <main className="workspace">
        <GlassCard>
          <Empty description="Không tìm thấy building">
            <Button onClick={() => navigate('/owner/buildings')}>
              Quay lại danh sách
            </Button>
          </Empty>
        </GlassCard>
      </main>
    )
  }

  return (
    <main className="workspace bdp-workspace">
      {/* ── Header ── */}
      <section className="bdp-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/owner/buildings')}
          className="bdp-back-btn"
        >
          Danh sách
        </Button>
        <div className="bdp-header__text">
          <span className="bdp-header__eyebrow">Building Owner</span>
          <h1 className="bdp-header__title">
            {building?.name ?? 'Building detail'}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {buildingId && (
            <Button icon={<TeamOutlined />} onClick={() => setAssignManagerOpen(true)}>
              Gán Manager
            </Button>
          )}
          {buildingId && (
            <Button icon={<ShopOutlined />} onClick={() => setCreateStoreOpen(true)}>
              Tạo điểm đến
            </Button>
          )}
          {buildingId && (
            <Button
              type="primary"
              icon={<CompassOutlined />}
              onClick={() => navigate(`/navigate/${buildingId}`)}
            >
              Mở chỉ đường khách
            </Button>
          )}
          {buildingId && (
            <Button
              icon={<PictureOutlined />}
              onClick={() => navigate(`/owner/buildings/${buildingId}/2d`)}
            >
              Xem sơ đồ 2D
            </Button>
          )}
          {buildingId && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => navigate(`/owner/buildings/${buildingId}/overview`)}
            >
              Tổng quan 2.5D
            </Button>
          )}
        </div>
        {building && <StatusPill status={building.status} />}
      </section>

      <Spin spinning={isBuildingLoading}>
        {building && (
          <>
            {/* ── Top grid: info + plan image ── */}
            <div className="bdp-top-grid">
              {/* Info card */}
              <GlassCard title="Thông tin tòa nhà" accent>
                <div className="bdp-info-list">
                  <div className="bdp-info-row">
                    <span className="bdp-info-row__icon"><EnvironmentOutlined /></span>
                    <div>
                      <span className="bdp-info-row__label">Địa chỉ</span>
                      <span className="bdp-info-row__value">{building.address}</span>
                    </div>
                  </div>
                  <div className="bdp-info-row">
                    <span className="bdp-info-row__icon"><AppstoreOutlined /></span>
                    <div>
                      <span className="bdp-info-row__label">Số tầng</span>
                      <span className="bdp-info-row__value">{building.floorCount}</span>
                    </div>
                  </div>
                  <div className="bdp-info-row">
                    <span className="bdp-info-row__icon"><CheckCircleOutlined /></span>
                    <div>
                      <span className="bdp-info-row__label">Trạng thái</span>
                      <StatusPill status={building.status} />
                    </div>
                  </div>
                  <div className="bdp-info-row">
                    <span className="bdp-info-row__icon"><CalendarOutlined /></span>
                    <div>
                      <span className="bdp-info-row__label">Ngày tạo</span>
                      <span className="bdp-info-row__value">
                        {new Intl.DateTimeFormat('vi-VN').format(new Date(building.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Floor plan image */}
              <GlassCard title="Sơ đồ mặt bằng">
                {building.planImageUrl ? (
                  <Image
                    className="building-plan-image"
                    src={building.planImageUrl}
                    alt={`Sơ đồ ${building.name}`}
                  />
                ) : (
                  <div className="bdp-no-plan">
                    <AppstoreOutlined className="bdp-no-plan__icon" />
                    <span>Chưa có ảnh sơ đồ</span>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* ── Floors list ── */}
            <GlassCard
              title="Danh sách tầng"
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="bdp-floor-count">
                    {floors.length}/{building.floorCount} tầng
                  </span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateFloorOpen(true)}
                  >
                    Thêm tầng
                  </Button>
                </div>
              }
            >
              <Spin spinning={isFloorLoading}>
                {floors.length === 0 && !isFloorLoading ? (
                  <Empty description="Chưa có tầng nào">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCreateFloorOpen(true)}
                    >
                      Thêm tầng đầu tiên
                    </Button>
                  </Empty>
                ) : (
                  <div className="bdp-floor-list">
                    {floors.map((floor, idx) => (
                      <div
                        key={floor.id}
                        className="bdp-floor-item"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="bdp-floor-item__level">
                          <span>{floor.level}</span>
                        </div>

                        {floor.mapImageUrl ? (
                          <img
                            src={floor.mapImageUrl}
                            alt={`Sơ đồ ${floor.name}`}
                            className="bdp-floor-thumb"
                          />
                        ) : (
                          <div className="bdp-floor-thumb-placeholder" title="Chưa có sơ đồ">
                            <PictureOutlined />
                          </div>
                        )}

                        <div className="bdp-floor-item__info">
                          <span className="bdp-floor-item__name">{floor.name}</span>
                          <span className="bdp-floor-item__label">
                            Level {floor.level} {floor.mapImageUrl ? `· ${floor.mapWidth}×${floor.mapHeight}px` : '· Chưa có sơ đồ'}
                          </span>
                        </div>

                        <StatusPill status={floor.publishStatus} />

                        <div className="bdp-floor-item__actions">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() =>
                              navigate(
                                `/owner/buildings/${buildingId}/2d?floorId=${floor.id}`,
                              )
                            }
                          >
                            Xem 2D
                          </Button>
                          <Button
                            size="small"
                            icon={<CloudUploadOutlined />}
                            onClick={() => setEditingFloor(floor)}
                          >
                            Sơ đồ
                          </Button>
                          <Popconfirm
                            title="Xác nhận xóa tầng?"
                            description="Tầng và toàn bộ dữ liệu sơ đồ sẽ bị xóa."
                            onConfirm={() => handleDeleteFloor(floor.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Spin>
            </GlassCard>
          </>
        )}
      </Spin>

      {/* ── Modals ── */}
      {buildingId && (
        <>
          <CreateFloorModal
            buildingId={buildingId}
            open={createFloorOpen}
            existingLevels={floors.map((f) => f.level)}
            onClose={() => setCreateFloorOpen(false)}
            onSuccess={(newFloor) => {
              setFloors((prev) =>
                [...prev, newFloor].sort((a, b) => a.level - b.level),
              )
            }}
          />

          <UploadFloorPlanModal
            buildingId={buildingId}
            floor={editingFloor}
            open={Boolean(editingFloor)}
            onClose={() => setEditingFloor(null)}
            onSuccess={(updated) => {
              setFloors((prev) =>
                prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)),
              )
            }}
          />
          <CreateStoreModal floors={floors} open={createStoreOpen} onClose={() => setCreateStoreOpen(false)} />
          <AssignManagerModal buildingId={buildingId} open={assignManagerOpen} onClose={() => setAssignManagerOpen(false)} />
        </>
      )}
    </main>
  )
}
