import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Empty, List, Popconfirm, Space, Spin, Tag, Typography } from 'antd'
import { StopOutlined, UnlockOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { usePermissions } from '../../auth/usePermissions'
import { useGraphStore } from '../../store/useGraphStore'
import { useLoadFloorData } from '../../hooks/useLoadFloorData'
import type { GraphEdge, GraphNode } from '../../types/graph'
import {
  blockMaintenance,
  getMaintenanceReport,
  unblockMaintenance,
  type MaintenanceReport,
} from '../../api/maintenance'
import { AppSelect as Select } from '../../components/ui/AppSelect'
import { FireAlarmCard } from './FireAlarmCard'

const { Text, Title } = Typography

const NO_NODES: GraphNode[] = []
const NO_EDGES: GraphEdge[] = []

/** Bảo trì = chặn edge/node để định tuyến tránh; BE không có "vùng" chữ nhật. */
export function MaintenancePanel({ readOnly = false }: { readOnly?: boolean }) {
  const floor = useFloorStore((state) => state.selectedFloor)
  const nodes: GraphNode[] = useGraphStore((state) => (floor ? state.nodesByFloor[floor.id] : undefined)) ?? NO_NODES
  const edges: GraphEdge[] = useGraphStore((state) => (floor ? state.edgesByFloor[floor.id] : undefined)) ?? NO_EDGES
  const loadFloorGraph = useGraphStore((state) => state.loadFloorGraph)
  useLoadFloorData(floor ? [floor] : [])
  const [report, setReport] = useState<MaintenanceReport | null>(null)
  const [pickedNodeIds, setPickedNodeIds] = useState<string[]>([])
  const [pickedEdgeIds, setPickedEdgeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = Boolean(floor && !readOnly && permissions.canEditFloor(floor))
  const floorId = floor?.id

  const nodeName = useCallback(
    (id: string) => {
      const node = nodes.find((item) => item.id === id)
      return node?.name?.trim() || (node ? `${node.type} · ${id.slice(0, 6)}` : id.slice(0, 6))
    },
    [nodes],
  )
  const nodeOptions = useMemo(() => nodes.map((node) => ({ value: node.id, label: nodeName(node.id) })), [nodes, nodeName])
  const edgeOptions = useMemo(
    () => edges.map((edge) => ({ value: edge.id, label: `${nodeName(edge.fromNodeId)} → ${nodeName(edge.toNodeId)}` })),
    [edges, nodeName],
  )

  useEffect(() => {
    setReport(null); setPickedNodeIds([]); setPickedEdgeIds([])
    if (!floorId) return
    let cancelled = false
    setLoading(true)
    getMaintenanceReport(floorId)
      .then((nextReport) => {
        if (cancelled) return
        setReport(nextReport)
      })
      .catch((error: Error) => { if (!cancelled) message.error(error.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [floorId, message])

  if (!floor) return <Empty description="Chọn tầng để quản lý bảo trì" />
  const currentFloorId = floor.id

  async function apply(action: 'block' | 'unblock', selection: { nodeIds?: string[]; edgeIds?: string[] }) {
    setLoading(true)
    try {
      const next = await (action === 'block' ? blockMaintenance : unblockMaintenance)(currentFloorId, selection)
      setReport(next)
      await loadFloorGraph(currentFloorId, { width: floor!.mapWidth, height: floor!.mapHeight })
      setPickedNodeIds([]); setPickedEdgeIds([])
      message.success(action === 'block' ? `Đã chặn ${next.changedEdges ?? 0} lối đi.` : `Đã mở lại ${next.changedEdges ?? 0} lối đi.`)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const hasPick = pickedNodeIds.length > 0 || pickedEdgeIds.length > 0
  const selection = { nodeIds: pickedNodeIds, edgeIds: pickedEdgeIds }

  return (
    <Card className="tool-card" title={<Title level={3} style={{ margin: 0 }}>Bảo trì lối đi</Title>}>
      <FireAlarmCard buildingId={floor.buildingId} nodes={nodes} nodeName={nodeName} canEdit={canEdit} />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Chặn lối đi (edge) hoặc mọi lối quanh một node đang sửa chữa; tìm đường của Guest sẽ tự tránh."
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Select mode="multiple" style={{ minWidth: 240 }} placeholder="Node (chặn mọi lối quanh node)" options={nodeOptions} value={pickedNodeIds} onChange={setPickedNodeIds} disabled={!canEdit} optionFilterProp="label" />
        <Select mode="multiple" style={{ minWidth: 280 }} placeholder="Edge cụ thể" options={edgeOptions} value={pickedEdgeIds} onChange={setPickedEdgeIds} disabled={!canEdit} optionFilterProp="label" />
        <Popconfirm title="Chặn các lối đi đã chọn?" okText="Chặn" cancelText="Hủy" onConfirm={() => void apply('block', selection)} disabled={!canEdit || !hasPick}>
          <Button danger icon={<StopOutlined />} disabled={!canEdit || !hasPick}>Chặn</Button>
        </Popconfirm>
        <Button icon={<UnlockOutlined />} disabled={!canEdit || !hasPick} onClick={() => void apply('unblock', selection)}>Mở lại</Button>
      </Space>
      <Spin spinning={loading}>
        <Text strong>Đang bị chặn ({report?.blockedEdges.length ?? 0} edge · {report?.blockedNodeIds.length ?? 0} node)</Text>
        <List
          size="small"
          dataSource={report?.blockedEdges ?? []}
          locale={{ emptyText: 'Không có lối đi nào đang bảo trì' }}
          renderItem={(edge) => (
            <List.Item
              actions={[<Button key="open" size="small" icon={<UnlockOutlined />} disabled={!canEdit} onClick={() => void apply('unblock', { edgeIds: [edge.id] })}>Mở lại</Button>]}
            >
              <Space>
                <Tag color="error">Chặn</Tag>
                <Text>{nodeName(edge.fromNodeId)} → {nodeName(edge.toNodeId)}</Text>
              </Space>
            </List.Item>
          )}
        />
        {report && report.blockedNodeIds.length > 0 && (
          <Text type="secondary">Node không đi qua được: {report.blockedNodeIds.map(nodeName).join(', ')}</Text>
        )}
      </Spin>
    </Card>
  )
}
