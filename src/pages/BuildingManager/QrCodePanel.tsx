import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Empty, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { QRCodeCanvas } from 'qrcode.react'
import { useFloorStore } from '../../store/useFloorStore'
import { useNodeStore } from '../../store/useNodeStore'
import { usePermissions } from '../../auth/usePermissions'
import { createQrCode, deleteQrCode, getBuildingQrCodes } from '../../api/qr'
import type { QrCode } from '../../types/qr'

const { Text, Title } = Typography
type QrForm = { label: string; floorId: string; nodeId: string }

export function QrCodePanel({ readOnly = false }: { readOnly?: boolean }) {
  const floor = useFloorStore((state) => state.selectedFloor)
  const floors = useFloorStore((state) => state.floors)
  const nodesByFloorId = useNodeStore((state) => state.nodesByFloorId)
  const loadNodesByFloors = useNodeStore((state) => state.loadNodesByFloors)
  const [items, setItems] = useState<QrCode[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<QrForm>()
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = Boolean(floor && !readOnly && permissions.canEditFloor(floor))
  const selectedFloorId = Form.useWatch('floorId', form) ?? floor?.id

  useEffect(() => { if (!floor) return; setLoading(true); void Promise.all([getBuildingQrCodes(floor.buildingId), loadNodesByFloors(floors.map((item) => item.id))]).then(([codes]) => setItems(codes)).catch((error: Error) => message.error(error.message)).finally(() => setLoading(false)) }, [floor?.buildingId, floors, loadNodesByFloors, message])
  if (!floor) return <Empty description="Chọn tòa nhà để quản lý mã QR" />
  const currentFloor = floor
  const nodeOptions = (nodesByFloorId[selectedFloorId ?? currentFloor.id] ?? []).map((node) => ({ value: node.id, label: node.label ?? node.id }))
  async function save(values: QrForm) { try { const created = await createQrCode(currentFloor.buildingId, values); setItems((current) => [...current, created]); setOpen(false); form.resetFields(); message.success('Đã tạo mã QR') } catch (error) { message.error((error as Error).message) } }
  return <Card className="tool-card" title={<Title level={3} style={{ margin: 0 }}>Mã QR điểm đến</Title>} extra={<Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={() => { form.setFieldsValue({ floorId: currentFloor.id }); setOpen(true) }}>Tạo mã QR</Button>}><Spin spinning={loading}><Table<QrCode> rowKey="id" dataSource={items} pagination={false} locale={{ emptyText: 'Chưa có mã QR' }} columns={[{ title: 'Nhãn', dataIndex: 'label' }, { title: 'Mã QR', render: (_: unknown, item: QrCode) => { const value = `${window.location.origin}/guest?buildingId=${item.buildingId}&floorId=${item.floorId}&nodeId=${item.nodeId}`; return <Space orientation="vertical" size={4}><QRCodeCanvas value={value} size={72} /><Text copyable ellipsis style={{ maxWidth: 220 }}>{value}</Text></Space> } }, { title: 'Mã', dataIndex: 'code', render: (code: string) => <Text code>{code}</Text> }, { title: 'Hành động', render: (_: unknown, item: QrCode) => <Popconfirm title="Xoá mã QR?" okText="Xoá" cancelText="Hủy" onConfirm={() => void deleteQrCode(item.id).then(() => setItems((current) => current.filter((code) => code.id !== item.id))).then(() => message.success('Đã xoá mã QR')).catch((error: Error) => message.error(error.message))}><Button danger icon={<DeleteOutlined />} disabled={!canEdit} /></Popconfirm> }]} /></Spin><Modal title="Tạo mã QR" open={open} okText="Tạo" cancelText="Hủy" onCancel={() => setOpen(false)} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={save}><Form.Item name="label" label="Nhãn" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="floorId" label="Tầng" rules={[{ required: true }]}><Select options={floors.map((item) => ({ value: item.id, label: item.name }))} onChange={() => form.setFieldValue('nodeId', undefined)} /></Form.Item><Form.Item name="nodeId" label="Node đích" rules={[{ required: true }]}><Select options={nodeOptions} /></Form.Item></Form></Modal></Card>
}
