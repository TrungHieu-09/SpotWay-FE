import { Typography } from 'antd'

type BrandLogoProps = { compact?: boolean; light?: boolean }

export function BrandLogo({ compact = false, light = false }: BrandLogoProps) {
  return (
    <div className={`brand-lockup${compact ? ' brand-lockup-compact' : ''}${light ? ' brand-lockup-light' : ''}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="presentation">
          <path d="M7 24V9h7v6h4V9h7v15h-5v-6h-4v6H7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="8" cy="8" r="2.2" fill="var(--gold-500)" />
        </svg>
      </span>
      {!compact ? <span className="brand-copy"><Typography.Text strong>Indoor Spatial</Typography.Text><small>Bản đồ trong nhà cho doanh nghiệp</small></span> : null}
    </div>
  )
}
