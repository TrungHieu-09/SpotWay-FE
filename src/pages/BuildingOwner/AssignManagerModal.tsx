import { App as AntApp, Checkbox, Form, Input, Modal } from 'antd'
import { assignManagerByEmail, createAndAssignManager } from '../../api/buildings'

type Values = { email: string; createAccount?: boolean; password?: string }

export function AssignManagerModal({ buildingId, open, onClose }: { buildingId: string; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<Values>()
  const { message } = AntApp.useApp()

  async function submit(values: Values) {
    try {
      if (values.createAccount) {
        await createAndAssignManager(buildingId, values.email, values.password ?? '')
        message.success('Đã tạo tài khoản và gán Manager vào tòa nhà.')
      } else {
        await assignManagerByEmail(buildingId, values.email)
        message.success('Đã gán Manager vào tòa nhà. Manager có thể đăng nhập lại để thấy Building.')
      }
      form.resetFields()
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return <Modal title="Gán Building Manager" open={open} okText="Gán Manager" onOk={() => form.submit()} onCancel={onClose} destroyOnHidden forceRender>
    <Form form={form} layout="vertical" onFinish={submit}>
      <Form.Item name="email" label="Email Manager" rules={[{ required: true, type: 'email', message: 'Nhập email Manager hợp lệ' }]} extra="Tài khoản Manager phải thuộc cùng tenant với Building.">
        <Input placeholder="manager@demo-mall.local" autoComplete="email" />
      </Form.Item>
      <Form.Item name="createAccount" valuePropName="checked"><Checkbox>Tạo tài khoản Manager mới nếu chưa có</Checkbox></Form.Item>
      <Form.Item noStyle shouldUpdate={(previous, current) => previous.createAccount !== current.createAccount}>
        {({ getFieldValue }) => getFieldValue('createAccount') ? <Form.Item name="password" label="Mật khẩu tạm thời" rules={[{ required: true, min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' }]}><Input.Password autoComplete="new-password" /></Form.Item> : null}
      </Form.Item>
    </Form>
  </Modal>
}
