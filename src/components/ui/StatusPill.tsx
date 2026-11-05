import './StatusPill.css'

type StatusPillProps = {
  status: 'active' | 'draft' | 'published' | 'operational' | string
}

const statusMap: Record<string, { label: string; variant: string }> = {
  active:      { label: 'Active',      variant: 'success' },
  published:   { label: 'Published',   variant: 'success' },
  draft:       { label: 'Draft',       variant: 'warning' },
  operational: { label: 'Operational', variant: 'success' },
}

export function StatusPill({ status }: StatusPillProps) {
  const config = statusMap[status] ?? { label: status, variant: 'muted' }

  return (
    <span className={`status-pill status-pill--${config.variant}`}>
      <span className="status-pill__dot" />
      {config.label}
    </span>
  )
}
