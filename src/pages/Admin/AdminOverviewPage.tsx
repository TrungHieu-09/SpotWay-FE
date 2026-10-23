import { useEffect, useState } from 'react'
import { Alert, Button, Card, Empty, Skeleton, Tag } from 'antd'
import { BankOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getAdminOverview } from '../../api/admin'
import type { AdminOverview } from '../../types/admin'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatStrip } from '../../components/ui/StatStrip'

export function AdminOverviewPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminOverview().then(setOverview).catch((reason: Error) => setError(reason.message))
  }, [])

  if (error) return <main className="workspace"><Alert type="error" showIcon message={error} /></main>
  if (!overview) return <main className="workspace"><Skeleton active /></main>

  return (
    <main className="workspace">
      <PageHeader eyebrow="Quản trị hệ thống" title="Tổng quan" description="Theo dõi quy mô và trạng thái vận hành của toàn bộ nền tảng." actions={<><Button icon={<TeamOutlined />} onClick={() => navigate('/admin/accounts')}>Quản lý tài khoản</Button><Button type="primary" icon={<BankOutlined />} onClick={() => navigate('/admin/tenants')}>Thêm chủ tòa nhà / tòa nhà</Button></>} />
      <StatStrip items={[{ label: 'Doanh nghiệp', value: overview.tenants.total }, { label: 'Đang hoạt động', value: overview.tenants.active }, { label: 'Tòa nhà', value: overview.buildings }, { label: 'Tài khoản', value: overview.users }]} />
      <Card title="Phân bổ gói dịch vụ" className="tool-card">
        {overview.plans.length === 0 ? <Empty description="Chưa có dữ liệu gói" /> : overview.plans.map((item) => <p key={item.planId}><Tag color="blue">{item.planName}</Tag> {item.count} doanh nghiệp</p>)}
      </Card>
    </main>
  )
}
