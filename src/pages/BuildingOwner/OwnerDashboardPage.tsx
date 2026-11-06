import { useEffect, useState } from 'react'
import { Button, Spin } from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Building } from '../../types/building'
import { GlassCard, StatusPill } from '../../components/ui'
import './OwnerDashboardPage.css'

type FloorCounts = { total: number; published: number }

/**
 * Số liệu tổng quan tính từ API có sẵn của BE (toà nhà + tầng).
 * BE chưa có /tenant/overview nên chưa có gói dịch vụ, hạn mức hay số lượng nhân sự.
 */
export function OwnerDashboardPage() {
  const [floorCounts, setFloorCounts] = useState<Record<string, FloorCounts>>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const buildings = useBuildingStore((state) => state.buildings)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)

  useEffect(() => {
    let cancelled = false
    loadBuildings()
      .then(async () => {
        const loaded = useBuildingStore.getState().buildings
        const entries = await Promise.all(
          loaded.map(async (building) => {
            const floors = await getFloors(building.id).catch(() => [])
            return [
              building.id,
              { total: floors.length, published: floors.filter((floor) => floor.publishStatus === 'published').length },
            ] as const
          }),
        )
        if (!cancelled) setFloorCounts(Object.fromEntries(entries))
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
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

  const counts = Object.values(floorCounts)
  const totalFloors = counts.reduce((sum, item) => sum + item.total, 0)
  const publishedFloors = counts.reduce((sum, item) => sum + item.published, 0)

  return (
    <main className="workspace odp-workspace">
      <section className="odp-header">
        <div>
          <span className="odp-header__eyebrow">Chủ tòa nhà</span>
          <h1 className="odp-header__title">Tổng quan</h1>
          <p className="odp-header__sub">Tổng quan nhanh về các tòa nhà và tầng bạn đang quản lý.</p>
        </div>
      </section>

      {isLoading ? (
        <div className="odp-loading">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <div className="odp-stats">
            <DashStat icon={<ApartmentOutlined />} label="Tòa nhà" value={buildings.length} accent="violet" />
            <DashStat icon={<AppstoreOutlined />} label="Tổng số tầng" value={totalFloors} accent="cyan" />
            <DashStat icon={<CheckCircleOutlined />} label="Tầng đã xuất bản" value={publishedFloors} accent="green" />
            <DashStat icon={<EditOutlined />} label="Tầng bản nháp" value={totalFloors - publishedFloors} accent="fuchsia" />
          </div>

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
                  <BuildingRow key={building.id} building={building} floors={floorCounts[building.id]?.total} />
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

function BuildingRow({ building, floors }: { building: Building; floors?: number }) {
  return (
    <div className="odp-building-row">
      <span className="odp-building-row__name">
        <CheckCircleOutlined className="odp-building-row__dot" />
        {building.name}
      </span>
      <span className="odp-building-row__addr">{building.address}</span>
      <span className="odp-building-row__floors">{floors ?? building.floorCount}</span>
      <span>
        <StatusPill status={building.status} />
      </span>
      <span className="odp-building-row__date">
        {new Intl.DateTimeFormat('vi-VN').format(new Date(building.createdAt))}
      </span>
    </div>
  )
}
