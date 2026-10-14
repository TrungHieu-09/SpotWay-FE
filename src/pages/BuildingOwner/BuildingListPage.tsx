import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button } from 'antd'
import {
  ApartmentOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  AppstoreOutlined,
  BuildOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { CreateBuildingModal } from './CreateBuildingModal'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Building } from '../../types/building'
import { StatCard, StatusPill } from '../../components/ui'
import './BuildingListPage.css'

export function BuildingListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const navigate = useNavigate()
  const buildings = useBuildingStore((state) => state.buildings)
  const isLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
  }, [loadBuildings, message])

  const totalFloors = useMemo(
    () => buildings.reduce((sum, b) => sum + b.floorCount, 0),
    [buildings],
  )
  const activeCount = buildings.filter((b) => b.status === 'active').length

  return (
    <main className="workspace blp-workspace">
      {/* ── Page header ── */}
      <section className="blp-header">
        <div className="blp-header__text">
          <span className="blp-header__eyebrow">Building Owner</span>
          <h1 className="blp-header__title">Owned buildings</h1>
          <p className="blp-header__sub">
            Manage your building portfolio and floor configurations
          </p>
        </div>

        <div className="blp-header__actions">
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            className="blp-create-btn"
            onClick={() => setIsCreateOpen(true)}
          >
            Tạo building mới
          </Button>
        </div>
      </section>

      {/* ── Stats row ── */}
      <div className="blp-stats">
        <StatCard
          icon={<ApartmentOutlined />}
          label="Total Buildings"
          value={buildings.length}
          sub="in your portfolio"
          accent="violet"
        />
        <StatCard
          icon={<AppstoreOutlined />}
          label="Total Floors"
          value={totalFloors}
          sub="across all buildings"
          accent="cyan"
        />
        <StatCard
          icon={<BuildOutlined />}
          label="Active"
          value={activeCount}
          sub={`${buildings.length - activeCount} in draft`}
          accent="fuchsia"
        />
      </div>

      {/* ── Building cards grid ── */}
      {isLoading ? (
        <div className="blp-loading">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="blp-skeleton" />
          ))}
        </div>
      ) : (
        <div className="blp-grid">
          {buildings.map((building, idx) => (
            <BuildingCard
              key={building.id}
              building={building}
              delay={idx * 0.06}
              onView={() => navigate(`/owner/buildings/${building.id}`)}
            />
          ))}

          {/* "Add new" card */}
          <button
            className="blp-add-card"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Add new building"
          >
            <PlusOutlined className="blp-add-card__icon" />
            <span>Add Building</span>
          </button>
        </div>
      )}

      <CreateBuildingModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </main>
  )
}

/* ── Building card sub-component ── */
type BuildingCardProps = {
  building: Building
  delay: number
  onView: () => void
}

function BuildingCard({ building, delay, onView }: BuildingCardProps) {
  const initial = building.name.slice(0, 2).toUpperCase()

  return (
    <article
      className="blp-card"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Card hero */}
      <div className="blp-card__hero">
        {building.planImageUrl ? (
          <img
            className="blp-card__hero-img"
            src={building.planImageUrl}
            alt={`Floor plan of ${building.name}`}
          />
        ) : (
          <div className="blp-card__hero-placeholder">
            <span>{initial}</span>
          </div>
        )}
        <div className="blp-card__hero-overlay" />
        <div className="blp-card__status-badge">
          <StatusPill status={building.status} />
        </div>
      </div>

      {/* Card body */}
      <div className="blp-card__body">
        <h3 className="blp-card__name">{building.name}</h3>
        <p className="blp-card__address">{building.address}</p>

        <div className="blp-card__meta">
          <span className="blp-card__meta-item">
            <AppstoreOutlined />
            {building.floorCount} floors
          </span>
          <span className="blp-card__meta-item">
            {new Intl.DateTimeFormat('vi-VN').format(new Date(building.createdAt))}
          </span>
        </div>
      </div>

      {/* Card actions */}
      <div className="blp-card__actions">
        <Button
          block
          type="primary"
          icon={<EyeOutlined />}
          onClick={onView}
          className="blp-card__action-btn blp-card__action-btn--primary"
        >
          Xem chi tiết
        </Button>
        <Button
          icon={<EditOutlined />}
          className="blp-card__action-btn"
        >
          Sửa
        </Button>
      </div>
    </article>
  )
}
