import { Card } from 'antd'
import type { ReactNode } from 'react'

export function SectionCard({ title, extra, children, className = '' }: { title?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={`section-card ${className}`} title={title} extra={extra}>{children}</Card>
}
