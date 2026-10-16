import { useEffect, useState } from 'react'
import { Alert, Card, Col, Empty, Row, Skeleton, Statistic, Tag, Typography } from 'antd'
import { getAdminOverview } from '../../api/admin'
import type { AdminOverview } from '../../types/admin'

const { Title, Text } = Typography

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminOverview().then(setOverview).catch((reason: Error) => setError(reason.message))
  }, [])

  if (error) return <main className="workspace"><Alert type="error" showIcon message={error} /></main>
  if (!overview) return <main className="workspace"><Skeleton active /></main>

  return (
    <main className="workspace">
      <div className="page-heading"><div><Text type="secondary">Quản trị hệ thống</Text><Title level={1}>Tổng quan</Title></div></div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Doanh nghiệp" value={overview.tenants.total} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Đang hoạt động" value={overview.tenants.active} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Tòa nhà" value={overview.buildings} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Tài khoản" value={overview.users} /></Card></Col>
      </Row>
      <Card title="Phân bổ gói dịch vụ" className="tool-card">
        {overview.plans.length === 0 ? <Empty description="Chưa có dữ liệu gói" /> : overview.plans.map((item) => <p key={item.planId}><Tag color="blue">{item.planName}</Tag> {item.count} doanh nghiệp</p>)}
      </Card>
    </main>
  )
}
