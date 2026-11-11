import { useEffect } from 'react'
import { Form, Input, Modal, Select, Switch } from 'antd'
import type { GraphNode, NodePatch, NodeType } from '../../types/graph'

export const NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'NORMAL', label: 'Lối đi' },
  { value: 'JUNCTION', label: 'Giao lộ' },
  { value: 'DOOR', label: 'Cửa ra vào' },
  { value: 'ELEVATOR', label: 'Thang máy' },
  { value: 'STAIR', label: 'Cầu thang bộ' },
  { value: 'ESCALATOR', label: 'Thang cuốn' },
  { value: 'EXIT', label: 'Cửa thoát hiểm' },
  { value: 'EMERGENCY_EXIT', label: 'Thang thoát hiểm PCCC' },
]

type FormValues = { type: NodeType; name: string; accessible: boolean }

type NodeEditModalProps = {
  node: GraphNode | null
  onSubmit: (nodeId: string, patch: NodePatch) => void
  onClose: () => void
}

/** Sửa loại / tên / khả năng tiếp cận của một node đã tạo. */
export function NodeEditModal({ node, onSubmit, onClose }: NodeEditModalProps) {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    if (node) form.setFieldsValue({ type: node.type, name: node.name ?? '', accessible: node.accessible })
  }, [node, form])

  async function handleOk() {
    if (!node) return
    const values = await form.validateFields()
    const name = values.name.trim()
    onSubmit(node.id, { type: values.type, name: name || null, accessible: values.accessible })
    onClose()
  }

  return (
    <Modal open={Boolean(node)} title="Sửa node" okText="Lưu" cancelText="Hủy" onOk={() => void handleOk()} onCancel={onClose} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="type" label="Loại node" rules={[{ required: true }]}>
          <Select options={NODE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên điểm"
          dependencies={['type']}
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, value: string) =>
                getFieldValue('type') !== 'NORMAL' && !value?.trim()
                  ? Promise.reject(new Error('Node khác "Lối đi" cần có tên'))
                  : Promise.resolve(),
            }),
          ]}
        >
          <Input maxLength={100} placeholder="Ví dụ: Cửa thoát hiểm tầng 2" />
        </Form.Item>
        <Form.Item name="accessible" label="Xe lăn / người khuyết tật đi được" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
