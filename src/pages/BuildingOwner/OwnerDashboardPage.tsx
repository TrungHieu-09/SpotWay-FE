import { useEffect, useState } from 'react'
import { Alert, Card, Col, Empty, Progress, Row, Skeleton, Statistic, Table, Tag, Typography } from 'antd'
import { getTenantOverview } from '../../api/tenant'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { TenantOverview } from '../../types/auth'
import type { Building } from '../../types/building'

const { Text, Title } = Typography

export function OwnerDashboardPage() {
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const buildings = useBuildingStore((state) => state.buildings)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)

  useEffect(() => {
    Promise.all([getTenantOverview(), loadBuildings()])
      .then(([nextOverview]) => setOverview(nextOverview))
      .catch((reason: Error) => setError(reason.message))
  }, [loadBuildings])

  if (error) return <main className="workspace"><Alert type="error" showIcon message={error} /></main>

  return (
    <main className="workspace">
      <div className="page-heading">
        <div><Text type="secondary">Chủ tòa nhà</Text><Title level={1}>Tổng quan doanh nghiệp</Title></div>
        {overview ? <Tag color="blue">{overview.tenant.subdomain}.indoor-spatial.vn</Tag> : null}
      </div>
      {!overview ? <Skeleton active /> : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}><Card><Statistic title="Tòa nhà" value={overview.usage.buildings} /></Card></Col>
            <Col xs={24} sm={12} lg={8}><Card><Statistic title="Tổng số tầng" value={overview.usage.floors} /></Card></Col>
            <Col xs={24} sm={12} lg={8}><Card><Statistic title="Tầng đã xuất bản" value={overview.usage.publishedFloors} /></Card></Col>
            <Col xs={24} sm={12} lg={8}><Card><Statistic title="Gian hàng" value={overview.usage.stores} /></Card></Col>
            <Col xs={24} sm={12} lg={8}><Card><Statistic title="Nhân viên" value={overview.usage.staff} suffix={`/ ${overview.plan.maxStaff}`} /></Card></Col>
            <Col xs={24} sm={12} lg={8}><Card><Statistic title="Khuyến mãi đang chạy" value={overview.usage.activePromotions} /></Card></Col>
          </Row>
          <Card title={`Gói ${overview.plan.name}`} className="tool-card">
            <p>Hết hạn: {new Intl.DateTimeFormat('vi-VN').format(new Date(overview.tenant.planExpiresAt))}</p>
            <Progress percent={Math.min(100, Math.round((overview.usage.buildings / overview.plan.maxBuildings) * 100))} format={() => `${overview.usage.buildings}/${overview.plan.maxBuildings} tòa nhà`} />
            <Progress percent={Math.min(100, Math.round((overview.usage.staff / overview.plan.maxStaff) * 100))} format={() => `${overview.usage.staff}/${overview.plan.maxStaff} nhân viên`} />
          </Card>
          <Card title="Danh sách tòa nhà" className="tool-card">
            <Table<Building> rowKey="id" dataSource={buildings} pagination={false} locale={{ emptyText: <Empty description="Chưa có tòa nhà" /> }} columns={[{ title: 'Tên', dataIndex: 'name' }, { title: 'Địa chỉ', dataIndex: 'address' }, { title: 'Tầng', dataIndex: 'floorCount' }, { title: 'Trạng thái', dataIndex: 'status', render: (status: Building['status']) => <Tag color={status === 'active' ? 'green' : 'gold'}>{status === 'active' ? 'Hoạt động' : 'Bản nháp'}</Tag> }]} />
          </Card>
        </>
      )}
    </main>
  )
}
