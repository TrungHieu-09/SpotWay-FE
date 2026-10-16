import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createArea, deleteArea, getBuildingAreas, updateArea } from '../../api/areas'
import type { Area } from '../../types/area'

type AreaFormValues = Pick<Area, 'name' | 'description' | 'color'>

export function AreaManagementPanel({ buildingId }: { buildingId: string }) {
  const [areas, setAreas] = useState<Area[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<AreaFormValues>()
  const { message } = AntApp.useApp()

  async function reload() {
    setLoading(true)
    try { setAreas(await getBuildingAreas(buildingId)) } catch (error) { message.error((error as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [buildingId])

  function openForm(area?: Area) {
    setEditing(area ?? null)
    form.setFieldsValue(area ? { name: area.name, description: area.description, color: area.color } : { color: '#1677ff' })
    setOpen(true)
  }

  async function submit(values: AreaFormValues) {
    setSaving(true)
    try {
      if (editing) await updateArea(editing.id, values)
      else await createArea(buildingId, values)
      message.success(editing ? 'Đã cập nhật khu vực' : 'Đã tạo khu vực')
      setOpen(false)
      form.resetFields()
      await reload()
    } catch (error) { message.error((error as Error).message) } finally { setSaving(false) }
  }

  async function remove(areaId: string) {
    try { await deleteArea(areaId); message.success('Đã xóa khu vực'); await reload() } catch (error) { message.error((error as Error).message) }
  }

  return <Card title="Khu vực quản lý" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Thêm khu vực</Button>} className="tool-card">
    <Table<Area> rowKey="id" loading={loading} dataSource={areas} pagination={false} locale={{ emptyText: 'Chưa có khu vực' }} columns={[
      { title: 'Tên khu vực', dataIndex: 'name', render: (name: string, area) => <Space><Tag color={area.color}>{name}</Tag></Space> },
      { title: 'Mô tả', dataIndex: 'description' },
      { title: 'Thao tác', render: (_value, area) => <Space><Button size="small" onClick={() => openForm(area)}>Sửa</Button><Popconfirm title="Xóa khu vực này?" description="Tầng đang gán khu vực sẽ cần được phân công lại." onConfirm={() => remove(area.id)}><Button danger size="small">Xóa</Button></Popconfirm></Space> },
    ]} />
    <Modal title={editing ? 'Sửa khu vực' : 'Thêm khu vực'} open={open} confirmLoading={saving} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Lưu" cancelText="Hủy">
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="name" label="Tên khu vực" rules={[{ required: true, message: 'Nhập tên khu vực' }]}><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="color" label="Màu hiển thị"><Input type="color" /></Form.Item>
      </Form>
    </Modal>
  </Card>
}
