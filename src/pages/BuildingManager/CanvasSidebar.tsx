import { Button, Card, List, Popconfirm, Space, Tabs, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, ScanOutlined } from '@ant-design/icons'
import { CONNECTOR_STYLE } from '../../components/canvas/ConnectorsLayer'
import type { Connector, GraphEdge, GraphNode } from '../../types/graph'
import type { Poi } from '../../types/poi'
import type { WallSegment } from './CanvasBoard'

const { Text: AntText } = Typography

type CanvasSidebarProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Connector có điểm dừng ở tầng đang mở. */
  connectors: Connector[]
  pois: Poi[]
  walls: WallSegment[]
  floorNameById: ReadonlyMap<string, string>
  isolatedNodeIds?: ReadonlySet<string>
  selectedNodeId: string | null
  selectedWallId?: string
  canScanWalls: boolean
  edgeLength: (edge: GraphEdge) => number
  onSelectNode: (nodeId: string | null) => void
  onDeleteNode: (nodeId: string) => void
  onDeleteEdge: (edgeId: string) => void
  onCreateConnector: () => void
  onDeleteConnector: (connectorId: string) => void
  onDeletePoi: (poiId: string) => void
  onScanWalls: () => void
  onToggleWall: (wallId: string) => void
  onDeleteWall: (wallId: string) => void
}

