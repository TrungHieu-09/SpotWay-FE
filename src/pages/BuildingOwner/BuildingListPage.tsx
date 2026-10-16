import { useEffect, useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
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
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm] = Form.useForm<{ name: string; address: string }>()
  const navigate = useNavigate()
  const buildings = useBuildingStore((state) => state.buildings)
  const isLoading = useBuildingStore((state) => state.isLoading)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const updateBuilding = useBuildingStore((state) => state.updateBuilding)
  const deleteBuilding = useBuildingStore((state) => state.deleteBuilding)
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
  }, [loadBuildings, message])

  const totalFloors = useMemo(
    () => buildings.reduce((sum, building) => sum + building.floorCount, 0),
    [buildings],
  )

  function openEdit(building: Building) {
    setEditingBuilding(building)
    editForm.setFieldsValue({ name: building.name, address: building.address })
  }

  async function submitEdit(values: { name: string; address: string }) {
    if (!editingBuilding) return
    setIsSaving(true)
    try {
      await updateBuilding(editingBuilding.id, values)
      message.success('Đã cập nhật tòa nhà')
      setEditingBuilding(null)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="workspace">
      <section className="page-heading">
        <div>
          <Text type="secondary">Chủ tòa nhà</Text>
          <Title level={1}>Tòa nhà của bạn</Title>
        </div>
        <Space size="large" wrap>
          <Statistic title="Tòa nhà" value={buildings.length} />
          <Statistic title="Tổng số tầng" value={totalFloors} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateOpen(true)}
          >
            Tạo tòa nhà mới
          </Button>
        </Space>
      </section>

      <Card title="Danh sách tòa nhà" className="tool-card">
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
                  {building.planImageUrl ? (
                    <img
                      className="table-thumb"
                      src={building.planImageUrl}
                      alt=""
                    />
                  ) : (
                    <div className="table-thumb table-thumb-placeholder" />
                  )}
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
                  {status === 'active' ? 'Đang hoạt động' : 'Bản nháp'}
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
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    Sửa
                  </Button>
                  <Popconfirm title="Xóa tòa nhà này?" description="Các tầng, POI và dữ liệu bản đồ liên quan cũng sẽ bị xóa." okText="Xóa" cancelText="Hủy" onConfirm={() => deleteBuilding(record.id).then(() => message.success('Đã xóa tòa nhà')).catch((error: Error) => message.error(error.message))}>
                    <Button danger size="small">Xóa</Button>
                  </Popconfirm>
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
      <Modal title="Chỉnh sửa tòa nhà" open={Boolean(editingBuilding)} confirmLoading={isSaving} onCancel={() => setEditingBuilding(null)} onOk={() => editForm.submit()} okText="Lưu" cancelText="Hủy">
        <Form form={editForm} layout="vertical" onFinish={submitEdit}>
          <Form.Item name="name" label="Tên tòa nhà" rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà' }]}><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </main>
  )
}

