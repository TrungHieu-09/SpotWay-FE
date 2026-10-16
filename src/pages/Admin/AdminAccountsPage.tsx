import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { getAdminUsers, updateAdminUser, deleteAdminUser, resetAdminUserPassword } from '../../api/admin'
import type { AdminUser } from '../../types/admin'
import type { Role } from '../../types/auth'

const { Title } = Typography
const roleLabels: Record<Role, string> = { admin: 'Admin', building_owner: 'Chủ tòa nhà', building_manager: 'Quản lý tòa nhà', store_owner: 'Chủ gian hàng' }

export function AdminAccountsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [role, setRole] = useState<Role | undefined>()
  const [loading, setLoading] = useState(true)
  const { message } = AntApp.useApp()
  async function reload() { setLoading(true); try { setUsers(await getAdminUsers()) } catch (error) { message.error((error as Error).message) } finally { setLoading(false) } }
  useEffect(() => { reload() }, [])
  async function toggle(user: AdminUser) { try { await updateAdminUser(user.id, { status: user.status === 'active' ? 'locked' : 'active' }); await reload() } catch (error) { message.error((error as Error).message) } }
  async function remove(userId: string) { try { await deleteAdminUser(userId); message.success('Đã xóa tài khoản'); await reload() } catch (error) { message.error((error as Error).message) } }
  const visibleUsers = role ? users.filter((user) => user.role === role) : users
  return <main className="workspace"><div className="page-heading"><Title level={1}>Tài khoản</Title><Select allowClear placeholder="Lọc theo vai trò" value={role} onChange={setRole} options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))} /></div><Card className="tool-card"><Table<AdminUser> rowKey="id" loading={loading} dataSource={visibleUsers} locale={{ emptyText: 'Chưa có tài khoản' }} columns={[{ title: 'Họ tên', dataIndex: 'name' }, { title: 'Email', dataIndex: 'email' }, { title: 'Doanh nghiệp', dataIndex: 'tenantName' }, { title: 'Vai trò', dataIndex: 'role', render: (value: Role) => roleLabels[value] }, { title: 'Trạng thái', dataIndex: 'status', render: (status: AdminUser['status'], user) => <Button type="link" onClick={() => toggle(user)}><Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Tag></Button> }, { title: 'Hành động', render: (_value, user) => <Space><Button size="small" onClick={async () => { try { const result = await resetAdminUserPassword(user.id); message.success(`Mật khẩu tạm: ${result.temporaryPassword}`) } catch (error) { message.error((error as Error).message) } }}>Đặt lại mật khẩu</Button><Popconfirm title="Xóa tài khoản này?" onConfirm={() => remove(user.id)}><Button danger size="small">Xóa</Button></Popconfirm></Space> }]} /></Card></main>
}
