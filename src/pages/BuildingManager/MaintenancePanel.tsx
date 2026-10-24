import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Empty, Form, Input, InputNumber, Modal, Popconfirm, Space, Spin, Switch, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { usePermissions } from '../../auth/usePermissions'
import { createMaintenanceZone, deleteMaintenanceZone, getMaintenanceZones, updateMaintenanceZone } from '../../api/maintenance'
import type { MaintenanceZone } from '../../types/maintenance'

const { Text, Title } = Typography
type ZoneForm = { name: string; reason: string; x: number; y: number; w: number; h: number; active: boolean }

export function MaintenancePanel({ readOnly = false }: { readOnly?: boolean }) {
  const floor = useFloorStore((state) => state.selectedFloor)
  const [zones, setZones] = useState<MaintenanceZone[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<ZoneForm>()
  const [loading, setLoading] = useState(false)
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = Boolean(floor && !readOnly && permissions.canEditFloor(floor))

  async function load() { if (!floor) return; setLoading(true); try { setZones(await getMaintenanceZones(floor.id)) } catch (error) { message.error((error as Error).message) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [floor?.id])
  async function save(values: ZoneForm) { if (!floor) return; try { const zone = await createMaintenanceZone(floor.id, { name: values.name, reason: values.reason, rect: { x: values.x, y: values.y, w: values.w, h: values.h }, active: values.active }); setZones((current) => [...current, zone]); setOpen(false); form.resetFields(); message.success('Đã thêm vùng bảo trì') } catch (error) { message.error((error as Error).message) } }
  if (!floor) return <Empty description="Chọn tầng để quản lý vùng bảo trì" />
  return <Card className="tool-card" title={<Title level={3} style={{ margin: 0 }}>Vùng bảo trì</Title>} extra={<Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={() => { form.setFieldsValue({ x: 0, y: 0, w: 20, h: 20, active: true }); setOpen(true) }}>Thêm vùng</Button>}>
    <Spin spinning={loading}><Table<MaintenanceZone> rowKey="id" dataSource={zones} pagination={false} locale={{ emptyText: 'Chưa có vùng bảo trì' }} columns={[
      { title: 'Tên', dataIndex: 'name', render: (value: string) => <Text strong>{value}</Text> },
      { title: 'Lý do', dataIndex: 'reason' },
      { title: 'Phạm vi', render: (_: unknown, zone: MaintenanceZone) => `${zone.rect.x}%, ${zone.rect.y}% - ${zone.rect.w}% x ${zone.rect.h}%` },
      { title: 'Trạng thái', dataIndex: 'active', render: (active: boolean, zone: MaintenanceZone) => <Switch checked={active} disabled={!canEdit} onChange={(checked) => void updateMaintenanceZone(zone.id, { active: checked }).then((updated) => setZones((current) => current.map((item) => item.id === updated.id ? updated : item))).catch((error: Error) => message.error(error.message))} /> },
      { title: 'Hành động', render: (_: unknown, zone: MaintenanceZone) => <Popconfirm title="Xoá vùng bảo trì?" okText="Xoá" cancelText="Hủy" onConfirm={() => void deleteMaintenanceZone(zone.id).then(() => setZones((current) => current.filter((item) => item.id !== zone.id))).then(() => message.success('Đã xoá vùng bảo trì')).catch((error: Error) => message.error(error.message))}><Button danger icon={<DeleteOutlined />} disabled={!canEdit} /></Popconfirm> },
    ]} /></Spin>
    <Modal title="Thêm vùng bảo trì" open={open} okText="Lưu" cancelText="Hủy" onCancel={() => setOpen(false)} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={save}><Form.Item name="name" label="Tên vùng" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="reason" label="Lý do"><Input.TextArea /></Form.Item><Space><Form.Item name="x" label="X %"><InputNumber min={0} max={100} /></Form.Item><Form.Item name="y" label="Y %"><InputNumber min={0} max={100} /></Form.Item><Form.Item name="w" label="Rộng %"><InputNumber min={1} max={100} /></Form.Item><Form.Item name="h" label="Cao %"><InputNumber min={1} max={100} /></Form.Item></Space><Form.Item name="active" label="Đang chặn lối đi" valuePropName="checked"><Switch /></Form.Item></Form></Modal>
  </Card>
}
