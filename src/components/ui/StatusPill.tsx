import './StatusPill.css'

type StatusPillProps = {
  status: 'active' | 'draft' | 'published' | 'operational' | string
}

const statusMap: Record<string, { label: string; variant: string }> = {
  active:      { label: 'Active',      variant: 'cyan' },
  published:   { label: 'Published',   variant: 'cyan' },
  draft:       { label: 'Draft',       variant: 'fuchsia' },
  operational: { label: 'Operational', variant: 'green' },
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
