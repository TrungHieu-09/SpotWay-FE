import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Empty, Input, List, Popconfirm, Space, Switch, Tag, Typography } from 'antd'
import { BellOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { useGraphStore } from '../../store/useGraphStore'
import { useLoadFloorData } from '../../hooks/useLoadFloorData'
import { AppSelect as Select } from '../../components/ui/AppSelect'
import {
  clearOperations,
  getHelpRequests,
  getOperations,
  updateOperations,
  type HelpRequest,
  type OperationsPatch,
  type OperationsState,
} from '../../api/operations'
import type { GraphNode } from '../../types/graph'

const { Text } = Typography
const NO_NODES: GraphNode[] = []

const HELP_LABEL: Record<string, string> = {
  LOST: 'Bị lạc',
  WHEELCHAIR: 'Cần hỗ trợ xe lăn',
  SMOKE: 'Thấy khói / nghi cháy',
  OTHER: 'Cần giúp đỡ',
}

type OperationsPanelProps = { buildingId: string; readOnly?: boolean }

/**
 * Trung tâm điều hành của MỘT tòa: thang máy hỏng, cúp điện, đóng khu vực, thông báo cho khách và các yêu cầu hỗ trợ.
 * Điện thoại của khách đang ở tòa này nhận thay đổi sau vài giây; tòa khác không bị ảnh hưởng.
 */
export function OperationsPanel({ buildingId, readOnly = false }: OperationsPanelProps) {
  const floor = useFloorStore((state) => state.selectedFloor)
  const nodes: GraphNode[] = useGraphStore((state) => (floor ? state.nodesByFloor[floor.id] : undefined)) ?? NO_NODES
  useLoadFloorData(floor ? [floor] : [])
  const [state, setState] = useState<OperationsState | null>(null)
  const [help, setHelp] = useState<HelpRequest[]>([])
  const [zoneNodeId, setZoneNodeId] = useState<string>()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const { message } = AntApp.useApp()

  const refresh = useCallback(async () => {
    try {
      const [ops, requests] = await Promise.all([getOperations(buildingId), getHelpRequests(buildingId).catch(() => [])])
      setState(ops)
      setHelp(requests)
    } catch (error) {
      message.error((error as Error).message)
    }
  }, [buildingId, message])

  useEffect(() => {
    setState(null)
    setHelp([])
    setZoneNodeId(undefined)
    setNotice('')
    void refresh()
    const timer = setInterval(() => void refresh(), 10_000)
    return () => clearInterval(timer)
  }, [refresh])

  const nodeOptions = useMemo(
    () => nodes.map((node) => ({ value: node.id, label: node.name?.trim() || `${node.type} · ${node.id.slice(0, 6)}` })),
    [nodes],
  )

  async function apply(patch: OperationsPatch, done: string) {
    setBusy(true)
    try {
      setState(await updateOperations(buildingId, patch))
      message.success(done)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function endAll() {
    setBusy(true)
    try {
      setState(await clearOperations(buildingId))
      message.success('Đã đưa tòa nhà về trạng thái bình thường')
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const anything = Boolean(state && (state.elevator || state.power || state.zone || state.announcement))
  const disabled = readOnly || busy || !state

  return (
    <Space direction="vertical" size={16} className="full-width">
      <Card
        className="tool-card"
        title={<Space><ThunderboltOutlined />Điều hành tòa nhà</Space>}
        extra={
          <Popconfirm title="Kết thúc mọi đóng cửa và gỡ thông báo?" okText="Kết thúc" cancelText="Hủy" onConfirm={() => void endAll()} disabled={!anything || readOnly}>
            <Button disabled={!anything || readOnly || busy}>Đưa về bình thường</Button>
          </Popconfirm>
        }
      >
        <Alert
          type={anything ? 'warning' : 'success'}
          showIcon
          style={{ marginBottom: 16 }}
          message={anything ? 'Đang có thay đổi hiển thị với khách của tòa này' : 'Tòa nhà đang hoạt động bình thường'}
          description="Khách đang dùng ứng dụng ở tòa này sẽ nhận thay đổi sau vài giây và tuyến đường tự tránh khu vực bị đóng."
        />
        <List itemLayout="horizontal">
          <List.Item actions={[<Switch key="e" checked={Boolean(state?.elevator)} disabled={disabled} onChange={(checked) => void apply({ elevator: checked }, checked ? 'Đã báo thang máy ngừng hoạt động' : 'Thang máy hoạt động lại')} />]}>
            <List.Item.Meta title="Thang máy ngừng hoạt động" description="Khách đi bộ thang thường; chế độ xe lăn sẽ báo không có đường nếu cần lên tầng." />
          </List.Item>
          <List.Item actions={[<Switch key="p" checked={Boolean(state?.power)} disabled={disabled} onChange={(checked) => void apply({ power: checked }, checked ? 'Đã báo cúp điện' : 'Đã có điện trở lại')} />]}>
            <List.Item.Meta title="Cúp điện" description="Thang máy và thang cuốn dừng; chỉ còn thang bộ nối các tầng." />
          </List.Item>
        </List>
        <div style={{ marginTop: 12 }}>
          <Text strong>Đóng một khu vực (bán kính 12 m quanh vị trí chọn)</Text>
          {state?.zone ? (
            <div style={{ marginTop: 8 }}>
              <Tag color="red">Đang đóng: {state.zone.name}</Tag>
              <Button size="small" disabled={disabled} onClick={() => void apply({ zoneNodeId: null }, 'Đã mở lại khu vực')}>Mở lại</Button>
            </div>
          ) : (
            <Space wrap style={{ marginTop: 8 }}>
              <Select
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 260 }}
                placeholder={floor ? `Chọn vị trí trên ${floor.name}` : 'Chọn tầng ở thanh trên'}
                value={zoneNodeId}
                onChange={setZoneNodeId}
                options={nodeOptions}
                disabled={disabled || !floor}
              />
              <Button
                danger
                disabled={disabled || !zoneNodeId}
                onClick={() => {
                  const label = nodeOptions.find((option) => option.value === zoneNodeId)?.label
                  void apply({ zoneNodeId, zoneName: label }, 'Đã đóng khu vực').then(() => setZoneNodeId(undefined))
                }}
              >
                Đóng khu vực
              </Button>
            </Space>
          )}
        </div>
      </Card>

      <Card className="tool-card" title={<Space><BellOutlined />Thông báo cho khách</Space>}>
        {state?.announcement ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={state.announcement.text}
            action={<Button size="small" disabled={disabled} onClick={() => void apply({ announcement: null }, 'Đã gỡ thông báo')}>Gỡ</Button>}
          />
        ) : null}
        <Space.Compact className="full-width">
          <Input
            value={notice}
            maxLength={300}
            placeholder="Ví dụ: Khu ẩm thực tầng 2 đóng cửa lúc 22:00"
            disabled={disabled}
            onChange={(event) => setNotice(event.target.value)}
            onPressEnter={() => notice.trim() && void apply({ announcement: notice }, 'Đã gửi thông báo').then(() => setNotice(''))}
          />
          <Button type="primary" disabled={disabled || !notice.trim()} onClick={() => void apply({ announcement: notice }, 'Đã gửi thông báo').then(() => setNotice(''))}>
            Gửi tới khách
          </Button>
        </Space.Compact>
      </Card>

      <Card className="tool-card" title="Yêu cầu hỗ trợ từ khách (30 phút gần nhất)">
        {help.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có yêu cầu nào" />
        ) : (
          <List
            dataSource={help}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Space><Tag color={item.kind === 'SMOKE' ? 'red' : 'blue'}>{HELP_LABEL[item.kind] ?? 'Cần giúp đỡ'}</Tag>{item.place ?? 'Chưa rõ vị trí'}</Space>}
                  description={new Date(item.at).toLocaleTimeString('vi-VN')}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  )
}
