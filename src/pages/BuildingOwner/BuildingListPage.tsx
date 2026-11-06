import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Popconfirm } from 'antd'
import {
  ApartmentOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  AppstoreOutlined,
  BuildOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { CreateBuildingModal } from './CreateBuildingModal'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Building } from '../../types/building'
import { StatCard, StatusPill } from '../../components/ui'
import './BuildingListPage.css'
import './OwnerStaffPage.css'

export function BuildingListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editErrors, setEditErrors] = useState<{ name?: string; address?: string }>({})
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()
  const buildings = useBuildingStore((state) => state.buildings)
  const isLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const updateBuilding = useBuildingStore((state) => state.updateBuilding)
  const deleteBuilding = useBuildingStore((state) => state.deleteBuilding)
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
  }, [loadBuildings, message])

  const totalFloors = useMemo(
    () => buildings.reduce((sum, b) => sum + b.floorCount, 0),
    [buildings],
  )
  const activeCount = buildings.filter((b) => b.status === 'active').length

  function openEdit(building: Building) {
    setEditingBuilding(building)
    setEditName(building.name)
    setEditAddress(building.address)
    setEditErrors({})
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBuilding) return
    const nextErrors: { name?: string; address?: string } = {}
    if (!editName.trim()) nextErrors.name = 'Vui lòng nhập tên tòa nhà'
    if (!editAddress.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ'
    if (Object.keys(nextErrors).length > 0) {
      setEditErrors(nextErrors)
      return
    }
    setEditErrors({})
    setIsSaving(true)
    try {
      await updateBuilding(editingBuilding.id, {
        name: editName.trim(),
        address: editAddress.trim(),
      })
      message.success('Đã cập nhật thông tin tòa nhà')
      setEditingBuilding(null)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(buildingId: string) {
    try {
      await deleteBuilding(buildingId)
      message.success('Đã xóa tòa nhà')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return (
    <main className="workspace blp-workspace">
      {/* ── Page header ── */}
      <section className="blp-header">
        <div className="blp-header__text">
          <span className="blp-header__eyebrow">Chủ tòa nhà</span>
          <h1 className="blp-header__title">Danh sách tòa nhà</h1>
          <p className="blp-header__sub">
            Quản lý danh mục tòa nhà và cấu hình mặt bằng các tầng
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
            Thêm tòa nhà mới
          </Button>
        </div>
      </section>

      {/* ── Stats row ── */}
      <div className="blp-stats">
        <StatCard
          icon={<ApartmentOutlined />}
          label="Tổng số tòa nhà"
          value={buildings.length}
          sub="trong danh mục quản lý"
          accent="violet"
        />
        <StatCard
          icon={<AppstoreOutlined />}
          label="Tổng số tầng"
          value={totalFloors}
          sub="trên tất cả tòa nhà"
          accent="cyan"
        />
        <StatCard
          icon={<BuildOutlined />}
          label="Đang hoạt động"
          value={activeCount}
          sub={`${buildings.length - activeCount} bản nháp`}
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
              onEdit={() => openEdit(building)}
              onDelete={() => handleDelete(building.id)}
            />
          ))}

          {/* "Add new" card */}
          <button
            className="blp-add-card"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Add new building"
          >
            <PlusOutlined className="blp-add-card__icon" />
            <span>Thêm tòa nhà</span>
          </button>
        </div>
      )}

      <CreateBuildingModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* ── Custom Spatial Glass Edit Building Modal ── */}
      {editingBuilding && (
        <div
          className="swm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) {
              setEditingBuilding(null)
            }
          }}
        >
          <div className="swm-card" role="dialog" aria-modal="true">
            <div className="swm-topline" />

            <div className="swm-head">
              <div className="swm-head__left">
                <div className="swm-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    edit_square
                  </span>
                </div>
                <div>
                  <h2 className="swm-title">Chỉnh sửa Tòa nhà</h2>
                  <p className="swm-subtitle">
                    Cập nhật tên hiển thị và địa chỉ của cơ sở hạ tầng
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="swm-close"
                onClick={() => setEditingBuilding(null)}
                disabled={isSaving}
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>

            <form className="swm-form" onSubmit={(e) => void handleEditSubmit(e)} noValidate>
              <div className="swm-field">
                <label className="swm-label">
                  <span>
                    Tên tòa nhà <span className="swm-req">*</span>
                  </span>
                </label>
                <div className="swm-input-wrap">
                  <span className="material-symbols-outlined swm-input-icon">domain</span>
                  <input
                    type="text"
                    className="swm-input"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value)
                      if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: undefined }))
                    }}
                  />
                </div>
                {editErrors.name && (
                  <p className="swm-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {editErrors.name}
                  </p>
                )}
              </div>

              <div className="swm-field">
                <label className="swm-label">
                  <span>
                    Địa chỉ <span className="swm-req">*</span>
                  </span>
                </label>
                <div className="swm-input-wrap">
                  <span className="material-symbols-outlined swm-input-icon">location_on</span>
                  <input
                    type="text"
                    className="swm-input"
                    value={editAddress}
                    onChange={(e) => {
                      setEditAddress(e.target.value)
                      if (editErrors.address) {
                        setEditErrors((prev) => ({ ...prev, address: undefined }))
                      }
                    }}
                  />
                </div>
                {editErrors.address && (
                  <p className="swm-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {editErrors.address}
                  </p>
                )}
              </div>

              <div className="swm-footer">
                <button
                  type="button"
                  className="swm-btn"
                  onClick={() => setEditingBuilding(null)}
                  disabled={isSaving}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="swm-btn swm-btn--primary"
                  disabled={isSaving}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {isSaving ? 'hourglass_top' : 'check'}
                  </span>
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

/* ── Building card sub-component ── */
type BuildingCardProps = {
  building: Building
  delay: number
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function BuildingCard({ building, delay, onView, onEdit, onDelete }: BuildingCardProps) {
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
            {building.floorCount} tầng
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
          onClick={onEdit}
        >
          Sửa
        </Button>
        <Popconfirm
          title="Xóa tòa nhà này?"
          description="Các tầng, POI và dữ liệu bản đồ sẽ bị xóa."
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <Button
            icon={<DeleteOutlined />}
            danger
            className="blp-card__action-btn"
          />
        </Popconfirm>
      </div>
    </article>
  )
}
