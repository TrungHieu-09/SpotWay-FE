import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Descriptions,
  Empty,
  Image,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Floor } from '../../types/floor'
import { GlassCard, StatusPill } from '../../components/ui'
import './BuildingDetailPage.css'

const { Text } = Typography

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [isFloorLoading, setIsFloorLoading] = useState(false)
  const [hasLoadedBuildings, setHasLoadedBuildings] = useState(false)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const isBuildingLoading = useBuildingStore((state) => state.isLoading)
  const building = useBuildingStore((state) =>
    buildingId ? state.getBuildingById(buildingId) : undefined,
  )
  const { message } = AntApp.useApp()

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
                <span className="bdp-floor-count">
                  {floors.length}/{building.floorCount} tầng
                </span>
              }
            >
              <Spin spinning={isFloorLoading}>
                {floors.length === 0 && !isFloorLoading ? (
                  <Empty description="Chưa có tầng" />
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
                        <div className="bdp-floor-item__info">
                          <span className="bdp-floor-item__name">{floor.name}</span>
                          <span className="bdp-floor-item__label">Level {floor.level}</span>
                        </div>
                        <StatusPill status={floor.publishStatus} />
                      </div>
                    ))}
                  </div>
                )}
              </Spin>
            </GlassCard>
          </>
        )}
      </Spin>
    </main>
  )
}
