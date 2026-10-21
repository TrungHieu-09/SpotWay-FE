import { useEffect, useState } from 'react'
import { App as AntApp, Button, Form, Input, Radio, Typography } from 'antd'
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IsometricFloors, SectionLabel } from '../../components/ui/AuroraPrimitives'
import { roleLabel, useAuthStore } from '../../auth/store'
import type { Role } from '../../types/auth'

const demoAccounts: Array<{ role: Role; email: string }> = [
  { role: 'admin', email: 'admin@demo.vn' }, { role: 'building_owner', email: 'owner1@demo.vn' },
  { role: 'building_manager', email: 'manager1a@demo.vn' }, { role: 'store_owner', email: 'lumi@demo.vn' },
]

function homeForRole(role: Role) { return { admin: '/admin', building_owner: '/owner/dashboard', building_manager: '/manager', store_owner: '/store/profile' }[role] }

export function LoginPage() {
  const [form] = Form.useForm<{ email: string; password: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [selectedDemoEmail, setSelectedDemoEmail] = useState<string>()
  const navigate = useNavigate(); const location = useLocation(); const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user); const login = useAuthStore((state) => state.login)
  useEffect(() => { if (user) navigate(homeForRole(user.role), { replace: true }) }, [navigate, user])
  async function handleSubmit(values: { email: string; password: string }) { setSubmitting(true); try { await login(values.email, values.password); const redirect = new URLSearchParams(location.search).get('redirect'); const nextPath = redirect?.startsWith('/') ? redirect : undefined; const nextUser = useAuthStore.getState().user; navigate(nextPath ?? homeForRole(nextUser?.role ?? 'building_owner'), { replace: true }); message.success('Đăng nhập thành công') } catch (error) { message.error(error instanceof Error ? error.message : 'Đăng nhập thất bại') } finally { setSubmitting(false) } }
  return <main className="auth-workspace"><section className="auth-layout"><div className="auth-brand-panel"><div><SectionLabel>Không gian vận hành số</SectionLabel><Typography.Title level={1}>Mọi tầng, mọi điểm đến, một hướng nhìn.</Typography.Title><Typography.Paragraph>Indoor Spatial giúp doanh nghiệp biến không gian trong nhà thành trải nghiệm rõ ràng, dễ quản lý và dễ khám phá.</Typography.Paragraph></div><IsometricFloors /></div><div className="auth-form-panel"><SectionLabel>Cổng quản trị</SectionLabel><Typography.Title level={2}>Đăng nhập hệ thống</Typography.Title><Typography.Text type="secondary">Sử dụng tài khoản được cấp để tiếp tục.</Typography.Text><div className="demo-account-list"><Typography.Text strong>Chọn vai trò demo</Typography.Text><Radio.Group className="demo-role-grid" value={selectedDemoEmail} onChange={(event) => { const email = String(event.target.value); setSelectedDemoEmail(email); form.setFieldsValue({ email, password: 'Demo@123' }) }} aria-label="Chọn vai trò demo">{demoAccounts.map((account) => <Radio.Button key={account.email} value={account.email}>{roleLabel(account.role)}</Radio.Button>)}</Radio.Group><Typography.Text type="secondary">{selectedDemoEmail ? `${selectedDemoEmail} · Mật khẩu: Demo@123` : 'Chọn một vai trò để điền tài khoản đăng nhập.'}</Typography.Text><Button block icon={<LoginOutlined />} disabled={!selectedDemoEmail} loading={submitting} onClick={() => form.submit()}>Đăng nhập nhanh</Button></div><Form form={form} layout="vertical" onFinish={handleSubmit} className="auth-form"><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}><Input prefix={<UserOutlined />} placeholder="you@demo.vn" /></Form.Item><Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}><Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu của bạn" /></Form.Item><Button type="primary" htmlType="submit" block icon={<LoginOutlined />} loading={submitting}>Đăng nhập</Button><Link to="/forgot-password">Quên mật khẩu?</Link></Form></div></section></main>
}
