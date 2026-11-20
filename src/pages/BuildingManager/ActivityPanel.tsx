import { useCallback, useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Empty, Segmented, Space, Table, Tag, Typography } from 'antd'
import { FireOutlined, ReloadOutlined } from '@ant-design/icons'
import { getActivity, type ActivityEntry } from '../../api/activity'

const { Text } = Typography

const GROUPS: Record<string, { label: string; color: string }> = {
  INCIDENT: { label: 'Sự cố', color: 'red' },
  OPERATIONS: { label: 'Điều hành', color: 'orange' },
  STORE: { label: 'Gian hàng', color: 'blue' },
  PROMOTION: { label: 'Khuyến mãi', color: 'green' },
  QR: { label: 'Mã QR', color: 'purple' },
}
const groupOf = (action: string) => action.split('_')[0]

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  BUILDING_OWNER: 'Owner',
  BUILDING_MANAGER: 'Manager',
  STORE_OWNER: 'Chủ gian hàng',
}

type Filter = 'ALL' | keyof typeof GROUPS

function duration(seconds?: number) {
  if (seconds === undefined) return '—'
  return `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`
}

/** Nhật ký thao tác và lịch sử sự cố của MỘT tòa, lưu trong MongoDB: ai làm gì, lúc nào. */
export function ActivityPanel({ buildingId }: { buildingId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [loading, setLoading] = useState(false)
  const { message } = AntApp.useApp()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await getActivity(buildingId))
    } catch (error) {
      setEntries([])
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [buildingId, message])

  useEffect(() => {
    setEntries([])
    void load()
  }, [load])

  const incidents = useMemo(() => entries.filter((entry) => entry.action === 'INCIDENT_ENDED'), [entries])
  const visible = useMemo(() => (filter === 'ALL' ? entries : entries.filter((entry) => groupOf(entry.action) === filter)), [entries, filter])

  return (
    <Space direction="vertical" size={16} className="full-width">
      <Card className="tool-card" title={<Space><FireOutlined />Lịch sử sự cố</Space>}>
        <Table<ActivityEntry>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={incidents}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có sự cố nào được ghi nhận" /> }}
          columns={[
            { title: 'Kết thúc lúc', render: (_: unknown, entry) => new Date(entry.at).toLocaleString('vi-VN') },
            { title: 'Kéo dài', render: (_: unknown, entry) => duration(entry.extra?.durationSeconds) },
            { title: 'Số người đang sơ tán lúc kết thúc', render: (_: unknown, entry) => entry.extra?.evacuees ?? 0 },
            { title: 'Người xử lý', render: (_: unknown, entry) => entry.actor.name || entry.actor.email || '—' },
          ]}
        />
      </Card>

      <Card
        className="tool-card"
        title="Nhật ký thao tác"
        extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Làm mới</Button>}
      >
        <Segmented<Filter>
          style={{ marginBottom: 12 }}
          value={filter}
          onChange={setFilter}
          options={[{ value: 'ALL', label: 'Tất cả' }, ...Object.entries(GROUPS).map(([value, group]) => ({ value: value as Filter, label: group.label }))]}
        />
        <Table<ActivityEntry>
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          dataSource={visible}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thao tác nào" /> }}
          columns={[
            { title: 'Thời gian', width: 170, render: (_: unknown, entry) => new Date(entry.at).toLocaleString('vi-VN') },
            { title: 'Loại', width: 110, render: (_: unknown, entry) => { const group = GROUPS[groupOf(entry.action)]; return <Tag color={group?.color}>{group?.label ?? 'Khác'}</Tag> } },
            { title: 'Nội dung', dataIndex: 'summary' },
            { title: 'Người thực hiện', width: 200, render: (_: unknown, entry) => <Text>{entry.actor.name || entry.actor.email || '—'} <Text type="secondary">({ROLE_LABEL[entry.actor.role] ?? entry.actor.role})</Text></Text> },
          ]}
        />
      </Card>
    </Space>
  )
}
