import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { login, saveSession } from '../../api/auth'

type LoginValues = { email: string; password: string }

export function LoginPage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  async function submit(values: LoginValues) {
    try {
      const session = await login(values.email, values.password)
      saveSession(session)
      const role = window.localStorage.getItem('spotway.role')
      navigate(role === 'building_manager' ? '/manager' : '/owner/buildings', { replace: true })
    } catch (error) { message.error((error as Error).message) }
  }
  return <main className="workspace"><Card title="Đăng nhập SpotWay" style={{ width: 380, margin: '10vh auto' }}><Typography.Paragraph type="secondary">Dùng tài khoản được cấp bởi SpotWay.</Typography.Paragraph><Form layout="vertical" onFinish={submit}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item><Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} /></Form.Item><Button htmlType="submit" type="primary" block>Đăng nhập</Button></Form></Card></main>
}
