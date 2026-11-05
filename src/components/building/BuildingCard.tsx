import { Button } from 'antd'
import { AppstoreOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import type { Building } from '../../types/building'
import { StatusPill } from '../ui'
import './BuildingCard.css'

export type BuildingCardProps = {
  building: Building
  delay: number
  onView: () => void
}

export function BuildingCard({ building, delay, onView }: BuildingCardProps) {
  const initial = building.name.slice(0, 2).toUpperCase()

  return (
    <article
      className="building-card"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Card hero */}
      <div className="building-card__hero">
        {building.planImageUrl ? (
          <img
            className="building-card__hero-img"
            src={building.planImageUrl}
            alt={`Floor plan of ${building.name}`}
          />
        ) : (
          <div className="building-card__hero-placeholder">
            <span>{initial}</span>
          </div>
        )}
        <div className="building-card__status-badge">
          <StatusPill status={building.status} />
        </div>
      </div>

      {/* Card body */}
      <div className="building-card__body">
        <h3 className="building-card__name">{building.name}</h3>
        <p className="building-card__address">{building.address}</p>

        <div className="building-card__meta">
          <span className="building-card__meta-item">
            <AppstoreOutlined />
            {building.floorCount} floors
          </span>
          <span className="building-card__meta-item">
            {new Intl.DateTimeFormat('vi-VN').format(new Date(building.createdAt))}
          </span>
        </div>
      </div>

      {/* Card actions */}
      <div className="building-card__actions">
        <Button
          block
          type="primary"
          icon={<EyeOutlined />}
          onClick={onView}
        >
          Xem chi tiết
        </Button>
        <Button icon={<EditOutlined />}>
          Sửa
        </Button>
      </div>
    </article>
  )
}
