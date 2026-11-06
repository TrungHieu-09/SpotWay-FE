import { Button, Card, List, Popconfirm, Space, Switch, Tabs, Tag, Typography } from 'antd'
import { ApartmentOutlined, ClearOutlined, DeleteOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { CONNECTOR_STYLE } from '../../components/canvas/ConnectorsLayer'
import type { Connector, GraphEdge, GraphNode } from '../../types/graph'
import type { Poi } from '../../types/poi'

const { Text: AntText } = Typography

type DeleteAllButtonProps = { count: number; label: string; description: string; onConfirm: () => void }

/** Nút "Xóa tất cả" có xác nhận; ẩn khi danh sách rỗng. */
function DeleteAllButton({ count, label, description, onConfirm }: DeleteAllButtonProps) {
  if (count === 0) return null
  return (
    <Popconfirm
      title={`Xóa toàn bộ ${count} ${label} của tầng này?`}
      description={description}
      onConfirm={onConfirm}
      okText="Xóa tất cả"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
    >
      <Button danger size="small" block icon={<ClearOutlined />} style={{ marginBottom: 8 }}>
        Xóa tất cả {label}
      </Button>
    </Popconfirm>
  )
}

type CanvasSidebarProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Connector có điểm dừng ở tầng đang mở. */
  connectors: Connector[]
  pois: Poi[]
  floorNameById: ReadonlyMap<string, string>
  isolatedNodeIds?: ReadonlySet<string>
  /** Edge nghi xuyên tường (theo ảnh sơ đồ). */
  crossingEdgeIds?: ReadonlySet<string>
  selectedNodeId: string | null
  edgeLength: (edge: GraphEdge) => number
  onSelectNode: (nodeId: string | null) => void
  onDeleteNode: (nodeId: string) => void
  onDeleteEdge: (edgeId: string) => void
  onDeleteCrossingEdges: () => void
  onCreateConnector: () => void
  onSuggestConnectors: () => void
  onUpdateConnector: (connectorId: string, patch: { name?: string; accessible?: boolean }) => void
  onDeleteConnector: (connectorId: string) => void
  /** Chỉ xem: khoá sửa connector. */
  readOnly?: boolean
  onDeletePoi: (poiId: string) => void
  onDeleteAllNodes: () => void
  onDeleteAllPois: () => void
  /** Số POI thang máy/lối ra chưa có node trung chuyển đúng loại. */
  promotablePoiCount: number
  onPromotePois: () => void
}

/** Cột bên phải của canvas: danh sách Node / Edge / Connector / POI của tầng đang mở. */
export function CanvasSidebar({
  nodes,
  edges,
  connectors,
  pois,
  floorNameById,
  isolatedNodeIds,
  crossingEdgeIds,
  selectedNodeId,
  edgeLength,
  onSelectNode,
  onDeleteNode,
  onDeleteEdge,
  onDeleteCrossingEdges,
  onCreateConnector,
  onSuggestConnectors,
  onUpdateConnector,
  onDeleteConnector,
  readOnly = false,
  onDeletePoi,
  onDeleteAllNodes,
  onDeleteAllPois,
  promotablePoiCount,
  onPromotePois,
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
              <>
              <DeleteAllButton
                count={nodes.length}
                label="Node"
                description={`BE không cho xóa node còn gắn POI hoặc connector, nên sẽ xóa luôn ${pois.length} POI và ${connectors.length} connector của tầng này (connector bị xóa khỏi cả các tầng còn lại), cùng mọi edge.`}
                onConfirm={onDeleteAllNodes}
              />
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
              </>
            ),
          },
          {
            key: 'edges',
            label: `Edge (${edges.length})`,
            children: (
              <>
              {crossingEdgeIds && crossingEdgeIds.size > 0 && (
                <Popconfirm
                  title={`Xóa ${crossingEdgeIds.size} edge nghi xuyên tường?`}
                  description="Đây là kiểm tra theo ảnh nên có thể nhầm; xem các đường đỏ nét đứt trên canvas trước."
                  onConfirm={onDeleteCrossingEdges}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger size="small" block icon={<ClearOutlined />} style={{ marginBottom: 8 }}>
                    Xóa {crossingEdgeIds.size} edge xuyên tường
                  </Button>
                </Popconfirm>
              )}
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
                        {crossingEdgeIds?.has(edge.id) && <Tag color="error" style={{ marginLeft: 6 }}>Xuyên tường?</Tag>}
                      </AntText>
                      <AntText type="secondary" style={{ fontSize: 11 }}>
                        Khoảng cách: {Math.round(edgeLength(edge))}px bản đồ
                      </AntText>
                    </Space>
                  </List.Item>
                )}
              />
              </>
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
              <Button size="small" block icon={<ThunderboltOutlined />} style={{ marginBottom: 8 }} onClick={() => onSuggestConnectors()}>
                Gợi ý tự động
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
                        <AntText
                          strong
                          style={{ fontSize: 12 }}
                          editable={
                            readOnly
                              ? false
                              : {
                                  onChange: (value) => {
                                    const name = value.trim()
                                    if (name && name !== connector.name) onUpdateConnector(connector.id, { name })
                                  },
                                }
                          }
                        >
                          {connector.name}
                        </AntText>
                        <Switch
                          size="small"
                          checked={connector.accessible}
                          disabled={readOnly}
                          checkedChildren="Xe lăn"
                          unCheckedChildren="Không"
                          onChange={(accessible) => onUpdateConnector(connector.id, { accessible })}
                        />
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
              <>
              {promotablePoiCount > 0 && (
                <Popconfirm
                  title={`Tạo node cho ${promotablePoiCount} POI thang máy / lối ra?`}
                  description="Mỗi POI được thêm một node cùng loại tại vị trí của nó, nối edge tới node hành lang đang gắn, rồi POI gắn lại vào node mới. Kiểm tra edge đỏ nét đứt nếu đoạn nối cắt tường."
                  onConfirm={onPromotePois}
                  okText="Tạo node"
                  cancelText="Hủy"
                >
                  <Button size="small" block icon={<ApartmentOutlined />} style={{ marginBottom: 8 }}>
                    Nâng {promotablePoiCount} POI thành node
                  </Button>
                </Popconfirm>
              )}
              <DeleteAllButton
                count={pois.length}
                label="POI"
                description="Chỉ xóa POI, Node vẫn giữ nguyên."
                onConfirm={onDeleteAllPois}
              />
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
              </>
            ),
          },
        ]}
      />
    </Card>
  )
}
