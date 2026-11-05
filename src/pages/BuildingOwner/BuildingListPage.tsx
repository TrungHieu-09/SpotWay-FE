import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button } from 'antd'
import {
  ApartmentOutlined,
  PlusOutlined,
  AppstoreOutlined,
  BuildOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { CreateBuildingModal } from './CreateBuildingModal'
import { useBuildingStore } from '../../store/useBuildingStore'
import { BuildingCard } from '../../components/building/BuildingCard'
import { EmptyState, StatCard } from '../../components/ui'
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
            icon={<PlusOutlined />}
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
      ) : buildings.length === 0 ? (
        <EmptyState
          icon={<ApartmentOutlined />}
          title="Chưa có building nào"
          description="Tạo building đầu tiên để bắt đầu thêm tầng, sơ đồ và điểm đến."
          action={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
              Tạo building mới
            </Button>
          }
        />
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
