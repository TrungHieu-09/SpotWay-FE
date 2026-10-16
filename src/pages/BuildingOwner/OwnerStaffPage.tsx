import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createTenantUser, deleteTenantUser, getTenantUsers, updateTenantUser } from '../../api/tenant'
import type { Role, User } from '../../types/auth'

const { Title } = Typography

export function OwnerStaffPage() {
  const [users, setUsers] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ name: string; email: string; role: 'building_manager' | 'store_owner' }>()
  const [loading, setLoading] = useState(true)
  const { message } = AntApp.useApp()

  function reload() {
    setLoading(true)
    return getTenantUsers().then(setUsers).catch((error: Error) => message.error(error.message)).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  async function submit(values: { name: string; email: string; role: 'building_manager' | 'store_owner' }) {
    try {
      const result = await createTenantUser(values)
      message.success(`Đã tạo tài khoản. Mật khẩu tạm: ${result.temporaryPassword}`)
      setOpen(false)
      form.resetFields()
      await reload()
    } catch (error) { message.error((error as Error).message) }
  }

  return <main className="workspace"><div className="page-heading"><Title level={1}>Nhân viên</Title><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo tài khoản</Button></div><Card className="tool-card"><Table<User> rowKey="id" loading={loading} dataSource={users} locale={{ emptyText: 'Chưa có nhân viên' }} columns={[{ title: 'Họ tên', dataIndex: 'name' }, { title: 'Email', dataIndex: 'email' }, { title: 'Vai trò', dataIndex: 'role', render: (role: Role) => role === 'building_manager' ? 'Quản lý tòa nhà' : 'Chủ gian hàng' }, { title: 'Trạng thái', dataIndex: 'status', render: (status: User['status'], record) => <Tag color={status === 'active' ? 'green' : 'red'} onClick={async () => { await updateTenantUser(record.id, status === 'active' ? 'locked' : 'active'); await reload() }}>{status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</Tag> }, { title: 'Hành động', render: (_value, record) => <Space><Button size="small" onClick={async () => { const result = await updateTenantUser(record.id, record.status, true); message.success(`Mật khẩu tạm: ${result.temporaryPassword ?? 'Demo@123'}`) }}>Đặt lại mật khẩu</Button><Button danger size="small" onClick={() => Modal.confirm({ title: 'Xóa tài khoản này?', onOk: async () => { await deleteTenantUser(record.id); await reload() } })}>Xóa</Button></Space> }]} /></Card><Modal title="Tạo tài khoản nhân viên" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Tạo" cancelText="Hủy"><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}><Input /></Form.Item><Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}><Select options={[{ value: 'building_manager', label: 'Quản lý tòa nhà' }, { value: 'store_owner', label: 'Chủ gian hàng' }]} /></Form.Item></Form></Modal></main>
}
