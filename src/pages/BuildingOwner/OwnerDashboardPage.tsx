import { useEffect, useState } from 'react'
import { App as AntApp, Button, Spin } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { getTenantOverview } from '../../api/tenant'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { TenantOverview } from '../../types/auth'
import type { Building } from '../../types/building'
import { GlassCard, StatusPill } from '../../components/ui'
import './OwnerDashboardPage.css'

export function OwnerDashboardPage() {
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const buildings = useBuildingStore((state) => state.buildings)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const { message } = AntApp.useApp()

  useEffect(() => {
    Promise.all([getTenantOverview(), loadBuildings()])
      .then(([nextOverview]) => setOverview(nextOverview))
      .catch((reason: Error) => setError(reason.message))
  }, [loadBuildings])

  if (error) {
    return (
      <main className="workspace odp-workspace">
        <GlassCard>
          <div className="odp-error">
            <span className="odp-error__icon">⚠️</span>
            <p>{error}</p>
          </div>
        </GlassCard>
      </main>
    )
  }

  return (
    <main className="workspace odp-workspace">
      {/* ── Header ── */}
      <section className="odp-header">
        <div>
          <span className="odp-header__eyebrow">Building Owner</span>
          <h1 className="odp-header__title">Tổng quan doanh nghiệp</h1>
          <p className="odp-header__sub">
            Tổng quan nhanh về tài sản, đội ngũ và mức sử dụng gói dịch vụ.
          </p>
        </div>
        {overview && (
          <div className="odp-domain-badge">
            <span className="odp-domain-badge__dot" />
            <span>{overview.tenant.subdomain}.indoor-spatial.vn</span>
          </div>
        )}
      </section>

      {!overview ? (
        <div className="odp-loading">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* ── KPI Stats Grid ── */}
          <div className="odp-stats">
            <DashStat
              icon={<ApartmentOutlined />}
              label="Tòa nhà"
              value={overview.usage.buildings}
              max={overview.plan.maxBuildings}
              accent="violet"
            />
            <DashStat
              icon={<AppstoreOutlined />}
              label="Tổng số tầng"
              value={overview.usage.floors}
              sub={`${overview.usage.publishedFloors} đã xuất bản`}
              accent="cyan"
            />
            <DashStat
              icon={<ShopOutlined />}
              label="Gian hàng"
              value={overview.usage.stores}
              accent="fuchsia"
            />
            <DashStat
              icon={<TeamOutlined />}
              label="Quản lý"
              value={overview.usage.managers}
              max={overview.plan.maxManagers}
              accent="green"
            />
            <DashStat
              icon={<ShopOutlined />}
              label="Chủ gian hàng"
              value={overview.usage.storeOwners}
              max={overview.plan.maxStoreOwners}
              accent="violet"
            />
            <DashStat
              icon={<RiseOutlined />}
              label="Khuyến mãi đang chạy"
              value={overview.usage.activePromotions}
              accent="cyan"
            />
          </div>

          {/* ── Middle row: Plan + Quick links ── */}
          <div className="odp-mid-row">
            {/* Plan card */}
            <GlassCard className="odp-plan-card" title="Gói dịch vụ hiện tại" accent>
              <div className="odp-plan__name">
                <TrophyOutlined className="odp-plan__icon" />
                <span>{overview.plan.name}</span>
              </div>
              <p className="odp-plan__expire">
                Hết hạn:{' '}
                <strong>
                  {new Intl.DateTimeFormat('vi-VN').format(
                    new Date(overview.tenant.planExpiresAt),
                  )}
                </strong>
              </p>

              <div className="odp-plan-meters">
                <PlanMeter
                  label="Tòa nhà"
                  used={overview.usage.buildings}
                  max={overview.plan.maxBuildings}
                  accent="violet"
                />
                <PlanMeter
                  label="Quản lý"
                  used={overview.usage.managers}
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

              <Link to="/owner/subscription" className="odp-plan__cta">
                <ThunderboltOutlined /> Nâng cấp / Gia hạn
              </Link>
            </GlassCard>

            {/* Quick links */}
            <GlassCard className="odp-quicklinks-card" title="Truy cập nhanh">
              <div className="odp-quicklinks">
                <QuickLink to="/owner/buildings" icon={<ApartmentOutlined />} label="Tòa nhà" color="violet" />
                <QuickLink to="/owner/managers" icon={<TeamOutlined />} label="Quản lý" color="cyan" />
                <QuickLink to="/owner/store-owners" icon={<ShopOutlined />} label="Chủ gian hàng" color="fuchsia" />
                <QuickLink to="/owner/subscription" icon={<CloudOutlined />} label="Gói dịch vụ" color="green" />
              </div>
            </GlassCard>
          </div>

          {/* ── Building list ── */}
          <GlassCard
            title={`Danh sách tòa nhà (${buildings.length})`}
            extra={
              <Link to="/owner/buildings">
                <Button type="primary" size="small" icon={<ApartmentOutlined />}>
                  Quản lý
                </Button>
              </Link>
            }
          >
            {buildings.length === 0 ? (
              <div className="odp-empty">
                <ApartmentOutlined className="odp-empty__icon" />
                <p>Chưa có tòa nhà nào</p>
                <Link to="/owner/buildings">
                  <Button type="primary">Tạo tòa nhà đầu tiên</Button>
                </Link>
              </div>
            ) : (
              <div className="odp-building-table">
                <div className="odp-building-table__head">
                  <span>Tên</span>
                  <span>Địa chỉ</span>
                  <span>Số tầng</span>
                  <span>Trạng thái</span>
                  <span>Ngày tạo</span>
                </div>
                {buildings.map((building) => (
                  <BuildingRow key={building.id} building={building} />
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </main>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function DashStat({
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
    <div className={`odp-stat odp-stat--${accent}`}>
      <div className={`odp-stat__icon odp-stat__icon--${accent}`}>{icon}</div>
      <div>
        <div className="odp-stat__value">
          {value}
          {max !== undefined && <span className="odp-stat__max">/{max}</span>}
        </div>
        <div className="odp-stat__label">{label}</div>
        {sub && <div className="odp-stat__sub">{sub}</div>}
      </div>
    </div>
  )
}

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
          {used}/{max}
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

function QuickLink({
  to,
  icon,
  label,
  color,
}: {
  to: string
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <Link to={to} className={`odp-quicklink odp-quicklink--${color}`}>
      <div className={`odp-quicklink__icon odp-quicklink__icon--${color}`}>{icon}</div>
      <span>{label}</span>
      <span className="odp-quicklink__arrow">→</span>
    </Link>
  )
}

function BuildingRow({ building }: { building: Building }) {
  return (
    <div className="odp-building-row">
      <span className="odp-building-row__name">
        <CheckCircleOutlined className="odp-building-row__dot" />
        {building.name}
      </span>
      <span className="odp-building-row__addr">{building.address}</span>
      <span className="odp-building-row__floors">{building.floorCount}</span>
      <span>
        <StatusPill status={building.status} />
      </span>
      <span className="odp-building-row__date">
        {new Intl.DateTimeFormat('vi-VN').format(new Date(building.createdAt))}
      </span>
    </div>
  )
}
