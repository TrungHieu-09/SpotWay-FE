import { useEffect, useState } from 'react'
import { Alert, Card, Empty, Progress, Skeleton, Table, Tag } from 'antd'
import { getTenantOverview } from '../../api/tenant'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { TenantOverview } from '../../types/auth'
import type { Building } from '../../types/building'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatStrip } from '../../components/ui/StatStrip'

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
      <PageHeader eyebrow="Chủ tòa nhà" title="Tổng quan doanh nghiệp" description="Tổng quan nhanh về tài sản, đội ngũ và mức sử dụng gói dịch vụ." actions={overview ? <Tag color="blue">{overview.tenant.subdomain}.indoor-spatial.vn</Tag> : null} />
      {!overview ? <Skeleton active /> : (
        <>
          <StatStrip items={[{ label: 'Tòa nhà', value: overview.usage.buildings }, { label: 'Tổng số tầng', value: overview.usage.floors }, { label: 'Tầng đã xuất bản', value: overview.usage.publishedFloors }, { label: 'Gian hàng', value: overview.usage.stores }, { label: 'Quản lý', value: `${overview.usage.managers}/${overview.plan.maxManagers}` }, { label: 'Chủ gian hàng', value: `${overview.usage.storeOwners}/${overview.plan.maxStoreOwners}` }, { label: 'Khuyến mãi đang chạy', value: overview.usage.activePromotions }]} />
          <Card title={`Gói ${overview.plan.name}`} className="tool-card">
            <p>Hết hạn: {new Intl.DateTimeFormat('vi-VN').format(new Date(overview.tenant.planExpiresAt))}</p>
            <Progress percent={Math.min(100, Math.round((overview.usage.buildings / overview.plan.maxBuildings) * 100))} format={() => `${overview.usage.buildings}/${overview.plan.maxBuildings} tòa nhà`} />
            <Progress percent={Math.min(100, Math.round((overview.usage.managers / overview.plan.maxManagers) * 100))} format={() => `${overview.usage.managers}/${overview.plan.maxManagers} quản lý`} />
            <Progress percent={Math.min(100, Math.round((overview.usage.storeOwners / overview.plan.maxStoreOwners) * 100))} format={() => `${overview.usage.storeOwners}/${overview.plan.maxStoreOwners} chủ gian hàng`} />
          </Card>
          <Card title="Danh sách tòa nhà" className="tool-card">
            <Table<Building> rowKey="id" dataSource={buildings} pagination={false} locale={{ emptyText: <Empty description="Chưa có tòa nhà" /> }} columns={[{ title: 'Tên', dataIndex: 'name' }, { title: 'Địa chỉ', dataIndex: 'address' }, { title: 'Tầng', dataIndex: 'floorCount' }, { title: 'Trạng thái', dataIndex: 'status', render: (status: Building['status']) => <Tag color={status === 'active' ? 'green' : 'gold'}>{status === 'active' ? 'Hoạt động' : 'Bản nháp'}</Tag> }]} />
          </Card>
        </>
      )}
    </main>
  )
}
