import { useCallback, useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Input, Popconfirm, Space, Typography } from 'antd'
import { FireOutlined } from '@ant-design/icons'
import { clearIncident, getIncident, startIncident, type IncidentState } from '../../api/incidents'
import type { GraphNode } from '../../types/graph'
import { AppSelect as Select } from '../../components/ui/AppSelect'

const { Text } = Typography

type FireAlarmCardProps = {
  buildingId: string
  nodes: readonly GraphNode[]
  nodeName: (id: string) => string
  canEdit: boolean
}

/** Báo cháy: điện thoại khách chuyển sang chế độ sơ tán và tuyến đường tránh các node này. */
export function FireAlarmCard({ buildingId, nodes, nodeName, canEdit }: FireAlarmCardProps) {
  const [incident, setIncident] = useState<IncidentState>({ active: false })
  const [pickedNodeIds, setPickedNodeIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const { message } = AntApp.useApp()

  const refresh = useCallback(async () => {
    try {
      setIncident(await getIncident(buildingId))
    } catch (error) {
      message.error((error as Error).message)
    }
  }, [buildingId, message])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // While an alarm is on, keep the evacuee count fresh.
  const active = incident.active
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => void refresh(), 5000)
    return () => clearInterval(timer)
  }, [active, refresh])

  async function run(action: () => Promise<IncidentState>, success: string) {
    setBusy(true)
    try {
      setIncident(await action())
      message.success(success)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const options = nodes.map((node) => ({ value: node.id, label: nodeName(node.id) }))

  if (incident.active) {
    return (
      <Alert
        type="error"
        showIcon
        icon={<FireOutlined />}
        style={{ marginBottom: 12 }}
        message="Đang có báo cháy"
        description={
          <Space orientation="vertical" size={6}>
            <Text>{incident.nodeIds.length} điểm đang cháy. Điện thoại khách đang được chỉ lối thoát.</Text>
            <Text strong>{incident.evacuees ?? 0} người đang di chuyển tới lối thoát</Text>
            {canEdit && (
              <Button danger loading={busy} onClick={() => void run(() => clearIncident(buildingId), 'Đã kết thúc sự cố.')}>
                Kết thúc sự cố
              </Button>
            )}
          </Space>
        }
      />
    )
  }

  if (!canEdit) return null
  return (
    <Alert
      type="warning"
      showIcon
      icon={<FireOutlined />}
      style={{ marginBottom: 12 }}
      message="Báo cháy"
      description={
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Text>Chọn điểm đang cháy. Điện thoại của khách sẽ báo động và chỉ lối thoát gần nhất.</Text>
          <Select mode="multiple" value={pickedNodeIds} onChange={setPickedNodeIds} options={options} placeholder="Chọn node đang cháy" style={{ width: '100%' }} />
          <Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Nội dung cảnh báo (không bắt buộc)" />
          <Popconfirm
            title="Phát báo cháy tới điện thoại khách?"
            okText="Báo cháy"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={pickedNodeIds.length === 0}
            onConfirm={() => void run(() => startIncident(buildingId, pickedNodeIds, note), 'Đã phát báo cháy.')}
          >
            <Button danger type="primary" icon={<FireOutlined />} loading={busy} disabled={pickedNodeIds.length === 0}>
              Phát báo cháy
            </Button>
          </Popconfirm>
        </Space>
      }
    />
  )
}
