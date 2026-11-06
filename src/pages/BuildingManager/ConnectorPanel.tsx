import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, Checkbox, Empty, Form, Input, List, Modal, Popconfirm, Select, Space, Spin, Switch, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { createBuildingConnector, deleteBuildingConnector, getBuildingConnectors, getGraph, updateBuildingConnector, type BuildingConnector, type ConnectorKind, type GraphNode } from '../../api/graph'
import { useFloorStore } from '../../store/useFloorStore'
import { suggestConnectors, type ConnectorSuggestion } from '../../utils/graphSuggestions'

type FormValues = { name: string; kind: ConnectorKind; accessible: boolean; stopIds: string[] }
const style: Record<ConnectorKind, { color: string; label: string }> = {
  ELEVATOR: { color: 'purple', label: 'Thang máy' },
  STAIR: { color: 'orange', label: 'Cầu thang bộ' },
  ESCALATOR: { color: 'cyan', label: 'Thang cuốn' },
}

export function ConnectorPanel({ readOnly = false }: { readOnly?: boolean }) {
  const floors = useFloorStore((state) => state.floors)
  const [connectors, setConnectors] = useState<BuildingConnector[]>([])
  const [nodesByFloor, setNodesByFloor] = useState<Record<string, GraphNode[]>>({})
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ConnectorSuggestion[] | null>(null)
  const [form] = Form.useForm<FormValues>()
  const chosenKind = Form.useWatch('kind', form)
  const { message } = AntApp.useApp()
  const buildingId = floors[0]?.buildingId

  const nodeOptions = useMemo(() => floors.flatMap((floor) => (nodesByFloor[floor.id] ?? [])
    .filter((node) => chosenKind ? node.type === chosenKind : ['ELEVATOR', 'STAIR', 'ESCALATOR'].includes(node.type))
    .map((node) => ({ value: `${floor.id}:${node.id}`, label: `${floor.name} · ${node.name ?? node.type} (${node.type})` }))), [chosenKind, floors, nodesByFloor])

  async function load() {
    if (!buildingId) return
    setLoading(true)
    try {
      const [nextConnectors, graphs] = await Promise.all([getBuildingConnectors(buildingId), Promise.all(floors.map(async (floor) => [floor.id, await getGraph(floor.id)] as const))])
      setConnectors(nextConnectors)
      setNodesByFloor(Object.fromEntries(graphs.map(([floorId, graph]) => [floorId, graph.nodes])))
    } catch (error) { message.error((error as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [buildingId, floors.length])

  async function submit(values: FormValues) {
    if (!buildingId || values.stopIds.length < 2) return
    const stops = values.stopIds.map((value) => { const [floorId, nodeId] = value.split(':'); return { floorId, nodeId } })
    if (new Set(stops.map((stop) => stop.floorId)).size < 2) {
      message.warning('Connector phải có node ở ít nhất 2 tầng khác nhau.')
      return
    }
    try {
      const connector = await createBuildingConnector(buildingId, {
        name: values.name,
        kind: values.kind,
        accessible: values.accessible,
        stops,
      })
      setConnectors((items) => [...items, connector])
      setOpen(false); form.resetFields(); message.success('Đã tạo connector liên tầng.')
    } catch (error) { message.error((error as Error).message) }
  }

  function openSuggestions() {
    const linked = new Set(connectors.flatMap((connector) => connector.stops.map((stop) => stop.nodeId)))
    const next = suggestConnectors(
      floors.map((floor) => ({ floorId: floor.id, level: floor.level, mapWidth: floor.mapWidth, mapHeight: floor.mapHeight, nodes: nodesByFloor[floor.id] ?? [] })),
      linked,
    )
    if (next.length === 0) message.info('Không tìm thấy cụm thang nào chưa liên kết (cần node cùng loại, gần cùng vị trí ở ≥ 2 tầng).')
    else setSuggestions(next)
  }

  async function acceptSuggestions(items: ConnectorSuggestion[]) {
    if (!buildingId) return
    try {
      const created: BuildingConnector[] = []
      for (const item of items) created.push(await createBuildingConnector(buildingId, { name: item.name, kind: item.kind, accessible: true, stops: item.stops }))
      setConnectors((current) => [...current, ...created])
      setSuggestions((current) => {
        const remaining = (current ?? []).filter((candidate) => !items.includes(candidate))
        return remaining.length > 0 ? remaining : null
      })
      message.success(`Đã tạo ${created.length} connector.`)
    } catch (error) { message.error((error as Error).message) }
  }

  async function patch(connectorId: string, input: { name?: string; accessible?: boolean }) {
    try {
      const updated = await updateBuildingConnector(connectorId, input)
      setConnectors((items) => items.map((item) => (item.id === connectorId ? updated : item)))
    } catch (error) { message.error((error as Error).message) }
  }

  async function remove(connectorId: string) {
    try { await deleteBuildingConnector(connectorId); setConnectors((items) => items.filter((item) => item.id !== connectorId)); message.success('Đã xóa connector.') } catch (error) { message.error((error as Error).message) }
  }

  return <Card className="tool-card" title="Connector liên tầng" extra={<Space><Button icon={<ThunderboltOutlined />} disabled={readOnly} onClick={openSuggestions}>Gợi ý connector</Button><Button type="primary" icon={<PlusOutlined />} disabled={readOnly || nodeOptions.length < 2} onClick={() => { form.setFieldsValue({ kind: 'ELEVATOR', accessible: true, stopIds: [] }); setOpen(true) }}>Tạo connector</Button></Space>}>
    <Typography.Paragraph type="secondary">Nhóm các node thang máy, cầu thang bộ hoặc thang cuốn giữa nhiều tầng để định tuyến xuyên tầng chính xác.</Typography.Paragraph>
    <Spin spinning={loading}><List dataSource={connectors} locale={{ emptyText: <Empty description="Chưa có connector liên tầng" /> }} renderItem={(connector) => <List.Item actions={[<Switch key="accessible" size="small" checked={connector.accessible} disabled={readOnly} checkedChildren="Tiếp cận" unCheckedChildren="Không" onChange={(checked) => void patch(connector.id, { accessible: checked })} />, <Popconfirm key="remove" title="Xóa connector này?" onConfirm={() => void remove(connector.id)} disabled={readOnly}><Button danger type="text" icon={<DeleteOutlined />} disabled={readOnly} /></Popconfirm>]}><Space direction="vertical" size={2}><Space><Tag color={style[connector.kind].color}>{style[connector.kind].label}</Tag><Typography.Text strong editable={readOnly ? false : { onChange: (value) => { const name = value.trim(); if (name && name !== connector.name) void patch(connector.id, { name }) } }}>{connector.name}</Typography.Text>{!connector.accessible && <Tag>Không tiếp cận</Tag>}</Space><Typography.Text type="secondary">{connector.stops.map((stop) => floors.find((floor) => floor.id === stop.floorId)?.name ?? stop.floorId).join(' → ')}</Typography.Text></Space></List.Item>} /></Spin>
    <Modal title="Gợi ý connector" open={suggestions !== null} footer={null} onCancel={() => setSuggestions(null)} destroyOnHidden>
      <Typography.Paragraph type="secondary">Các node cùng loại nằm gần cùng vị trí ở nhiều tầng. Kiểm tra trước khi tạo.</Typography.Paragraph>
      <List dataSource={suggestions ?? []} renderItem={(item) => <List.Item actions={[<Button key="add" size="small" type="primary" onClick={() => void acceptSuggestions([item])}>Tạo</Button>]}><Space orientation="vertical" size={2}><Space><Tag color={style[item.kind].color}>{style[item.kind].label}</Tag><Typography.Text strong>{item.name}</Typography.Text></Space><Typography.Text type="secondary">{item.stops.map((stop) => floors.find((floor) => floor.id === stop.floorId)?.name ?? stop.floorId).join(' → ')}</Typography.Text></Space></List.Item>} />
      {(suggestions?.length ?? 0) > 1 && <Button block type="primary" onClick={() => void acceptSuggestions(suggestions ?? [])}>Tạo tất cả ({suggestions?.length})</Button>}
    </Modal>
    <Modal title="Tạo connector liên tầng" open={open} okText="Tạo" cancelText="Hủy" onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnHidden forceRender>
      <Form form={form} layout="vertical" onFinish={(values) => void submit(values)} initialValues={{ kind: 'ELEVATOR', accessible: true, stopIds: [] }}>
        <Form.Item name="name" label="Tên connector" rules={[{ required: true, message: 'Nhập tên connector' }]}><Input placeholder="Thang máy A" /></Form.Item>
        <Form.Item name="kind" label="Loại" rules={[{ required: true }]}><Select onChange={() => form.setFieldValue('stopIds', [])} options={Object.entries(style).map(([value, item]) => ({ value, label: item.label }))} /></Form.Item>
        <Form.Item name="accessible" valuePropName="checked"><Switch checkedChildren="Tiếp cận" unCheckedChildren="Không tiếp cận" /></Form.Item>
        <Form.Item name="stopIds" label="Điểm dừng (tối thiểu 2 tầng)" rules={[{ required: true, type: 'array', min: 2, message: 'Chọn ít nhất 2 node ở các tầng' }]}><Checkbox.Group options={nodeOptions} style={{ display: 'grid', gap: 8 }} /></Form.Item>
      </Form>
    </Modal>
  </Card>
}
