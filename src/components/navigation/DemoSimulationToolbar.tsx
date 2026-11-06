import { Alert, Button, Card, Space, Switch, Tabs, Tag, Typography } from 'antd'
import { useNavigationStore, type DemoScenarioId, type FireScenarioId, type HappyScenarioId } from '../../store/useNavigationStore'

type Props = { currentNodeId?: string; startNodeId?: string }
type Scenario<T extends DemoScenarioId> = { id: T; label: string; hint: string }

const happy: Scenario<HappyScenarioId>[] = [
  { id: 'same-floor-shortest', label: 'H1. Cùng tầng ngắn nhất', hint: 'Điểm đến cùng tầng' },
  { id: 'same-floor-turns', label: 'H2. Nhiều ngã rẽ', hint: 'Turn-by-turn' },
  { id: 'elevator-wait', label: 'H3. Thang máy', hint: 'Chuyển tầng' },
  { id: 'stairs', label: 'H4. Thang bộ', hint: 'Chuyển tầng' },
  { id: 'escalator-up', label: 'H5. Thang cuốn lên', hint: 'Một chiều' },
  { id: 'escalator-reverse', label: 'H6. Thang cuốn ngược', hint: 'Không đi ngược chiều' },
  { id: 'wheelchair', label: 'H7. Xe lăn', hint: 'Chỉ lối tiếp cận được' },
  { id: 'nearest-restroom', label: 'H8. WC gần nhất', hint: 'Theo đồ thị' },
  { id: 'nearest-atm', label: 'H9. ATM gần nhất', hint: 'Theo đồ thị' },
  { id: 'nearest-info', label: 'H10. Quầy Info', hint: 'Theo đồ thị' },
]
const fire: Scenario<FireScenarioId>[] = [
  { id: 'fire-ground-main-exit', label: 'F1. Cháy tầng 1', hint: 'Thoát hiểm' },
  { id: 'fire-middle-floor', label: 'F2. Cháy tầng giữa', hint: 'Cấm thang máy' },
  { id: 'fire-at-destination', label: 'F3. Cháy tại đích', hint: 'Huỷ điểm đến' },
  { id: 'fire-exit-1', label: 'F4. Chặn Cửa 1', hint: 'Reroute Cửa 2' },
  { id: 'fire-exits-1-2', label: 'F5. Chặn Cửa 1 & 2', hint: 'Reroute Cửa 3' },
  { id: 'interactive-fire', label: 'F6. Đặt lửa tương tác', hint: 'Chạm node trên bản đồ' },
]

export function DemoSimulationToolbar({ currentNodeId, startNodeId }: Props) {
  const state = useNavigationStore()
  const buttons = <T extends DemoScenarioId>(items: Scenario<T>[], danger = false) => (
    <Space wrap>{items.map((item) => <Button key={item.id} title={item.hint} danger={danger} type={state.activeScenarioId === item.id ? 'primary' : 'default'} loading={state.isDemoRunning && state.activeScenarioId === item.id} disabled={state.isDemoRunning && state.activeScenarioId !== item.id} onClick={() => void state.runDemoScenario(item.id, startNodeId)}>{item.label}</Button>)}</Space>
  )
  return <Card size="small" style={{ marginBottom: 16 }}>
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Space wrap><Typography.Text strong>Kịch bản kiểm thử 1-chạm</Typography.Text><Tag color={state.emergencyMode === 'FIRE' ? 'red' : 'green'}>{state.emergencyMode === 'FIRE' ? `HỎA HOẠN · ${state.activeFireNodeIds.length} điểm cháy` : 'Bình thường'}</Tag><Button size="small" onClick={state.resetSimulation}>Reset</Button></Space>
      <Tabs size="small" items={[{ key: 'happy', label: '🟢 Happy Cases', children: buttons(happy) }, { key: 'fire', label: '🚨 Hỏa hoạn', children: <Space direction="vertical"><Space wrap>{buttons(fire, true)}<Switch checked={state.interactiveFireMode} onChange={(value) => state.setInteractiveFireMode(value, currentNodeId)} />🔥 Đặt lửa tương tác<Button danger disabled={!state.activeFireNodeIds.length} onClick={state.extinguishAllFires}>🧯 Dập tất cả</Button></Space>{state.interactiveFireMode && <Typography.Text type="secondary">Chạm node trên bản đồ để đốt/dập lửa. Tuyến thoát hiểm sẽ tự cập nhật.</Typography.Text>}</Space> }]}/>
      {state.simulationMessage && <Alert showIcon type={state.emergencyMode === 'FIRE' ? 'error' : 'info'} message={state.simulationMessage} />}
    </Space>
  </Card>
}
