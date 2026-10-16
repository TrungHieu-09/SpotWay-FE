import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, InputNumber, Modal, Table, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createAdminPlan, getAdminPlans, updateAdminPlan } from '../../api/admin'
import type { Plan } from '../../types/auth'

const { Title } = Typography
type PlanForm = Omit<Plan, 'id'>

export function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [editing, setEditing] = useState<Plan | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm<PlanForm>()
  const { message } = AntApp.useApp()
  async function reload() { setLoading(true); try { setPlans(await getAdminPlans()) } catch (error) { message.error((error as Error).message) } finally { setLoading(false) } }
  useEffect(() => { reload() }, [])
  function openForm(plan?: Plan) { setEditing(plan ?? null); form.setFieldsValue(plan ? { name: plan.name, maxBuildings: plan.maxBuildings, maxStaff: plan.maxStaff, priceVnd: plan.priceVnd, durationMonths: plan.durationMonths } : { maxBuildings: 2, maxStaff: 5, priceVnd: 0, durationMonths: 1 }); setOpen(true) }
  async function submit(values: PlanForm) { try { if (editing) await updateAdminPlan(editing.id, values); else await createAdminPlan(values); message.success('Đã lưu gói dịch vụ'); setOpen(false); await reload() } catch (error) { message.error((error as Error).message) } }
  return <main className="workspace"><div className="page-heading"><Title level={1}>Gói dịch vụ</Title><Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Thêm gói</Button></div><Card className="tool-card"><Table<Plan> rowKey="id" loading={loading} dataSource={plans} locale={{ emptyText: 'Chưa có gói dịch vụ' }} columns={[{ title: 'Tên', dataIndex: 'name' }, { title: 'Tòa nhà tối đa', dataIndex: 'maxBuildings' }, { title: 'Nhân viên tối đa', dataIndex: 'maxStaff' }, { title: 'Giá/tháng', dataIndex: 'priceVnd', render: (value: number) => `${value.toLocaleString('vi-VN')} đ` }, { title: 'Hành động', render: (_value, plan) => <Button onClick={() => openForm(plan)}>Chỉnh sửa</Button> }]} /></Card><Modal title={editing ? 'Chỉnh sửa gói' : 'Thêm gói'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Lưu" cancelText="Hủy"><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="name" label="Tên gói" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="maxBuildings" label="Số tòa nhà tối đa" rules={[{ required: true }]}><InputNumber min={1} className="full-width" /></Form.Item><Form.Item name="maxStaff" label="Số nhân viên tối đa" rules={[{ required: true }]}><InputNumber min={1} className="full-width" /></Form.Item><Form.Item name="priceVnd" label="Giá (VNĐ/tháng)" rules={[{ required: true }]}><InputNumber min={0} className="full-width" /></Form.Item><Form.Item name="durationMonths" label="Thời hạn mặc định (tháng)" rules={[{ required: true }]}><InputNumber min={1} className="full-width" /></Form.Item></Form></Modal></main>
}
