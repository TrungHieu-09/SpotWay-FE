import type { ReactNode } from 'react'
import './GlassCard.css'

type GlassCardProps = {
  children: ReactNode
  title?: ReactNode
  extra?: ReactNode
  className?: string
  accent?: boolean
  noPadding?: boolean
}

export function GlassCard({
  children,
  title,
  extra,
  className = '',
  accent = false,
  noPadding = false,
}: GlassCardProps) {
  return (
    <div className={`glass-card ${accent ? 'glass-card--accent' : ''} ${className}`}>
      {(title || extra) && (
        <div className="glass-card__header">
          {title && <span className="glass-card__title">{title}</span>}
          {extra && <div className="glass-card__extra">{extra}</div>}
        </div>
      )}
      <div className={`glass-card__body ${noPadding ? 'glass-card__body--no-padding' : ''}`}>
        {children}
      </div>
    </div>
  )
}
