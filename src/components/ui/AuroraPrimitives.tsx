import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, Popconfirm, Space, Tag, Typography } from 'antd'
import type { ComponentProps, ReactNode } from 'react'

export function GlassCard({ children, className = '', ...props }: ComponentProps<typeof Card>) {
  return <Card {...props} className={`glass-card ${className}`}>{children}</Card>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Typography.Text className="aurora-kicker">{children}</Typography.Text>
}

export function GradientText({ children }: { children: ReactNode }) {
  return <span className="gradient-text">{children}</span>
}

export function StatusTag({ status, children }: { status: 'active' | 'inactive' | 'draft' | 'published'; children?: ReactNode }) {
  const color = status === 'active' || status === 'published' ? 'green' : status === 'draft' ? 'gold' : 'red'
  return <Tag color={color}>{children ?? status}</Tag>
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="aurora-empty-state"><Typography.Title level={4}>{title}</Typography.Title>{description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}{action}</div>
}

export function ConfirmDelete({ title = 'Xác nhận xóa', description = 'Dữ liệu đã xóa không thể khôi phục.', onConfirm, children = 'Xóa' }: { title?: string; description?: string; onConfirm: () => void; children?: ReactNode }) {
  return <Popconfirm title={title} description={description} okText="Xóa" cancelText="Hủy" onConfirm={onConfirm}><Button danger icon={<DeleteOutlined />}>{children}</Button></Popconfirm>
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="form-section"><SectionLabel>{title}</SectionLabel>{description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}{children}</section>
}

export function RoleBadge({ role }: { role: string }) {
  return <Tag className="role-badge">{role.replaceAll('_', ' ')}</Tag>
}

export function KeyValueList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <dl className="key-value-list">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
}

export function FloatingChip({ children }: { children: ReactNode }) {
  return <span className="floating-chip">{children}</span>
}

export function DataTableToolbar({ placeholder = 'Tìm kiếm', value, onChange, children }: { placeholder?: string; value?: string; onChange?: (value: string) => void; children?: ReactNode }) {
  return <div className="data-table-toolbar"><Input allowClear prefix={<SearchOutlined />} placeholder={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} />{children ? <Space wrap>{children}</Space> : null}</div>
}

export function IsometricFloors() {
  return <div className="isometric-floors" aria-label="Minh họa các tầng không gian" role="img"><div className="iso-floor iso-floor-back"><span>TẦNG 03</span></div><div className="iso-floor iso-floor-mid"><span>TẦNG 02</span></div><div className="iso-floor iso-floor-front"><span>TẦNG 01</span></div><div className="iso-route" /></div>
}
