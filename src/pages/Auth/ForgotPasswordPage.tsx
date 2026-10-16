import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../auth/api'

const { Title, Text } = Typography
export function ForgotPasswordPage() {
  const [token, setToken] = useState<string>()
  const { message } = AntApp.useApp()
  async function submit(values: { email: string }) { try { const result = await forgotPassword(values.email); setToken(result.resetToken); message.success(result.message) } catch (error) { message.error((error as Error).message) } }
  return <main className="workspace auth-workspace"><Card className="auth-card"><Title level={2}>Quên mật khẩu</Title><Form layout="vertical" onFinish={submit}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item><Button type="primary" htmlType="submit">Nhận mã đặt lại</Button></Form>{token ? <Text copyable>Mã demo: {token}</Text> : null}<div><Link to="/login">Quay lại đăng nhập</Link></div></Card></main>
}
