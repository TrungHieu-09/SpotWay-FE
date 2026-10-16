import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Select, Space, Typography } from 'antd'
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { roleLabel, useAuthStore } from '../../auth/store'
import type { Role } from '../../types/auth'

const { Text, Title } = Typography
const demoAccounts: Array<{ role: Role; email: string }> = [
  { role: 'admin', email: 'admin@demo.vn' },
  { role: 'building_owner', email: 'owner1@demo.vn' },
  { role: 'building_manager', email: 'manager1@demo.vn' },
  { role: 'store_owner', email: 'lumi@demo.vn' },
]

function homeForRole(role: Role) {
  return {
    admin: '/admin',
    building_owner: '/owner/dashboard',
    building_manager: '/manager',
    store_owner: '/store/profile',
  }[role]
}

export function LoginPage() {
  const [form] = Form.useForm<{ email: string; password: string }>()
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const login = useAuthStore((state) => state.login)

  useEffect(() => {
    if (user) {
      navigate(homeForRole(user.role), { replace: true })
    }
  }, [navigate, user])

  async function handleSubmit(values: { email: string; password: string }) {
    setSubmitting(true)
    try {
      await login(values.email, values.password)
      const redirect = new URLSearchParams(location.search).get('redirect')
      const nextPath = redirect?.startsWith('/') ? redirect : undefined
      const nextUser = useAuthStore.getState().user
      navigate(nextPath ?? homeForRole(nextUser?.role ?? 'building_owner'), {
        replace: true,
      })
      message.success('Đăng nhập thành công')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Đăng nhập thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="workspace auth-workspace">
      <Card className="auth-card">
        <Space orientation="vertical" size={4} className="full-width">
          <Text type="secondary">Indoor Spatial</Text>
          <Title level={2}>Đăng nhập hệ thống</Title>
          <Text type="secondary">Tài khoản demo dùng chung mật khẩu Demo@123.</Text>
        </Space>
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="auth-form">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input prefix={<UserOutlined />} placeholder="you@demo.vn" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Demo@123" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block icon={<LoginOutlined />} loading={submitting}>
            Đăng nhập
          </Button>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </Form>
        {import.meta.env.DEV ? (
          <div className="demo-account-list">
            <Text strong>Tài khoản demo</Text>
            <Select
              className="full-width"
              placeholder="Chọn vai trò để điền nhanh"
              options={demoAccounts.map((account) => ({
                value: account.email,
                label: `${roleLabel(account.role)} — ${account.email}`,
              }))}
              onChange={(email) => form.setFieldsValue({ email, password: 'Demo@123' })}
            />
          </div>
        ) : null}
      </Card>
    </main>
  )
}
