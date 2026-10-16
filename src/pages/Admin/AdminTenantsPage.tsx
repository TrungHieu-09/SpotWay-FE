import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import {
  createAdminBuilding,
  createAdminOwner,
  createAdminTenant,
  deleteAdminBuilding,
  deleteAdminUser,
  getAdminPlans,
  getAdminTenant,
  getAdminTenants,
  updateAdminTenant,
} from '../../api/admin'
import type { Plan, Tenant, User } from '../../types/auth'
import type { TenantDetail } from '../../types/admin'

const { Text, Title } = Typography
type TenantForm = { name: string; subdomain: string; planId: string; planExpiresAt: Dayjs; ownerName: string; ownerEmail: string }
type OwnerForm = { name: string; email: string }
type LoginCredentials = { email: string; temporaryPassword: string }

export function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TenantDetail | null>(null)
  const [buildingOpen, setBuildingOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [credentials, setCredentials] = useState<LoginCredentials | null>(null)
  const [form] = Form.useForm<TenantForm>()
  const [buildingForm] = Form.useForm<{ name: string; address: string }>()
  const [ownerForm] = Form.useForm<OwnerForm>()
  const { message } = AntApp.useApp()

  async function reload() {
    setLoading(true)
    try {
      const [nextTenants, nextPlans] = await Promise.all([getAdminTenants(), getAdminPlans()])
      setTenants(nextTenants)
      setPlans(nextPlans)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  async function openTenant(tenantId: string) {
    try { setSelected(await getAdminTenant(tenantId)) } catch (error) { message.error((error as Error).message) }
  }

  async function submit(values: TenantForm) {
    try {
      const result = await createAdminTenant({ ...values, planExpiresAt: values.planExpiresAt.toISOString() })
      setCredentials({ email: values.ownerEmail, temporaryPassword: result.temporaryPassword })
      message.success('Đã tạo doanh nghiệp và chủ tòa nhà')
      setOpen(false)
      form.resetFields()
      await reload()
    } catch (error) { message.error((error as Error).message) }
  }

  async function toggle(tenant: Tenant) {
    try { await updateAdminTenant(tenant.id, { status: tenant.status === 'active' ? 'suspended' : 'active' }); await reload() } catch (error) { message.error((error as Error).message) }
  }

  async function submitBuilding(values: { name: string; address: string }) {
    if (!selected) return
    try { await createAdminBuilding(selected.id, values); message.success('Đã tạo tòa nhà cho doanh nghiệp'); setBuildingOpen(false); buildingForm.resetFields(); await openTenant(selected.id) } catch (error) { message.error((error as Error).message) }
  }

  async function submitOwner(values: OwnerForm) {
    if (!selected) return
    try {
      const owner = await createAdminOwner(selected.id, values)
      setCredentials({ email: owner.email, temporaryPassword: owner.temporaryPassword })
      message.success('Đã thêm chủ tòa nhà')
      setOwnerOpen(false)
      ownerForm.resetFields()
      await openTenant(selected.id)
    } catch (error) { message.error((error as Error).message) }
  }

  async function copyCredentials() {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(`Email: ${credentials.email}\nMật khẩu tạm: ${credentials.temporaryPassword}`)
      message.success('Đã sao chép thông tin đăng nhập')
    } catch {
      message.error('Không thể sao chép tự động. Vui lòng sao chép thủ công.')
    }
  }

  async function removeOwner(owner: User) {
    if (!selected) return
    try { await deleteAdminUser(owner.id); message.success('Đã xóa chủ tòa nhà'); await openTenant(selected.id) } catch (error) { message.error((error as Error).message) }
  }

  async function removeBuilding(buildingId: string) {
    if (!selected) return
    try { await deleteAdminBuilding(buildingId); message.success('Đã xóa tòa nhà'); await openTenant(selected.id) } catch (error) { message.error((error as Error).message) }
  }

  const owners = selected?.users.filter((user) => user.role === 'building_owner') ?? []

  return (
    <main className="workspace">
      <div className="page-heading">
        <Title level={1}>Doanh nghiệp</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Thêm doanh nghiệp và chủ tòa nhà</Button>
      </div>

      <Card className="tool-card">
        <Table<Tenant>
          rowKey="id" loading={loading} dataSource={tenants} locale={{ emptyText: 'Chưa có doanh nghiệp' }}
          columns={[
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Subdomain', dataIndex: 'subdomain' },
            { title: 'Gói', dataIndex: 'planId' },
            { title: 'Hết hạn', dataIndex: 'planExpiresAt', render: (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(value)) },
            { title: 'Trạng thái', dataIndex: 'status', render: (status: Tenant['status'], tenant: Tenant) => <Button type="link" onClick={() => void toggle(tenant)}><Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Hoạt động' : 'Tạm dừng'}</Tag></Button> },
            { title: 'Thao tác', render: (_value: unknown, tenant: Tenant) => <Button size="small" onClick={() => void openTenant(tenant.id)}>Quản lý chủ và tòa nhà</Button> },
          ]}
        />
      </Card>

      {selected ? (
        <>
          <Card title={`Chủ tòa nhà của ${selected.name}`} className="tool-card" extra={<Space><Button onClick={() => setSelected(null)}>Đóng</Button><Button type="primary" onClick={() => setOwnerOpen(true)}>Thêm chủ tòa nhà</Button></Space>}>
            <Table<User>
              rowKey="id" dataSource={owners} pagination={false} locale={{ emptyText: 'Chưa có chủ tòa nhà' }}
              columns={[
                { title: 'Họ tên', dataIndex: 'name', render: (value: string) => <Text strong>{value}</Text> },
                { title: 'Email', dataIndex: 'email' },
                { title: 'Trạng thái', dataIndex: 'status', render: (status: User['status']) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Tag> },
                { title: 'Hành động', render: (_value: unknown, owner: User) => <Popconfirm title={`Xóa chủ tòa nhà ${owner.name}?`} description="Tài khoản sẽ không thể đăng nhập nữa." okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => void removeOwner(owner)}><Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button></Popconfirm> },
              ]}
            />
          </Card>
          <Card title={`Tòa nhà của ${selected.name}`} className="tool-card" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setBuildingOpen(true)}>Thêm tòa nhà</Button>}>
            <Table rowKey="id" dataSource={selected.buildings} pagination={false} locale={{ emptyText: 'Chưa có tòa nhà' }} columns={[
              { title: 'Tên', dataIndex: 'name' },
              { title: 'Địa chỉ', dataIndex: 'address' },
              { title: 'Số tầng', dataIndex: 'floorCount' },
              { title: 'Trạng thái', dataIndex: 'status' },
              { title: 'Hành động', render: (_value: unknown, building: TenantDetail['buildings'][number]) => <Popconfirm title={`Xóa tòa nhà ${building.name}?`} description="Các tầng và dữ liệu sơ đồ của tòa nhà cũng sẽ bị xóa." okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => void removeBuilding(building.id)}><Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button></Popconfirm> },
            ]} />
          </Card>
        </>
      ) : null}

      <Modal title="Thêm doanh nghiệp và chủ tòa nhà" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Tạo" cancelText="Hủy">
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="name" label="Tên doanh nghiệp" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="subdomain" label="Subdomain" rules={[{ required: true }]}><Input addonAfter=".indoor-spatial.vn" /></Form.Item>
          <Form.Item name="planId" label="Gói dịch vụ" rules={[{ required: true }]}><Select options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} /></Form.Item>
          <Form.Item name="planExpiresAt" label="Ngày hết hạn" initialValue={dayjs().add(1, 'year')} rules={[{ required: true }]}><DatePicker className="full-width" /></Form.Item>
          <Form.Item name="ownerName" label="Tên chủ tòa nhà" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ownerEmail" label="Email chủ tòa nhà" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Thêm chủ tòa nhà" open={ownerOpen} onCancel={() => setOwnerOpen(false)} onOk={() => ownerForm.submit()} okText="Thêm" cancelText="Hủy">
        <Form form={ownerForm} layout="vertical" onFinish={submitOwner}><Form.Item name="name" label="Tên chủ tòa nhà" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item></Form>
      </Modal>
      <Modal title="Thêm tòa nhà" open={buildingOpen} onCancel={() => setBuildingOpen(false)} onOk={() => buildingForm.submit()} okText="Tạo" cancelText="Hủy">
        <Form form={buildingForm} layout="vertical" onFinish={submitBuilding}><Form.Item name="name" label="Tên tòa nhà" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}><Input /></Form.Item></Form>
      </Modal>
      <Modal title="Thông tin đăng nhập chủ tòa nhà" open={credentials !== null} onCancel={() => setCredentials(null)} footer={<Button type="primary" icon={<CopyOutlined />} onClick={() => void copyCredentials()}>Sao chép thông tin</Button>}>
        <Typography.Paragraph>Hãy gửi thông tin này cho chủ tòa nhà. Đây là mật khẩu tạm và tài khoản sẽ được yêu cầu đổi mật khẩu sau lần đăng nhập đầu tiên.</Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="Email đăng nhập"><Input readOnly value={credentials?.email ?? ''} /></Form.Item>
          <Form.Item label="Mật khẩu tạm"><Input.Password readOnly value={credentials?.temporaryPassword ?? ''} /></Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
