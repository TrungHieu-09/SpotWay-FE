import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Alert, Button, Card, Empty, Input, List, Popconfirm, Space, Spin, Typography } from 'antd'
import { DeleteOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { QRCodeCanvas } from 'qrcode.react'
import { useFloorStore } from '../../store/useFloorStore'
import { usePermissions } from '../../auth/usePermissions'
import { getGraph, type GraphNode } from '../../api/graph'
import {
  createQrAnchor,
  deleteQrAnchor,
  listQrAnchors,
  qrNavigationUrl,
  type CreatedQrAnchor,
  type QrAnchor,
} from '../../api/qrAnchors'
import { AppSelect as Select } from '../../components/ui/AppSelect'

const { Text, Title } = Typography

function downloadCanvas(canvasId: string, fileName: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
  if (!canvas) return
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `${fileName}.png`
  link.click()
}

/** Mã QR neo theo node: BE chỉ lưu bản băm của token nên link/QR chỉ xem được ngay lúc tạo. */
export function QrCodePanel({ readOnly = false }: { readOnly?: boolean }) {
  const floor = useFloorStore((state) => state.selectedFloor)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [nodeId, setNodeId] = useState<string>()
  const [label, setLabel] = useState('')
  const [anchors, setAnchors] = useState<QrAnchor[]>([])
  const [created, setCreated] = useState<CreatedQrAnchor[]>([])
  const [loading, setLoading] = useState(false)
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = Boolean(floor && !readOnly && permissions.canEditFloor(floor))
  const floorId = floor?.id

  const nodeOptions = useMemo(
    () => nodes.map((node) => ({ value: node.id, label: node.name?.trim() || `${node.type} · ${node.id.slice(0, 8)}` })),
    [nodes],
  )

  useEffect(() => {
    setNodes([])
    setNodeId(undefined)
    setAnchors([])
    setCreated([])
    if (!floorId) return
    let cancelled = false
    setLoading(true)
    getGraph(floorId)
      .then((graph) => { if (!cancelled) setNodes(graph.nodes) })
      .catch((error: Error) => { if (!cancelled) message.error(error.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [floorId, message])

  useEffect(() => {
    setAnchors([])
    if (!nodeId) return
    let cancelled = false
    setLoading(true)
    listQrAnchors(nodeId)
      .then((items) => { if (!cancelled) setAnchors(items) })
      .catch((error: Error) => { if (!cancelled) message.error(error.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [nodeId, message])

  if (!floor) return <Empty description="Chọn tầng để quản lý mã QR" />

  async function handleCreate() {
    if (!nodeId || !label.trim()) return
    try {
      const anchor = await createQrAnchor(nodeId, label.trim())
      setCreated((current) => [anchor, ...current])
      setAnchors((current) => [anchor, ...current])
      setLabel('')
      message.success('Đã tạo mã QR. Hãy tải/in ngay: token chỉ hiển thị một lần.')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function handleDelete(anchorId: string) {
    try {
      await deleteQrAnchor(anchorId)
      setAnchors((current) => current.filter((anchor) => anchor.id !== anchorId))
      setCreated((current) => current.filter((anchor) => anchor.id !== anchorId))
      message.success('Đã xoá mã QR')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return (
    <Card className="tool-card" title={<Title level={3} style={{ margin: 0 }}>Mã QR định vị</Title>}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Mỗi mã QR gắn vào một node. Khách quét mã để bắt đầu chỉ đường từ node đó."
      />
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          style={{ width: 260 }}
          placeholder={`Chọn node tầng ${floor.name}`}
          options={nodeOptions}
          value={nodeId}
          onChange={setNodeId}
          showSearch
          optionFilterProp="label"
        />
        <Input
          style={{ width: 220 }}
          placeholder="Nhãn, ví dụ: Cổng chính"
          maxLength={100}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={!canEdit || !nodeId}
        />
        <Button type="primary" icon={<PlusOutlined />} disabled={!canEdit || !nodeId || !label.trim()} onClick={() => void handleCreate()}>
          Tạo mã QR
        </Button>
      </Space>
      <Spin spinning={loading}>
        <List<QrAnchor>
          dataSource={anchors}
          locale={{ emptyText: nodeId ? 'Node này chưa có mã QR' : 'Chọn node để xem mã QR' }}
          renderItem={(anchor) => {
            const fresh = created.find((item) => item.id === anchor.id)
            const url = fresh ? qrNavigationUrl(window.location.origin, anchor.buildingId, fresh.token) : null
            const canvasId = `qr-${anchor.id}`
            return (
              <List.Item
                actions={[
                  <Popconfirm key="delete" title="Xoá mã QR này?" okText="Xoá" cancelText="Hủy" onConfirm={() => void handleDelete(anchor.id)}>
                    <Button danger icon={<DeleteOutlined />} disabled={!canEdit} />
                  </Popconfirm>,
                ]}
              >
                <Space align="start" size={16}>
                  {url ? <QRCodeCanvas id={canvasId} value={url} size={96} marginSize={2} /> : null}
                  <Space orientation="vertical" size={4}>
                    <Text strong>{anchor.label}</Text>
                    {url ? (
                      <>
                        <Text copyable={{ text: url }} ellipsis style={{ maxWidth: 320 }}>{url}</Text>
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadCanvas(canvasId, anchor.label)}>Tải PNG</Button>
                      </>
                    ) : (
                      <Text type="secondary">Token đã ẩn. Xoá và tạo lại nếu cần in mã mới.</Text>
                    )}
                  </Space>
                </Space>
              </List.Item>
            )
          }}
        />
      </Spin>
    </Card>
  )
}
