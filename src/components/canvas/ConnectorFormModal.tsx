import { useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Switch, message } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { graphGateway } from '../../api/graphGateway'
import type { Floor } from '../../types/floor'
import type { ConnectorKind, GraphNode, NewConnector } from '../../types/graph'
import { CONNECTOR_STYLE } from './ConnectorsLayer'

type ConnectorFormValues = {
  name: string
  kind: ConnectorKind
  accessible: boolean
  stops: { floorId?: string; nodeId?: string }[]
}

type ConnectorFormModalProps = {
  open: boolean
  floors: readonly Floor[]
  defaultFloorId?: string
  onSubmit: (input: NewConnector) => Promise<boolean>
  onClose: () => void
}

const KIND_OPTIONS = (Object.keys(CONNECTOR_STYLE) as ConnectorKind[]).map((kind) => ({
  value: kind,
  label: CONNECTOR_STYLE[kind].label,
}))

/** Tạo connector: chọn ≥ 2 tầng và, ở mỗi tầng, node cùng loại (thang máy/thang bộ/thang cuốn) mà nó phục vụ. */
export function ConnectorFormModal({ open, floors, defaultFloorId, onSubmit, onClose }: ConnectorFormModalProps) {
  const [form] = Form.useForm<ConnectorFormValues>()
  const [nodesByFloor, setNodesByFloor] = useState<Record<string, GraphNode[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const kind = Form.useWatch('kind', form) ?? 'ELEVATOR'

  async function loadFloorNodes(floorId: string) {
    if (nodesByFloor[floorId]) return
    const floor = floors.find((item) => item.id === floorId)
    if (!floor) return
    try {
      const { nodes } = await graphGateway.fetchGraph(floorId, { width: floor.mapWidth, height: floor.mapHeight })
      setNodesByFloor((current) => ({ ...current, [floorId]: nodes }))
    } catch (reason) {
      message.error(`Không thể tải node của tầng: ${(reason as Error).message}`)
    }
  }

  function nodeOptions(floorId?: string) {
    if (!floorId) return []
    return (nodesByFloor[floorId] ?? [])
      .filter((node) => node.type === kind)
      .map((node) => ({ value: node.id, label: `${node.name ?? CONNECTOR_STYLE[kind].label} · #${node.id.slice(0, 6)}` }))
  }

  async function handleOk() {
    const values = await form.validateFields()
    const stops = values.stops.flatMap((stop) => (stop.floorId && stop.nodeId ? [{ floorId: stop.floorId, nodeId: stop.nodeId }] : []))
    if (new Set(stops.map((stop) => stop.floorId)).size !== stops.length) {
      message.warning('Mỗi tầng chỉ được chọn một node cho connector.')
      return
    }
    setSubmitting(true)
    try {
      const created = await onSubmit({ name: values.name.trim(), kind: values.kind, accessible: values.accessible, stops })
      if (created) {
        form.resetFields()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Tạo connector liên tầng"
      open={open}
      okText="Tạo"
      cancelText="Hủy"
      confirmLoading={submitting}
      onOk={() => void handleOk()}
      onCancel={onClose}
      destroyOnHidden
      afterOpenChange={(isOpen) => {
        if (isOpen && defaultFloorId) void loadFloorNodes(defaultFloorId)
      }}
    >
      <Form<ConnectorFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          kind: 'ELEVATOR',
          accessible: true,
          stops: [{ floorId: defaultFloorId }, {}],
        }}
        onValuesChange={(changed) => {
          if (changed.kind) {
            // Đổi loại → node đã chọn không còn khớp, bắt chọn lại.
            form.setFieldValue('stops', (form.getFieldValue('stops') as ConnectorFormValues['stops']).map((stop) => ({ floorId: stop.floorId })))
          }
        }}
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true, max: 100, message: 'Nhập tên (tối đa 100 ký tự)' }]}>
          <Input placeholder="Thang máy A" />
        </Form.Item>
        <Space size="large" align="start">
          <Form.Item name="kind" label="Loại">
            <Select options={KIND_OPTIONS} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="accessible" label="Xe lăn đi được" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
        <Form.List
          name="stops"
          rules={[
            {
              validator: async (_rule, stops: ConnectorFormValues['stops'] | undefined) => {
                if ((stops ?? []).filter((stop) => stop.floorId && stop.nodeId).length < 2) {
                  throw new Error('Chọn ít nhất 2 tầng, mỗi tầng một node')
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                  <Form.Item name={[field.name, 'floorId']} noStyle>
                    <Select
                      placeholder="Tầng"
                      style={{ width: 150 }}
                      options={floors.map((floor) => ({ value: floor.id, label: floor.name }))}
                      onChange={(floorId: string) => {
                        form.setFieldValue(['stops', field.name, 'nodeId'], undefined)
                        void loadFloorNodes(floorId)
                      }}
                    />
                  </Form.Item>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const floorId = form.getFieldValue(['stops', field.name, 'floorId']) as string | undefined
                      const options = nodeOptions(floorId)
                      return (
                        <Form.Item name={[field.name, 'nodeId']} noStyle>
                          <Select
                            placeholder={floorId && nodesByFloor[floorId] && options.length === 0 ? `Tầng chưa có node ${CONNECTOR_STYLE[kind].label}` : 'Node'}
                            style={{ width: 230 }}
                            options={options}
                            disabled={!floorId}
                            loading={Boolean(floorId) && !nodesByFloor[floorId as string]}
                          />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>
                  {fields.length > 2 && <MinusCircleOutlined onClick={() => remove(field.name)} />}
                </Space>
              ))}
              <Form.ErrorList errors={errors} />
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} block>
                Thêm tầng
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}