/** Cột bên phải của canvas: danh sách Node / Edge / Connector / POI / Tường của tầng đang mở. */
export function CanvasSidebar({
  nodes,
  edges,
  connectors,
  pois,
  walls,
  floorNameById,
  isolatedNodeIds,
  selectedNodeId,
  selectedWallId,
  canScanWalls,
  edgeLength,
  onSelectNode,
  onDeleteNode,
  onDeleteEdge,
  onCreateConnector,
  onDeleteConnector,
  onDeletePoi,
  onScanWalls,
  onToggleWall,
  onDeleteWall,
}: CanvasSidebarProps) {
  return (
    <Card
      className="tool-card poi-card"
      styles={{ body: { padding: '12px 14px' } }}
    >
      <Tabs
        defaultActiveKey="nodes"
        items={[
          {
            key: 'nodes',
            label: `Node (${nodes.length})`,
            children: (
              <List
                size="small"
                dataSource={nodes}
                locale={{ emptyText: 'Chưa có Node. Click lên bản đồ để thêm' }}
                style={{ maxHeight: 520, overflowY: 'auto' }}
                renderItem={(node) => (
                  <List.Item
                    style={{
                      padding: '6px 8px',
                      background: selectedNodeId === node.id ? '#f0f9ff' : undefined,
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectNode(selectedNodeId === node.id ? null : node.id)}
                    actions={[
                      <div key="delete" onClick={(e) => e.stopPropagation()}>
                        <Popconfirm
                          title="Xác nhận xóa Node?"
                          onConfirm={() => onDeleteNode(node.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            danger
                            size="small"
                            type="text"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </div>,
                    ]}
                  >
                    <Space orientation="vertical" size={1}>
                      <Space>
                        <Tag
                          color={
                            node.type === 'ELEVATOR'
                              ? 'purple'
                              : node.type === 'DOOR'
                                ? 'orange'
                                : node.type === 'EXIT' || node.type === 'EMERGENCY_EXIT'
                                  ? 'green'
                                  : 'cyan'
                          }
                        >
                          {node.type}
                        </Tag>
                        <AntText strong style={{ fontSize: 12 }}>
                          #{node.id.slice(0, 6)}
                        </AntText>
                        {isolatedNodeIds?.has(node.id) && <Tag color="error">Chưa nối Edge</Tag>}
                      </Space>
                      <AntText type="secondary" style={{ fontSize: 11 }}>
                        {Math.round(node.x)}%, {Math.round(node.y)}%
                      </AntText>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'edges',
            label: `Edge (${edges.length})`,
            children: (
              <List
                size="small"
                dataSource={edges}
                locale={{ emptyText: 'Chưa có Edge. Nối 2 Node ở chế độ Edge' }}
                style={{ maxHeight: 520, overflowY: 'auto' }}
                renderItem={(edge) => (
                  <List.Item
                    style={{ padding: '6px 8px' }}
                    actions={[
                      <Popconfirm
                        key="delete"
                        title="Xác nhận xóa Edge?"
                        onConfirm={() => onDeleteEdge(edge.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          danger
                          size="small"
                          type="text"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>,
                    ]}
                  >
                    <Space orientation="vertical" size={1}>
                      <AntText style={{ fontSize: 12 }}>
                        #{edge.fromNodeId.slice(0, 5)} → #{edge.toNodeId.slice(0, 5)}
                      </AntText>
                      <AntText type="secondary" style={{ fontSize: 11 }}>
                        Khoảng cách: {Math.round(edgeLength(edge))}px bản đồ
                      </AntText>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'connectors',
            label: `Connector (${connectors.length})`,
            children: (
              <>
              <Button
                size="small"
                type="dashed"
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 8 }}
                onClick={() => onCreateConnector()}
              >
                Tạo connector
              </Button>
              <List
                size="small"
                dataSource={connectors}
                locale={{ emptyText: 'Tầng này chưa có thang máy/cầu thang liên kết tầng khác' }}
                style={{ maxHeight: 520, overflowY: 'auto' }}
                renderItem={(connector) => (
                  <List.Item
                    style={{ padding: '6px 8px' }}
                    actions={[
                      <Popconfirm
                        key="delete"
                        title="Xóa connector này?"
                        description="Các node vẫn giữ nguyên, chỉ gỡ liên kết giữa các tầng."
                        onConfirm={() => onDeleteConnector(connector.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <Space orientation="vertical" size={1}>
                      <Space>
                        <Tag color={CONNECTOR_STYLE[connector.kind].color}>{CONNECTOR_STYLE[connector.kind].label}</Tag>
                        <AntText strong style={{ fontSize: 12 }}>
                          {connector.name}
                        </AntText>
                        {!connector.accessible && <Tag>Không xe lăn</Tag>}
                      </Space>
                      <AntText type="secondary" style={{ fontSize: 11 }}>
                        Nối: {connector.stops.map((stop) => floorNameById.get(stop.floorId) ?? '?').join(' ↔ ')}
                      </AntText>
                    </Space>
                  </List.Item>
                )}
              />
              </>
            ),
          },
          {
            key: 'pois',
            label: `POI (${pois.length})`,
            children: (
              <List
                size="small"
                dataSource={pois}
                locale={{ emptyText: 'Chuyển sang chế độ POI để thêm' }}
                style={{ maxHeight: 520, overflowY: 'auto' }}
                renderItem={(poi) => (
                  <List.Item
                    style={{ padding: '6px 8px' }}
                    actions={[
                      <Button
                        key="delete"
                        danger
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => onDeletePoi(poi.id)}
                      />,
                    ]}
                  >
                    <Space orientation="vertical" size={1}>
                      <Space>
                        <AntText strong style={{ fontSize: 12 }}>
                          {poi.name}
                        </AntText>
                        <Tag color="blue">{poi.category}</Tag>
                        {!poi.nearestNodeId && <Tag color="warning">Chưa gắn Node</Tag>}
                      </Space>
                      <AntText type="secondary" style={{ fontSize: 11 }}>
                        {poi.x.toFixed(1)}%, {poi.y.toFixed(1)}%
                      </AntText>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'walls',
            label: `Tường (${walls.length})`,
            children: (
              <List
                size="small"
                dataSource={walls}
                locale={{
                  emptyText: (
                    <div style={{ padding: '16px 0', textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                        Chưa có vách tường nào.
                      </p>
                      <Button
                        size="small"
                        type="link"
                        icon={<ScanOutlined />}
                        onClick={() => onScanWalls()}
                        disabled={!canScanWalls}
                        style={{ marginTop: 4, padding: 0 }}
                      >
                        Quét vách tường từ ảnh sơ đồ
                      </Button>
                    </div>
                  ),
                }}
                style={{ maxHeight: 520, overflowY: 'auto' }}
                renderItem={(wall, idx) => (
                  <List.Item
                    style={{
                      padding: '6px 8px',
                      background: selectedWallId === wall.id ? '#f0f9ff' : undefined,
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => onToggleWall(wall.id)}
                    actions={[
                      <div key="delete" onClick={(e) => e.stopPropagation()}>
                        <Popconfirm
                          title="Xác nhận xóa vách tường này?"
                          onConfirm={() => onDeleteWall(wall.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            danger
                            size="small"
                            type="text"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </div>,
                    ]}
                  >
                    <Space orientation="vertical" size={1}>
                      <Space>
                        <Tag color="geekblue">Vách #{idx + 1}</Tag>
                        <AntText strong style={{ fontSize: 12 }}>
                          ({Math.round(wall.x1)}%, {Math.round(wall.y1)}%) → ({Math.round(wall.x2)}%, {Math.round(wall.y2)}%)
                        </AntText>
                      </Space>
                      <AntText type="secondary" style={{ fontSize: 11 }}>
                        Dài ~{Math.round(Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1))}% ảnh · Tự extrude sang 3D
                      </AntText>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />
    </Card>
  )
}
