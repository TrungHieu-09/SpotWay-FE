import { Tag } from 'antd'

type StatusTagProps = { status: string; label?: string }

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: 'Hoạt động', color: 'success' },
  published: { label: 'Đã xuất bản', color: 'success' },
  draft: { label: 'Bản nháp', color: 'warning' },
  inactive: { label: 'Tạm dừng', color: 'default' },
  locked: { label: 'Đã khóa', color: 'error' },
  suspended: { label: 'Tạm dừng', color: 'error' },
}

export function StatusTag({ status, label }: StatusTagProps) {
  const value = statusMap[status] ?? { label: status, color: 'default' }
  return <Tag color={value.color}>{label ?? value.label}</Tag>
}
