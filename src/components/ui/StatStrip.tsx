import { Typography } from 'antd'

type StatStripProps = { items: Array<{ label: string; value: string | number; note?: string }> }

export function StatStrip({ items }: StatStripProps) {
  return <div className="stat-strip">{items.map((item) => <div className="stat-item" key={item.label}><Typography.Text className="stat-value">{item.value}</Typography.Text><Typography.Text className="stat-label">{item.label}</Typography.Text>{item.note ? <Typography.Text type="secondary">{item.note}</Typography.Text> : null}</div>)}</div>
}
