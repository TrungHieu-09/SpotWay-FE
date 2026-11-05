import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Input, Segmented } from 'antd'
import {
  AppstoreOutlined,
  ApartmentOutlined,
  ArrowRightOutlined,
  BuildOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { BuildingCard } from '../../components/building/BuildingCard'
import { EmptyState, StatCard, StatusPill } from '../../components/ui'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Building } from '../../types/building'
import { CreateBuildingModal } from './CreateBuildingModal'
import './DashboardPage.css'

type StatusFilter = 'all' | 'active' | 'draft'
type ViewMode = 'grid' | 'list'

const dateFormatter = new Intl.DateTimeFormat('vi-VN')

export function DashboardPage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const buildings = useBuildingStore((state) => state.buildings)
  const isLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
  }, [loadBuildings, message])

  const totalFloors = useMemo(() => buildings.reduce((sum, b) => sum + b.floorCount, 0), [buildings])
  const activeCount = useMemo(() => buildings.filter((b) => b.status === 'active').length, [buildings])
  const drafts = useMemo(() => buildings.filter((b) => b.status === 'draft'), [buildings])

  // Tâm điểm: building đang hoạt động mới nhất, không có thì lấy building mới nhất
  const spotlight = useMemo(() => {
    const byNewest = [...buildings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return byNewest.find((b) => b.status === 'active') ?? byNewest[0] ?? null
  }, [buildings])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return buildings.filter((b) => {
      if (filter !== 'all' && b.status !== filter) return false
      if (!needle) return true
      return b.name.toLowerCase().includes(needle) || b.address.toLowerCase().includes(needle)
    })
  }, [buildings, filter, query])

  const openBuilding = (id: string) => navigate(`/owner/buildings/${id}`)
  const isSearching = query.trim() !== '' || filter !== 'all'
  const isInitialLoading = isLoading && buildings.length === 0

  return (
    <main className="workspace dash">
      <div className="dash__main">
        <section className="dash__header">
          <div>
            <span className="sw-eyebrow">Building Owner</span>
            <h1 className="dash__title">Tổng quan</h1>
            <p className="dash__sub">Theo dõi các building, tầng và tiến độ hoàn thiện sơ đồ của bạn.</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
            Tạo building mới
          </Button>
        </section>

        {isInitialLoading ? (
          <div className="dash__hero-skeleton" />
        ) : (
          spotlight && (
            <SpotlightHero
              building={spotlight}
              onOpen={() => openBuilding(spotlight.id)}
              onView2D={() => navigate(`/owner/buildings/${spotlight.id}/2d`)}
            />
          )
        )}

        <div className="dash__stats">
          <StatCard icon={<ApartmentOutlined />} label="Buildings" value={buildings.length} sub="trong danh mục" accent="violet" />
          <StatCard icon={<AppstoreOutlined />} label="Tổng số tầng" value={totalFloors} sub="trên tất cả building" accent="cyan" />
          <StatCard icon={<BuildOutlined />} label="Đang hoạt động" value={activeCount} sub={`${drafts.length} bản nháp`} accent="fuchsia" />
        </div>

        <section>
          <div className="dash__section-head">
            <h2 className="dash__section-title">Buildings</h2>
            <div className="dash__tools">
              <Input
                allowClear
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                prefix={<SearchOutlined />}
                placeholder="Tìm theo tên hoặc địa chỉ"
                className="dash__search"
                aria-label="Tìm building"
              />
              <Segmented<StatusFilter>
                value={filter}
                onChange={setFilter}
                options={[
                  { label: 'Tất cả', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Draft', value: 'draft' },
                ]}
              />
              <Segmented<ViewMode>
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { label: <AppstoreOutlined aria-label="Dạng lưới" />, value: 'grid' },
                  { label: <UnorderedListOutlined aria-label="Dạng danh sách" />, value: 'list' },
                ]}
              />
            </div>
          </div>

          {isInitialLoading ? (
            <div className="dash__grid">
              {[1, 2, 3].map((i) => <div key={i} className="dash__card-skeleton" />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={isSearching ? <SearchOutlined /> : <ApartmentOutlined />}
              title={isSearching ? 'Không có building phù hợp' : 'Chưa có building nào'}
              description={
                isSearching
                  ? 'Thử đổi từ khoá hoặc bộ lọc trạng thái.'
                  : 'Tạo building đầu tiên để bắt đầu thêm tầng, sơ đồ và điểm đến.'
              }
              action={
                isSearching ? (
                  <Button onClick={() => { setQuery(''); setFilter('all') }}>Xoá bộ lọc</Button>
                ) : (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
                    Tạo building mới
                  </Button>
                )
              }
            />
          ) : (
            <div className={`dash__grid ${viewMode === 'list' ? 'building-grid--list' : ''}`}>
              {visible.map((building, idx) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  delay={idx * 0.05}
                  onView={() => openBuilding(building.id)}
                />
              ))}
              {!isSearching && (
                <button type="button" className="dash__add-card" onClick={() => setIsCreateOpen(true)} aria-label="Tạo building mới">
                  <PlusOutlined className="dash__add-icon" />
                  <span className="dash__add-title">Building mới</span>
                  <span className="dash__add-sub">Tải sơ đồ và thêm tầng</span>
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="dash__aside">
        <section className="dash__widget">
          <h3 className="dash__widget-title">Cần hoàn thiện</h3>
          {drafts.length === 0 ? (
            <p className="dash__widget-empty">Không có bản nháp nào. Mọi building đều đang hoạt động.</p>
          ) : (
            <ul className="dash__list">
              {drafts.slice(0, 5).map((building) => (
                <li key={building.id}>
                  <button type="button" className="dash__list-item" onClick={() => openBuilding(building.id)}>
                    <span className="dash__list-main">
                      <span className="dash__list-name">{building.name}</span>
                      <span className="dash__list-meta">
                        {building.floorCount} tầng · {dateFormatter.format(new Date(building.createdAt))}
                      </span>
                    </span>
                    <ArrowRightOutlined className="dash__list-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash__widget">
          <h3 className="dash__widget-title">Lối tắt</h3>
          <ul className="dash__list">
            <li>
              <button type="button" className="dash__list-item" onClick={() => navigate('/owner/buildings')}>
                <span className="dash__list-main">
                  <span className="dash__list-name">Tất cả buildings</span>
                </span>
                <ArrowRightOutlined className="dash__list-arrow" />
              </button>
            </li>
            {spotlight && (
              <li>
                <button
                  type="button"
                  className="dash__list-item"
                  onClick={() => navigate(`/owner/buildings/${spotlight.id}/overview`)}
                >
                  <span className="dash__list-main">
                    <span className="dash__list-name">Xem tổng quan 3D</span>
                    <span className="dash__list-meta">{spotlight.name}</span>
                  </span>
                  <ArrowRightOutlined className="dash__list-arrow" />
                </button>
              </li>
            )}
          </ul>
        </section>
      </aside>

      <CreateBuildingModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </main>
  )
}

type SpotlightHeroProps = { building: Building; onOpen: () => void; onView2D: () => void }

function SpotlightHero({ building, onOpen, onView2D }: SpotlightHeroProps) {
  return (
    <section className="dash-hero">
      <div className="dash-hero__media">
        {building.planImageUrl ? (
          <img src={building.planImageUrl} alt={`Sơ đồ ${building.name}`} className="dash-hero__img" />
        ) : (
          <span className="dash-hero__initial">{building.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="dash-hero__body">
        <div className="dash-hero__top">
          <span className="sw-eyebrow">Building nổi bật</span>
          <StatusPill status={building.status} />
        </div>
        <h2 className="dash-hero__name">{building.name}</h2>
        <p className="dash-hero__address">{building.address}</p>
        <dl className="dash-hero__facts">
          <div>
            <dt>Số tầng</dt>
            <dd>{building.floorCount}</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd>{dateFormatter.format(new Date(building.createdAt))}</dd>
          </div>
        </dl>
        <div className="dash-hero__actions">
          <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={onOpen}>
            Mở building
          </Button>
          <Button icon={<EyeOutlined />} onClick={onView2D}>
            Xem sơ đồ 2D
          </Button>
        </div>
      </div>
    </section>
  )
}
