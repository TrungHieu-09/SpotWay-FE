import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createTenantUser, deleteTenantUser, getTenantAreas, getTenantUsers, updateTenantUser } from '../../api/tenant'
import type { Role, User } from '../../types/auth'
import type { Area } from '../../types/area'
import { useLocation } from 'react-router-dom'

const { Title } = Typography

export function OwnerStaffPage() {
  const [users, setUsers] = useState<User[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ name: string; email: string; role: 'building_manager' | 'store_owner'; areaIds?: string[] }>()
  const [loading, setLoading] = useState(true)
  const { message } = AntApp.useApp()
  const location = useLocation()
  const managerView = location.pathname.endsWith('/managers')
  const title = managerView ? 'Quản lý khu vực' : location.pathname.endsWith('/store-owners') ? 'Chủ gian hàng' : 'Tài khoản nhân sự'

  function reload() {
    setLoading(true)
    return Promise.all([getTenantUsers(), getTenantAreas()]).then(([nextUsers, nextAreas]) => { setUsers(nextUsers); setAreas(nextAreas) }).catch((error: Error) => message.error(error.message)).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  async function submit(values: { name: string; email: string; role: 'building_manager' | 'store_owner'; areaIds?: string[] }) {
    try {
      const result = await createTenantUser({ ...values, areaIds: values.role === 'building_manager' ? values.areaIds : [] })
      message.success(`Đã tạo tài khoản. Mật khẩu tạm: ${result.temporaryPassword}`)
      setOpen(false)
      form.resetFields()
      await reload()
    } catch (error) { message.error((error as Error).message) }
  }

  const visibleUsers = users.filter((user) => user.role === 'building_manager' || user.role === 'store_owner').filter((user) => !managerView || user.role === 'building_manager').filter((user) => managerView || !location.pathname.endsWith('/store-owners') || user.role === 'store_owner')
  return <main className="workspace"><div className="page-heading"><Title level={1}>{title}</Title><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldValue('role', managerView ? 'building_manager' : 'store_owner'); setOpen(true) }}>Tạo tài khoản</Button></div><Card className="tool-card"><Table<User> rowKey="id" loading={loading} dataSource={visibleUsers} locale={{ emptyText: 'Chưa có tài khoản' }} columns={[{ title: 'Họ tên', dataIndex: 'name' }, { title: 'Email', dataIndex: 'email' }, { title: 'Vai trò', dataIndex: 'role', render: (role: Role) => role === 'building_manager' ? 'Quản lý tòa nhà' : 'Chủ gian hàng' }, { title: 'Khu vực', dataIndex: 'areaIds', render: (ids: string[] | undefined, record) => record.role === 'building_manager' ? <Select size="small" mode="multiple" value={ids ?? []} options={areas.map((area) => ({ value: area.id, label: area.name }))} onChange={(next: string[]) => updateTenantUser(record.id, record.status, false, next).then(reload).catch((error: Error) => message.error(error.message))} style={{ minWidth: 220 }} /> : 'Không áp dụng' }, { title: 'Trạng thái', dataIndex: 'status', render: (status: User['status'], record) => <Button type="link" onClick={async () => { await updateTenantUser(record.id, status === 'active' ? 'locked' : 'active'); await reload() }}><Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</Tag></Button> }, { title: 'Hành động', render: (_value, record) => <Space><Button size="small" onClick={async () => { const result = await updateTenantUser(record.id, record.status, true); message.success(`Mật khẩu tạm: ${result.temporaryPassword ?? 'Demo@123'}`) }}>Đặt lại mật khẩu</Button><Button danger size="small" onClick={() => Modal.confirm({ title: 'Xóa tài khoản này?', onOk: async () => { await deleteTenantUser(record.id); await reload() } })}>Xóa</Button></Space> }]} /></Card><Modal title="Tạo tài khoản" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Tạo" cancelText="Hủy"><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}><Input /></Form.Item><Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}><Select disabled={managerView} options={[{ value: 'building_manager', label: 'Quản lý tòa nhà' }, { value: 'store_owner', label: 'Chủ gian hàng' }]} /></Form.Item><Form.Item noStyle shouldUpdate={(previous, current) => previous.role !== current.role}>{({ getFieldValue }) => getFieldValue('role') === 'building_manager' ? <Form.Item name="areaIds" label="Khu vực được quản lý" rules={[{ required: true, message: 'Chọn ít nhất một khu vực' }]}><Select mode="multiple" options={areas.map((area) => ({ value: area.id, label: area.name }))} /></Form.Item> : null}</Form.Item></Form></Modal></main>
}
