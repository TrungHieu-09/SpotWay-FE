import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createStoreOwner, deleteStoreOwner, getStoreOwners, resetStoreOwnerPassword, updateStoreOwner, type StoreOwnerSummary } from '../../api/storeOwners'
import type { User } from '../../types/auth'

export function StoreOwnerManagementPage() {
  const [users, setUsers] = useState<StoreOwnerSummary[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm<Pick<User, 'name' | 'email'>>()
  const { message } = AntApp.useApp()
  async function reload() { setLoading(true); try { setUsers(await getStoreOwners()) } catch (error) { message.error((error as Error).message) } finally { setLoading(false) } }
  useEffect(() => { reload() }, [])
  async function submit(values: Pick<User, 'name' | 'email'>) { try { const result = await createStoreOwner(values); message.success(`Đã tạo tài khoản. Mật khẩu tạm: ${result.temporaryPassword}`); setOpen(false); form.resetFields(); await reload() } catch (error) { message.error((error as Error).message) } }
  return <main className="workspace"><div className="page-heading"><div><Typography.Text type="secondary">Quản lý tòa nhà</Typography.Text><Typography.Title level={1}>Chủ gian hàng</Typography.Title></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo chủ gian hàng</Button></div><Card className="tool-card"><Table<StoreOwnerSummary> rowKey="id" loading={loading} dataSource={users} locale={{ emptyText: 'Chưa có chủ gian hàng' }} columns={[{ title: 'Họ tên', dataIndex: 'name' }, { title: 'Email', dataIndex: 'email' }, { title: 'Trạng thái', dataIndex: 'status', render: (status: User['status'], user) => <Button type="link" onClick={() => updateStoreOwner(user.id, status === 'active' ? 'locked' : 'active').then(reload).catch((error: Error) => message.error(error.message))}><Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Tag></Button> }, { title: 'Gian hàng', dataIndex: 'storeCount' }, { title: 'Thao tác', render: (_value, user) => <Space><Button size="small" onClick={async () => { try { const result = await resetStoreOwnerPassword(user.id); message.success(`Mật khẩu tạm: ${result.temporaryPassword}`) } catch (error) { message.error((error as Error).message) } }}>Đặt lại mật khẩu</Button><Popconfirm title="Xóa tài khoản này?" onConfirm={() => deleteStoreOwner(user.id).then(reload).catch((error: Error) => message.error(error.message))}><Button danger size="small" disabled={user.storeCount > 0}>Xóa</Button></Popconfirm></Space> }]} /></Card><Modal title="Tạo chủ gian hàng" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Tạo" cancelText="Hủy"><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="name" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Form></Modal></main>
}
