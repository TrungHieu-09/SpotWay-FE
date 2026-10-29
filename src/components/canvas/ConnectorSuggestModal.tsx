import { useState } from 'react'
import { Checkbox, Empty, List, message, Modal, Spin, Tag, Typography } from 'antd'
import { graphGateway } from '../../api/graphGateway'
import type { Floor } from '../../types/floor'
import type { Connector, NewConnector } from '../../types/graph'
import { suggestConnectors, type ConnectorSuggestion } from '../../utils/graphSuggestions'
import { CONNECTOR_STYLE } from './ConnectorsLayer'

type ConnectorSuggestModalProps = {
  open: boolean
  floors: readonly Floor[]
  /** Connector đã có của toà nhà; node thuộc chúng không được gợi ý lại. */
  connectors: readonly Connector[]
  onCreate: (input: NewConnector) => Promise<boolean>
  onClose: () => void
}

/** Quét node thang của mọi tầng, gợi ý connector cho các trục cùng vị trí; người dùng chọn rồi tạo hàng loạt. */
export function ConnectorSuggestModal({ open, floors, connectors, onCreate, onClose }: ConnectorSuggestModalProps) {
  const [suggestions, setSuggestions] = useState<ConnectorSuggestion[]>()
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)
  const floorName = new Map(floors.map((floor) => [floor.id, floor.name]))

  async function scan() {
    setSuggestions(undefined)
    try {
      const graphs = await Promise.all(
        floors.map(async (floor) => ({
          floorId: floor.id,
          level: floor.level,
          nodes: (await graphGateway.fetchGraph(floor.id, { width: floor.mapWidth, height: floor.mapHeight })).nodes,
        })),
      )
      const linked = new Set(connectors.flatMap((connector) => connector.stops.map((stop) => stop.nodeId)))
      const found = suggestConnectors(graphs, linked)
      setSuggestions(found)
      setChecked(new Set(found.map((_, index) => index)))
    } catch (reason) {
      message.error(`Không thể quét node các tầng: ${(reason as Error).message}`)
      setSuggestions([])
    }
  }

  async function handleOk() {
    if (!suggestions) return
    setCreating(true)
    let created = 0
    for (const [index, suggestion] of suggestions.entries()) {
      if (!checked.has(index)) continue
      if (await onCreate({ kind: suggestion.kind, name: suggestion.name, accessible: true, stops: suggestion.stops })) created += 1
    }
    setCreating(false)
    if (created > 0) message.success(`Đã tạo ${created} connector.`)
    onClose()
  }

  return (
    <Modal
      title="Gợi ý connector tự động"
      open={open}
      okText={`Tạo ${checked.size} connector`}
      cancelText="Đóng"
      okButtonProps={{ disabled: checked.size === 0 }}
      confirmLoading={creating}
      onOk={() => void handleOk()}
      onCancel={onClose}
      afterOpenChange={(isOpen) => isOpen && void scan()}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Ghép thang máy/cầu thang/thang cuốn cùng loại và cùng vị trí giữa các tầng. Hãy đặt node thang ở cùng chỗ trên mỗi tầng trước.
      </Typography.Paragraph>
      {!suggestions ? (
        <Spin style={{ display: 'block', padding: 24 }} />
      ) : suggestions.length === 0 ? (
        <Empty description="Không tìm thấy trục thang nào chưa có connector" />
      ) : (
        <List
          size="small"
          dataSource={suggestions}
          renderItem={(suggestion, index) => (
            <List.Item>
              <Checkbox
                checked={checked.has(index)}
                onChange={(event) =>
                  setChecked((current) => {
                    const next = new Set(current)
                    if (event.target.checked) next.add(index)
                    else next.delete(index)
                    return next
                  })
                }
              >
                <Tag color={CONNECTOR_STYLE[suggestion.kind].color}>{CONNECTOR_STYLE[suggestion.kind].label}</Tag>
                <strong>{suggestion.name}</strong>
                <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {suggestion.stops.map((stop) => floorName.get(stop.floorId) ?? '?').join(' ↔ ')}
                </Typography.Text>
              </Checkbox>
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
