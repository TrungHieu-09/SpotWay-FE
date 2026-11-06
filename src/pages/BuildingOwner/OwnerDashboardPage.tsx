import { useEffect, useState, useCallback } from 'react'
import { Button, Spin } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  RightOutlined,
  ShopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { getTenantOverview } from '../../api/tenant'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useAuthStore } from '../../auth/store'
import type { TenantOverview } from '../../types/auth'
import type { Building } from '../../types/building'
import { GlassCard, StatusPill } from '../../components/ui'
import { CreateBuildingModal } from './CreateBuildingModal'
import './OwnerDashboardPage.css'

export function OwnerDashboardPage() {
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const buildings = useBuildingStore((state) => state.buildings)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const user = useAuthStore((state) => state.user)

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [nextOverview] = await Promise.all([
        getTenantOverview(),
        loadBuildings(),
      ])
      setOverview(nextOverview)
    } catch (reason: any) {
      setError(reason?.message || 'Không thể tải dữ liệu không gian doanh nghiệp')
    } finally {
      setIsLoading(false)
    }
  }, [loadBuildings])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const totalBuildings = buildings.length
  const totalFloors = overview?.usage.floors ?? 0
  const publishedFloors = overview?.usage.publishedFloors ?? 0
  const totalManagers = overview?.usage.managers ?? 0
  const totalStores = overview?.usage.stores ?? 0
  const activePromos = overview?.usage.activePromotions ?? 0

  // Checklist milestones calculation with clear, professional Vietnamese
  const milestoneList = [
    {
      id: 'ws',
      stepNumber: 1,
      title: 'Khởi tạo không gian',
      description: overview?.tenant?.subdomain
        ? `Đã liên kết ${overview.tenant.subdomain}.spotway.app`
        : 'Không gian làm việc đã được kích hoạt thành công',
      completed: true,
      actionLabel: 'Đã hoàn tất',
    },
    {
      id: 'bldg',
      stepNumber: 2,
      title: 'Thêm tòa nhà đầu tiên',
      description:
        totalBuildings > 0
          ? `Đã cấu hình ${totalBuildings} tòa nhà trung tâm`
          : 'Khai báo cơ sở hạ tầng trung tâm để bắt đầu quản lý',
      completed: totalBuildings > 0,
      action: totalBuildings === 0 ? () => setIsCreateModalOpen(true) : undefined,
      actionLabel: '+ Thêm tòa nhà',
    },
    {
      id: 'floor',
      stepNumber: 3,
      title: 'Tải sơ đồ mặt sàn',
      description:
        totalFloors > 0
          ? `Đã số hóa ${totalFloors} mặt sàn kiến trúc`
          : 'Tải lên bản vẽ mặt bằng 2D để thiết lập tọa độ',
      completed: totalFloors > 0,
      link: totalBuildings > 0 ? `/owner/buildings/${buildings[0].id}` : '/owner/buildings',
      actionLabel: 'Quản lý tầng',
    },
    {
      id: 'manager',
      stepNumber: 4,
      title: 'Phân quyền quản lý',
      description:
        totalManagers > 0
          ? `Đã chỉ định ${totalManagers} nhân sự vận hành`
          : 'Chỉ định nhân sự giám sát và vận hành khu vực',
      completed: totalManagers > 0,
      link: '/owner/managers',
      actionLabel: 'Thêm quản lý',
    },
    {
      id: 'nav',
      stepNumber: 5,
      title: 'Kích hoạt dẫn đường 3D',
      description:
        publishedFloors > 0
          ? `${publishedFloors} tầng đã sẵn sàng phục vụ dẫn đường`
          : 'Xuất bản bản đồ và mạng lưới lộ trình di chuyển 3D',
      completed: publishedFloors > 0,
      link: totalBuildings > 0 ? `/owner/buildings/${buildings[0].id}` : '/owner/buildings',
      actionLabel: 'Xuất bản',
    },
  ]

  const completedMilestones = milestoneList.filter((m) => m.completed).length
  const progressPercent = Math.round((completedMilestones / milestoneList.length) * 100)

  // Plan name cleaner
  const cleanPlanName = overview?.plan.name?.replace(/\(Legacy\)/gi, '').trim() || 'Gói Dùng Thử Miễn Phí'

  return (
    <main className="workspace odp-workspace">
      {/* ── Top Header ── */}
      <section className="odp-header">
        <div className="odp-header__main">
          <div className="odp-header__tag-row">
            <span className="odp-header__eyebrow">KHÔNG GIAN DOANH NGHIỆP</span>
            <span className="odp-header__live-pill">
              <span className="odp-header__live-dot" />
              Trực tuyến
            </span>
          </div>
          <h1 className="odp-header__title">
            {overview?.tenant?.name || user?.tenant?.name || 'Không gian doanh nghiệp'}
          </h1>
          <p className="odp-header__sub">
            Trung tâm điều hành không gian số, quản lý mặt sàn và hệ thống dẫn đường thông minh.
          </p>
        </div>

        <div className="odp-header__actions">
          {overview?.tenant?.subdomain && (
            <div className="odp-domain-badge" title="Tên miền định danh không gian của bạn">
              <span className="odp-domain-badge__dot" />
              <span>{overview.tenant.subdomain}.spotway.app</span>
            </div>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="odp-create-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Thêm tòa nhà mới
          </Button>
        </div>
      </section>

      {/* ── Error Banner if any ── */}
      {error && (
        <div className="odp-banner-error">
          <span className="odp-banner-error__icon">⚠️</span>
          <span>{error}</span>
          <Button size="small" onClick={refreshData}>
            Thử lại
          </Button>
        </div>
      )}

      {isLoading && !overview ? (
        <div className="odp-loading">
          <Spin size="large" tip="Đang đồng bộ dữ liệu không gian..." />
        </div>
      ) : (
        <>
          {/* ── 4 Main KPI Cards ── */}
          <div className="odp-stats-grid">
            <StatCard
              icon={<ApartmentOutlined />}
              label="Tòa nhà quản lý"
              value={totalBuildings}
              max={overview?.plan.maxBuildings}
              sub={totalBuildings > 0 ? `${totalBuildings} tòa nhà đang hoạt động` : 'Chưa có tòa nhà nào trong hệ thống'}
              accent="violet"
            />
            <StatCard
              icon={<AppstoreOutlined />}
              label="Mặt sàn số hóa"
              value={totalFloors}
              sub={publishedFloors > 0 ? `${publishedFloors} tầng đã kích hoạt dẫn đường` : 'Chưa xuất bản bản đồ dẫn đường'}
              accent="cyan"
            />
            <StatCard
              icon={<TeamOutlined />}
              label="Đội ngũ quản lý"
              value={totalManagers}
              max={overview?.plan.maxManagers}
              sub={totalManagers > 0 ? `${totalManagers} quản lý khu vực được chỉ định` : 'Chưa chỉ định quản lý khu vực'}
              accent="green"
            />
            <StatCard
              icon={<ShopOutlined />}
              label="Gian hàng & Dịch vụ"
              value={totalStores}
              sub={activePromos > 0 ? `${activePromos} chương trình ưu đãi đang áp dụng` : 'Chưa có chương trình ưu đãi'}
              accent="fuchsia"
            />
          </div>

          {/* ── Getting Started / Deployment Checklist ── */}
          <section className="odp-section">
            <GlassCard className="odp-roadmap-card">
              <div className="odp-roadmap__header">
                <div>
                  <div className="odp-roadmap__eyebrow">HƯỚNG DẪN THIẾT LẬP</div>
                  <h3 className="odp-roadmap__title">Quy trình số hóa không gian</h3>
                  <p className="odp-roadmap__desc">
                    Hoàn tất các bước thiết lập dưới đây để kích hoạt sơ đồ 3D và hệ thống dẫn đường thông minh.
                  </p>
                </div>
                <div className="odp-roadmap__progress-box">
                  <div className="odp-roadmap__progress-text">
                    <span>Tiến độ thiết lập</span>
                    <strong>{completedMilestones} / {milestoneList.length} bước</strong>
                  </div>
                  <div className="odp-roadmap__progress-bar">
                    <div
                      className="odp-roadmap__progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="odp-milestones-grid">
                {milestoneList.map((item) => (
                  <div
                    key={item.id}
                    className={`odp-milestone ${item.completed ? 'odp-milestone--done' : 'odp-milestone--pending'}`}
                  >
                    <div className="odp-milestone__top">
                      <div className="odp-milestone__badge">
                        {item.completed ? (
                          <span className="odp-milestone__badge-done">
                            <CheckCircleFilled className="odp-milestone__check-icon" />
                            <span>Bước {item.stepNumber}</span>
                          </span>
                        ) : (
                          <span className="odp-milestone__badge-pending">
                            <span className="odp-milestone__step-dot" />
                            <span>Bước {item.stepNumber}</span>
                          </span>
                        )}
                      </div>
                      <span className={`odp-milestone__status-pill ${item.completed ? 'is-done' : 'is-pending'}`}>
                        {item.completed ? 'Đã xong' : 'Chờ làm'}
                      </span>
                    </div>

                    <div className="odp-milestone__content">
                      <h4 className="odp-milestone__title">{item.title}</h4>
                      <p className="odp-milestone__desc">{item.description}</p>
                    </div>

                    <div className="odp-milestone__action">
                      {item.completed ? (
                        <div className="odp-milestone__done-btn">
                          <CheckCircleFilled />
                          <span>Đã hoàn thành</span>
                        </div>
                      ) : item.action ? (
                        <Button
                          size="middle"
                          type="primary"
                          className="odp-milestone__btn odp-milestone__btn--primary"
                          onClick={item.action}
                        >
                          {item.actionLabel}
                        </Button>
                      ) : item.link ? (
                        <Link to={item.link} className="odp-milestone__btn-link">
                          <Button size="middle" className="odp-milestone__btn">
                            {item.actionLabel}
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>

          {/* ── Buildings Grid Section ── */}
          <section className="odp-section">
            <div className="odp-section-header">
              <div>
                <h3 className="odp-section-title">Danh sách Tòa nhà ({totalBuildings})</h3>
                <p className="odp-section-desc">Quản lý cơ sở hạ tầng, sơ đồ mặt sàn và hệ thống điểm dẫn đường.</p>
              </div>
              <div className="odp-section-actions">
                <Link to="/owner/buildings">
                  <Button icon={<ApartmentOutlined />} className="odp-view-all-btn">
                    Tất cả tòa nhà ({totalBuildings})
                  </Button>
                </Link>
              </div>
            </div>

            {totalBuildings === 0 ? (
              <GlassCard className="odp-empty-buildings">
                <div className="odp-empty-buildings__icon-wrap">
                  <div className="odp-empty-buildings__icon">
                    <ApartmentOutlined />
                  </div>
                </div>
                <h4 className="odp-empty-buildings__title">Chưa có tòa nhà nào trong không gian</h4>
                <p className="odp-empty-buildings__sub">
                  Hãy thêm tòa nhà đầu tiên để bắt đầu tải lên bản đồ mặt sàn, thiết lập điểm dịch vụ và kích hoạt dẫn đường 3D.
                </p>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  className="odp-create-btn"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Thêm tòa nhà đầu tiên
                </Button>
              </GlassCard>
            ) : (
              <div className="odp-buildings-grid">
                {buildings.map((building) => (
                  <BuildingCard key={building.id} building={building} />
                ))}
              </div>
            )}
          </section>

          {/* ── Bottom Section: Service Package & Quick Links ── */}
          <div className="odp-bottom-grid">
            {/* Service Package Card */}
            {overview && (
              <GlassCard className="odp-plan-card" title="Gói dịch vụ & Tài nguyên" accent>
                <div className="odp-plan__header">
                  <div className="odp-plan__badge">
                    <TrophyOutlined className="odp-plan__icon" />
                    <span>{cleanPlanName}</span>
                  </div>
                  <span className="odp-plan__expires">
                    Hạn sử dụng:{' '}
                    <strong>
                      {new Intl.DateTimeFormat('vi-VN').format(new Date(overview.tenant.planExpiresAt))}
                    </strong>
                  </span>
                </div>

                <div className="odp-plan-meters">
                  <PlanMeter
                    label="Tòa nhà"
                    used={totalBuildings}
                    max={overview.plan.maxBuildings}
                    accent="violet"
                  />
                  <PlanMeter
                    label="Quản lý khu vực"
                    used={totalManagers}
                    max={overview.plan.maxManagers}
                    accent="cyan"
                  />
                  <PlanMeter
                    label="Chủ gian hàng"
                    used={overview.usage.storeOwners}
                    max={overview.plan.maxStoreOwners}
                    accent="fuchsia"
                  />
                </div>

                <div className="odp-plan__footer">
                  <Link to="/owner/subscription" className="odp-plan__cta">
                    <ThunderboltOutlined /> Nâng cấp / Quản lý gói
                  </Link>
                </div>
              </GlassCard>
            )}

            {/* Quick Access Grid */}
            <GlassCard className="odp-quicklinks-card" title="Thao tác nhanh">
              <div className="odp-quicklinks">
                <QuickLink
                  to="/owner/buildings"
                  icon={<ApartmentOutlined />}
                  title="Cấu hình tòa nhà & mặt sàn"
                  desc="Quản lý bản đồ 2D/3D, lối đi và điểm neo dẫn đường"
                  color="violet"
                />
                <QuickLink
                  to="/owner/managers"
                  icon={<TeamOutlined />}
                  title="Phân quyền quản lý khu vực"
                  desc="Chỉ định và quản lý quyền hạn của đội ngũ vận hành"
                  color="cyan"
                />
                <QuickLink
                  to="/owner/store-owners"
                  icon={<ShopOutlined />}
                  title="Quản lý gian hàng & dịch vụ"
                  desc="Thiết lập vị trí gian hàng, kiosk và chương trình ưu đãi"
                  color="fuchsia"
                />
                <QuickLink
                  to="/owner/subscription"
                  icon={<CloudOutlined />}
                  title="Gói dịch vụ & Hóa đơn"
                  desc="Theo dõi dung lượng tài nguyên và nâng cấp gói dịch vụ"
                  color="green"
                />
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* ── Modal to Create Building directly ── */}
      <CreateBuildingModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          refreshData()
        }}
      />
    </main>
  )
}

/* ── Building Card Component ───────────────────────────── */

function BuildingCard({ building }: { building: Building }) {
  const formattedDate = building.createdAt
    ? new Intl.DateTimeFormat('vi-VN').format(new Date(building.createdAt))
    : 'Mới tạo'

  return (
    <div className="odp-building-card">
      <div className="odp-building-card__top">
        <div className="odp-building-card__info">
          <h4 className="odp-building-card__name">{building.name}</h4>
          <p className="odp-building-card__addr">
            <EnvironmentOutlined />
            <span>{building.address || 'Chưa cập nhật địa chỉ'}</span>
          </p>
        </div>
        <StatusPill status={building.status} />
      </div>

      <div className="odp-building-card__meta">
        <div className="odp-building-card__chip">
          <AppstoreOutlined />
          <span>{building.floorCount ?? 0} tầng mặt sàn</span>
        </div>
        <div className="odp-building-card__date">
          <ClockCircleOutlined />
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="odp-building-card__actions">
        <Link to={`/owner/buildings/${building.id}`} className="odp-building-card__btn odp-building-card__btn--primary">
          <span>Chi tiết & Mặt sàn</span>
          <RightOutlined />
        </Link>
        <Link to={`/guest?buildingId=${building.id}`} className="odp-building-card__btn odp-building-card__btn--ghost" title="Mở chế độ xem sơ đồ">
          <CompassOutlined />
          <span>Bản đồ</span>
        </Link>
      </div>
    </div>
  )
}

/* ── Stat Card Component ───────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  max,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  max?: number
  sub?: string
  accent: 'violet' | 'cyan' | 'fuchsia' | 'green'
}) {
  return (
    <div className={`odp-stat-box odp-stat-box--${accent}`}>
      <div className={`odp-stat-box__icon odp-stat-box__icon--${accent}`}>{icon}</div>
      <div className="odp-stat-box__content">
        <div className="odp-stat-box__val">
          {value}
          {max !== undefined && <span className="odp-stat-box__max">/{max}</span>}
        </div>
        <div className="odp-stat-box__label">{label}</div>
        {sub && <div className="odp-stat-box__sub">{sub}</div>}
      </div>
    </div>
  )
}

/* ── Plan Meter Component ──────────────────────────────── */

function PlanMeter({
  label,
  used,
  max,
  accent,
}: {
  label: string
  used: number
  max: number
  accent: 'violet' | 'cyan' | 'fuchsia'
}) {
  const pct = Math.min(100, Math.round((used / Math.max(max, 1)) * 100))
  return (
    <div className="odp-meter">
      <div className="odp-meter__header">
        <span className="odp-meter__label">{label}</span>
        <span className="odp-meter__count">
          <strong>{used}</strong> / {max}
        </span>
      </div>
      <div className="odp-meter__track">
        <div
          className={`odp-meter__fill odp-meter__fill--${accent}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ── Quick Link Component ──────────────────────────────── */

function QuickLink({
  to,
  icon,
  title,
  desc,
  color,
}: {
  to: string
  icon: React.ReactNode
  title: string
  desc: string
  color: string
}) {
  return (
    <Link to={to} className={`odp-quickitem odp-quickitem--${color}`}>
      <div className={`odp-quickitem__icon odp-quickitem__icon--${color}`}>{icon}</div>
      <div className="odp-quickitem__text">
        <span className="odp-quickitem__title">{title}</span>
        <span className="odp-quickitem__desc">{desc}</span>
      </div>
      <RightOutlined className="odp-quickitem__arrow" />
    </Link>
  )
}
