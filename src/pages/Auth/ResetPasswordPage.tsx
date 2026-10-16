import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../auth/api'

const { Title } = Typography
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [done, setDone] = useState(false)
  const { message } = AntApp.useApp()
  async function submit(values: { token: string; newPassword: string }) { try { await resetPassword(values.token, values.newPassword); setDone(true); message.success('Đặt lại mật khẩu thành công') } catch (error) { message.error((error as Error).message) } }
  return <main className="workspace auth-workspace"><Card className="auth-card"><Title level={2}>Đặt lại mật khẩu</Title>{done ? <Link to="/login">Đăng nhập lại</Link> : <Form layout="vertical" onFinish={submit}><Form.Item name="token" label="Mã đặt lại" initialValue={params.get('token') ?? ''} rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true }, { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, message: 'Tối thiểu 8 ký tự, gồm chữ và số' }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit">Đặt lại mật khẩu</Button></Form>}</Card></main>
}
