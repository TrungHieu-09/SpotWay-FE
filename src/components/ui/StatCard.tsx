import type { ReactNode } from 'react'
import './StatCard.css'

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: 'violet' | 'cyan' | 'fuchsia'
}

export function StatCard({ icon, label, value, sub, accent = 'violet' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {sub && <span className="stat-card__sub">{sub}</span>}
      </div>
      <div className="stat-card__glow" />
    </div>
  )
}
