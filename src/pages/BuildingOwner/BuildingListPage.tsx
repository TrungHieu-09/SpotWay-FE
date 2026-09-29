import { useEffect, useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { CreateBuildingModal } from './CreateBuildingModal'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Building } from '../../types/building'

const { Text, Title } = Typography

export function BuildingListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const navigate = useNavigate()
  const buildings = useBuildingStore((state) => state.buildings)
  const isLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
  }, [loadBuildings, message])

  const totalFloors = useMemo(
    () => buildings.reduce((sum, building) => sum + building.floorCount, 0),
    [buildings],
  )

  return (
    <main className="workspace">
      <section className="page-heading">
        <div>
          <Text type="secondary">Building Owner</Text>
          <Title level={1}>Owned buildings</Title>
        </div>
        <Space size="large" wrap>
          <Statistic title="Buildings" value={buildings.length} />
          <Statistic title="Total floors" value={totalFloors} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateOpen(true)}
          >
            Tạo building mới
          </Button>
        </Space>
      </section>

      <Card title="Building inventory" className="tool-card">
        <Table<Building>
          rowKey="id"
          loading={isLoading}
          dataSource={buildings}
          pagination={false}
          scroll={{ x: 960 }}
          columns={[
            {
              title: 'Tên',
              dataIndex: 'name',
              render: (name: string, building) => (
                <Space>
                  <img
                    className="table-thumb"
                    src={building.planImageUrl}
                    alt=""
                  />
                  <strong>{name}</strong>
                </Space>
              ),
            },
            { title: 'Địa chỉ', dataIndex: 'address' },
            { title: 'Số tầng', dataIndex: 'floorCount', width: 90 },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 110,
              render: (status: Building['status']) => (
                <Tag color={status === 'active' ? 'green' : 'gold'}>
                  {status}
                </Tag>
              ),
            },
            {
              title: 'Ngày tạo',
              dataIndex: 'createdAt',
              width: 150,
              render: (createdAt: string) =>
                new Intl.DateTimeFormat('vi-VN').format(new Date(createdAt)),
            },
            {
              title: 'Hành động',
              key: 'actions',
              width: 160,
              render: (_value: unknown, record) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/owner/buildings/${record.id}`)}
                  >
                    Xem chi tiết
                  </Button>
                  <Button size="small" icon={<EditOutlined />}>
                    Sửa
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <CreateBuildingModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </main>
  )
}

