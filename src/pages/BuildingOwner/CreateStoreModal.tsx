import { useEffect, useState } from 'react'
import { App as AntApp, Form, Input, Modal, Select } from 'antd'
import { getGraph, type GraphNode } from '../../api/graph'
import { createStore, updateStoreStatus } from '../../api/stores'
import type { Floor } from '../../types/floor'

type FormValues = { floorId: string; nodeId: string; name: string; description?: string }

export function CreateStoreModal({ floors, open, onClose }: { floors: Floor[]; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<FormValues>()
  const [nodesByFloorId, setNodesByFloorId] = useState<Record<string, GraphNode[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { message } = AntApp.useApp()
  const floorId = Form.useWatch('floorId', form)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (floors[0]) form.setFieldValue('floorId', floors[0].id)
    Promise.all(floors.map(async (floor) => [floor.id, await getGraph(floor.id)] as const))
      .then((results) => setNodesByFloorId(Object.fromEntries(results.map(([id, graph]) => [id, graph.nodes]))))
      .catch((error: Error) => message.error(`Không tải được Node: ${error.message}`))
  }, [floors, form, message, open])

  async function submit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const store = await createStore(values) as { id: string }
      await updateStoreStatus(store.id, 'ACTIVE')
      message.success('Đã tạo và công bố cửa hàng làm điểm đến.')
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedFloor = floors.find((floor) => floor.id === floorId)
  const nodeOptions = (nodesByFloorId[floorId] ?? []).map((node, index) => ({ value: node.id, label: `${node.type} · Node ${index + 1} (${Math.round(node.x)}, ${Math.round(node.y)})` }))

  return <Modal title="Tạo cửa hàng làm điểm đến" open={open} onCancel={onClose} onOk={() => form.submit()} okText="Tạo cửa hàng" confirmLoading={isSubmitting} destroyOnHidden forceRender>
    <Form form={form} layout="vertical" onFinish={submit}>
      <Form.Item name="name" label="Tên cửa hàng" rules={[{ required: true, message: 'Nhập tên cửa hàng' }]}><Input placeholder="Ví dụ: Highlands Coffee" /></Form.Item>
      <Form.Item name="floorId" label="Tầng" rules={[{ required: true, message: 'Chọn tầng' }]}><Select options={floors.map((floor) => ({ value: floor.id, label: `Tầng ${floor.level} · ${floor.name}` }))} onChange={() => form.setFieldValue('nodeId', undefined)} /></Form.Item>
      <Form.Item name="nodeId" label="Node tại lối vào cửa hàng" rules={[{ required: true, message: 'Tạo và chọn Node trên Map Editor trước' }]} extra={selectedFloor ? `Các Node của ${selectedFloor.name}` : undefined}><Select options={nodeOptions} placeholder="Chọn Node" /></Form.Item>
      <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
    </Form>
  </Modal>
}
