import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'

const { Title, Text } = Typography
type Values = { currentPassword?: string; newPassword: string; confirm: string }

export function ChangePasswordPage() {
  const [form] = Form.useForm<Values>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const changePassword = useAuthStore((state) => state.changePassword)
  const { message } = AntApp.useApp()
  async function submit(values: Values) {
    try { await changePassword(values.currentPassword, values.newPassword); message.success('Đổi mật khẩu thành công'); navigate('/', { replace: true }) } catch (error) { message.error((error as Error).message) }
  }
  return <main className="workspace auth-workspace"><Card className="auth-card"><Text type="secondary">Bảo mật tài khoản</Text><Title level={2}>Đổi mật khẩu</Title>{user?.mustChangePassword ? <Text type="warning">Bạn cần đổi mật khẩu trước khi tiếp tục.</Text> : null}<Form form={form} layout="vertical" onFinish={submit}><Form.Item name="currentPassword" label="Mật khẩu hiện tại"><Input.Password /></Form.Item><Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true }, { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, message: 'Mật khẩu tối thiểu 8 ký tự, gồm chữ và số' }]}><Input.Password /></Form.Item><Form.Item name="confirm" label="Nhập lại mật khẩu" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator: (_, value: string) => value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại không khớp')) })]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit">Lưu mật khẩu</Button></Form></Card></main>
}
