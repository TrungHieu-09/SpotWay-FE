import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { getTenantInvoices, getTenantOverview, getTenantPlans, renewTenantSubscription } from '../../api/tenant'
import type { Invoice, Plan, TenantOverview } from '../../types/auth'

const { Title } = Typography

export function OwnerSubscriptionPage() {
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ planId: string; months: number }>()
  const { message } = AntApp.useApp()

  async function reload() {
    try { const [nextOverview, nextInvoices, nextPlans] = await Promise.all([getTenantOverview(), getTenantInvoices(), getTenantPlans()]); setOverview(nextOverview); setInvoices(nextInvoices); setPlans(nextPlans) } catch (error) { message.error((error as Error).message) }
  }
  useEffect(() => { reload() }, [])
  async function submit(values: { planId: string; months: number }) { try { await renewTenantSubscription(values.planId, values.months); message.success('Đã gia hạn gói dịch vụ'); setOpen(false); await reload() } catch (error) { message.error((error as Error).message) } }

  return <main className="workspace"><div className="page-heading"><Title level={1}>Gói dịch vụ</Title><Button type="primary" onClick={() => setOpen(true)}>Gia hạn / Nâng cấp</Button></div><Card className="tool-card" loading={!overview}>{overview ? <Space orientation="vertical"><Tag color="blue">{overview.plan.name}</Tag><span>Hết hạn: {new Intl.DateTimeFormat('vi-VN').format(new Date(overview.tenant.planExpiresAt))}</span><span>Sử dụng {overview.usage.buildings}/{overview.plan.maxBuildings} tòa nhà và {overview.usage.staff}/{overview.plan.maxStaff} nhân viên.</span></Space> : null}</Card><Card title="Lịch sử hóa đơn" className="tool-card"><Table<Invoice> rowKey="id" dataSource={invoices} pagination={false} columns={[{ title: 'Ngày thanh toán', dataIndex: 'paidAt', render: (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(value)) }, { title: 'Số tháng', dataIndex: 'months' }, { title: 'Số tiền', dataIndex: 'amountVnd', render: (value: number) => `${value.toLocaleString('vi-VN')} đ` }, { title: 'Trạng thái', dataIndex: 'status', render: () => <Tag color="green">Đã thanh toán</Tag> }]} /></Card><Modal title="Thanh toán mô phỏng" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Xác nhận" cancelText="Hủy"><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="planId" label="Gói dịch vụ" rules={[{ required: true, message: 'Chọn gói' }]}><Select options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} — ${plan.priceVnd.toLocaleString('vi-VN')} đ/tháng` }))} /></Form.Item><Form.Item name="months" label="Số tháng" initialValue={12} rules={[{ required: true }]}><InputNumber min={1} max={36} className="full-width" /></Form.Item></Form></Modal></main>
}
