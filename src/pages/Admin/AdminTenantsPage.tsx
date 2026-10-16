import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Form, Input, Modal, Select, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { createAdminTenant, getAdminPlans, getAdminTenants, updateAdminTenant } from '../../api/admin'
import type { Plan, Tenant } from '../../types/auth'

const { Title } = Typography
type TenantForm = { name: string; subdomain: string; planId: string; planExpiresAt: Dayjs; ownerName: string; ownerEmail: string }

export function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm<TenantForm>()
  const { message } = AntApp.useApp()

  async function reload() {
    setLoading(true)
    try { const [nextTenants, nextPlans] = await Promise.all([getAdminTenants(), getAdminPlans()]); setTenants(nextTenants); setPlans(nextPlans) } catch (error) { message.error((error as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])
  async function submit(values: TenantForm) {
    try { await createAdminTenant({ ...values, planExpiresAt: values.planExpiresAt.toISOString() }); message.success('Đã tạo doanh nghiệp'); setOpen(false); form.resetFields(); await reload() } catch (error) { message.error((error as Error).message) }
  }
  async function toggle(tenant: Tenant) {
    try { await updateAdminTenant(tenant.id, { status: tenant.status === 'active' ? 'suspended' : 'active' }); await reload() } catch (error) { message.error((error as Error).message) }
  }

  return <main className="workspace"><div className="page-heading"><Title level={1}>Doanh nghiệp</Title><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Thêm doanh nghiệp</Button></div><Card className="tool-card"><Table<Tenant> rowKey="id" loading={loading} dataSource={tenants} locale={{ emptyText: 'Chưa có doanh nghiệp' }} columns={[{ title: 'Tên', dataIndex: 'name' }, { title: 'Subdomain', dataIndex: 'subdomain' }, { title: 'Gói', dataIndex: 'planId' }, { title: 'Hết hạn', dataIndex: 'planExpiresAt', render: (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(value)) }, { title: 'Trạng thái', dataIndex: 'status', render: (status: Tenant['status'], tenant) => <Button type="link" onClick={() => toggle(tenant)}><Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Hoạt động' : 'Tạm dừng'}</Tag></Button> }]} /></Card><Modal title="Thêm doanh nghiệp" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Tạo" cancelText="Hủy"><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="name" label="Tên doanh nghiệp" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="subdomain" label="Subdomain" rules={[{ required: true }]}><Input addonAfter=".indoor-spatial.vn" /></Form.Item><Form.Item name="planId" label="Gói dịch vụ" rules={[{ required: true }]}><Select options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} /></Form.Item><Form.Item name="planExpiresAt" label="Ngày hết hạn" initialValue={dayjs().add(1, 'year')} rules={[{ required: true }]}><DatePicker className="full-width" /></Form.Item><Form.Item name="ownerName" label="Tên chủ tòa nhà" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="ownerEmail" label="Email chủ tòa nhà" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Form></Modal></main>
}
