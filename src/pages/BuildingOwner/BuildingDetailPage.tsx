import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Empty,
  Image,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Floor } from '../../types/floor'

const { Text, Title } = Typography

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [isFloorLoading, setIsFloorLoading] = useState(false)
  const [hasLoadedBuildings, setHasLoadedBuildings] = useState(false)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const isBuildingLoading = useBuildingStore((state) => state.isLoading)
  const building = useBuildingStore((state) =>
    buildingId ? state.getBuildingById(buildingId) : undefined,
  )
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings()
      .catch((error: Error) => message.error(error.message))
      .finally(() => setHasLoadedBuildings(true))
  }, [loadBuildings, message])

  useEffect(() => {
    if (!buildingId) {
      setFloors([])
      return
    }

    setIsFloorLoading(true)
    getFloors(buildingId)
      .then(setFloors)
      .catch((error: Error) => message.error(error.message))
      .finally(() => setIsFloorLoading(false))
  }, [buildingId, message])

  if (!building && hasLoadedBuildings && !isBuildingLoading) {
    return (
      <main className="workspace">
        <Card className="tool-card">
          <Empty description="Không tìm thấy building">
            <Button onClick={() => navigate('/owner/buildings')}>
              Quay lại danh sách
            </Button>
          </Empty>
        </Card>
      </main>
    )
  }

  return (
    <main className="workspace">
      <section className="page-heading">
        <div>
          <Text type="secondary">Building Owner</Text>
          <Title level={1}>{building?.name ?? 'Building detail'}</Title>
        </div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/owner/buildings')}
        >
          Quay lại danh sách
        </Button>
      </section>

      <Spin spinning={isBuildingLoading}>
        {building ? (
          <div className="building-detail-grid">
            <Card title="Thông tin building" className="tool-card">
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="Tên">
                  {building.name}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {building.address}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={building.status === 'active' ? 'green' : 'gold'}>
                    {building.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {new Intl.DateTimeFormat('vi-VN').format(
                    new Date(building.createdAt),
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Ảnh sơ đồ" className="tool-card">
              {building.planImageUrl ? (
                <Image
                  className="building-plan-image"
                  src={building.planImageUrl}
                  alt={`Sơ đồ ${building.name}`}
                />
              ) : (
                <Empty description="Chưa có ảnh sơ đồ" />
              )}
            </Card>
          </div>
        ) : null}

        <Card title="Danh sách tầng" className="tool-card floor-detail-card">
          <Table<Floor>
            rowKey="id"
            loading={isFloorLoading}
            dataSource={floors}
            pagination={false}
            locale={{ emptyText: 'Chưa có tầng' }}
            columns={[
              { title: 'Tên tầng', dataIndex: 'name' },
              { title: 'Level', dataIndex: 'level', width: 120 },
              {
                title: 'Publish status',
                dataIndex: 'publishStatus',
                width: 160,
                render: (status: Floor['publishStatus']) => (
                  <Tag color={status === 'published' ? 'green' : 'gold'}>
                    {status}
                  </Tag>
                ),
              },
            ]}
          />
          {building ? (
            <Space className="floor-count-note">
              <Text type="secondary">
                Số tầng trong bảng: {floors.length} / cột Số tầng:{' '}
                {building.floorCount}
              </Text>
            </Space>
          ) : null}
        </Card>
      </Spin>
    </main>
  )
}
