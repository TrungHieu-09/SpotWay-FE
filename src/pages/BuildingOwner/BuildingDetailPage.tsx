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
  Select,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getFloors, updateFloor } from '../../api/floors'
import { getBuildingAreas } from '../../api/areas'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Floor } from '../../types/floor'
import type { Area } from '../../types/area'
import { AreaManagementPanel } from './AreaManagementPanel'

const { Text, Title } = Typography

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const [floors, setFloors] = useState<Floor[]>([])
  const [areas, setAreas] = useState<Area[]>([])
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

  useEffect(() => {
    if (buildingId) getBuildingAreas(buildingId).then(setAreas).catch((error: Error) => message.error(error.message))
  }, [buildingId, message])

  if (!building && hasLoadedBuildings && !isBuildingLoading) {
    return (
      <main className="workspace">
        <Card className="tool-card">
          <Empty description="Không tìm thấy tòa nhà">
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
          <Text type="secondary">Chủ tòa nhà</Text>
          <Title level={1}>{building?.name ?? 'Chi tiết tòa nhà'}</Title>
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
            <Card title="Thông tin tòa nhà" className="tool-card">
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="Tên">
                  {building.name}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {building.address}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={building.status === 'active' ? 'green' : 'gold'}>
                    {building.status === 'active'
                      ? 'Đang hoạt động'
                      : 'Bản nháp'}
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
              { title: 'Tầng', dataIndex: 'level', width: 120 },
              { title: 'Khu vực', dataIndex: 'areaId', width: 220, render: (areaId: string | null, floor) => <Select allowClear value={areaId ?? undefined} placeholder="Chọn khu vực" options={areas.map((area) => ({ value: area.id, label: area.name }))} onChange={(next: string | undefined) => updateFloor(floor.id, { areaId: next ?? null }).then((updated) => setFloors((current) => current.map((item) => item.id === updated.id ? updated : item))).catch((error: Error) => message.error(error.message))} /> },
              {
                title: 'Trạng thái xuất bản',
                dataIndex: 'publishStatus',
                width: 160,
                render: (status: Floor['publishStatus']) => (
                  <Tag color={status === 'published' ? 'green' : 'gold'}>
                    {status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
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
        {building ? <AreaManagementPanel buildingId={building.id} /> : null}
      </Spin>
    </main>
  )
}
