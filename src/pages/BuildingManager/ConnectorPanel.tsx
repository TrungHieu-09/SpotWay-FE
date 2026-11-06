import { useEffect, useState } from 'react'
import { Button, Card, Empty, List, Popconfirm, Space, Spin, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { useGraphStore } from '../../store/useGraphStore'
import { useLoadFloorData } from '../../hooks/useLoadFloorData'
import { ConnectorFormModal } from '../../components/canvas/ConnectorFormModal'
import { ConnectorSuggestModal } from '../../components/canvas/ConnectorSuggestModal'
import { CONNECTOR_STYLE } from '../../components/canvas/ConnectorsLayer'
import type { Connector } from '../../types/graph'

const EMPTY_CONNECTORS: Connector[] = []

/** Quản lý connector của cả toà nhà; dùng chung store và modal với sidebar canvas. */
export function ConnectorPanel({ readOnly = false }: { readOnly?: boolean }) {
  const floors = useFloorStore((state) => state.floors)
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const buildingId = floors[0]?.buildingId
  const connectors = useGraphStore((state) => (buildingId && state.connectorsByBuilding[buildingId]) || EMPTY_CONNECTORS)
  const loadConnectors = useGraphStore((state) => state.loadConnectors)
  const createConnector = useGraphStore((state) => state.createConnector)
  const deleteConnector = useGraphStore((state) => state.deleteConnector)
  const [formOpen, setFormOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  useLoadFloorData(floors)

  useEffect(() => {
    if (buildingId) void loadConnectors(buildingId)
  }, [buildingId, loadConnectors])

  const floorName = new Map(floors.map((floor) => [floor.id, floor.name]))

  return (
    <Card
      className="tool-card"
      title="Connector liên tầng"
      extra={
        <Space>
          <Button icon={<ThunderboltOutlined />} disabled={readOnly} onClick={() => setSuggestOpen(true)}>Gợi ý connector</Button>
          <Button type="primary" icon={<PlusOutlined />} disabled={readOnly} onClick={() => setFormOpen(true)}>Tạo connector</Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Nhóm các node thang máy, cầu thang bộ hoặc thang cuốn giữa nhiều tầng để định tuyến xuyên tầng chính xác.
      </Typography.Paragraph>
      <Spin spinning={!buildingId}>
        <List
          dataSource={connectors}
          locale={{ emptyText: <Empty description="Chưa có connector liên tầng" /> }}
          renderItem={(connector) => (
            <List.Item
              actions={[
                <Popconfirm key="remove" title="Xóa connector này?" disabled={readOnly} onConfirm={() => buildingId && deleteConnector(buildingId, connector.id)}>
                  <Button danger type="text" icon={<DeleteOutlined />} disabled={readOnly} />
                </Popconfirm>,
              ]}
            >
              <Space orientation="vertical" size={2}>
                <Space>
                  <Tag color={CONNECTOR_STYLE[connector.kind].color}>{CONNECTOR_STYLE[connector.kind].label}</Tag>
                  <Typography.Text strong>{connector.name}</Typography.Text>
                  {!connector.accessible && <Tag>Không tiếp cận</Tag>}
                </Space>
                <Typography.Text type="secondary">
                  {connector.stops.map((stop) => floorName.get(stop.floorId) ?? stop.floorId).join(' → ')}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Spin>
      <ConnectorFormModal
        open={formOpen}
        floors={floors}
        defaultFloorId={selectedFloor?.id}
        onSubmit={(input) => (buildingId ? createConnector(buildingId, input) : Promise.resolve(false))}
        onClose={() => setFormOpen(false)}
      />
      <ConnectorSuggestModal
        open={suggestOpen}
        floors={floors}
        connectors={connectors}
        onCreate={(input) => (buildingId ? createConnector(buildingId, input) : Promise.resolve(false))}
        onClose={() => setSuggestOpen(false)}
      />
    </Card>
  )
}
