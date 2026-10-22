import { Alert, Button, Card, Space, Tag, Typography } from 'antd'
import { useNavigationStore, type DemoScenarioId } from '../../store/useNavigationStore'

type DemoSimulationToolbarProps = {
  /** Node người dùng đang đứng (bước hiện tại của tuyến), dùng làm điểm xuất phát khi báo cháy */
  currentNodeId?: string
}

const SCENARIOS: Array<{ id: DemoScenarioId; label: string; danger?: boolean; hint: string }> = [
  { id: 'demo-same-floor', label: '🟢 1. Cùng tầng', hint: 'Cửa chính T1 → Quán Cafe T1' },
  { id: 'demo-multi-floor', label: '🔵 2. Lên Tầng 3 (Thang máy)', hint: 'Cửa chính T1 → Rạp phim T3' },
  { id: 'demo-wheelchair', label: '♿ 3. Xe lăn (Accessible)', hint: 'Xuyên tầng, cấm thang bộ/thang cuốn' },
  { id: 'demo-fire-alarm', label: '🚨 4. Báo động hỏa hoạn', danger: true, hint: 'Cấm thang máy, dẫn ra lối thoát gần nhất' },
  { id: 'demo-fire-blocked-exit', label: '🔥 5. Lửa chặn Cửa thoát 1', danger: true, hint: 'Tái định tuyến sang lối thoát an toàn khác' },
  { id: 'demo-reset', label: '🔄 6. Reset trạng thái', hint: 'Tắt báo động, dập lửa mô phỏng' },
]

export function DemoSimulationToolbar({ currentNodeId }: DemoSimulationToolbarProps) {
  const emergencyMode = useNavigationStore((state) => state.emergencyMode)
  const activeFireNodeIds = useNavigationStore((state) => state.activeFireNodeIds)
  const isDemoRunning = useNavigationStore((state) => state.isDemoRunning)
  const activeScenarioId = useNavigationStore((state) => state.activeScenarioId)
  const simulationMessage = useNavigationStore((state) => state.simulationMessage)
  const runDemoScenario = useNavigationStore((state) => state.runDemoScenario)

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space wrap align="center">
          <Typography.Text strong>Kịch bản demo 1-chạm</Typography.Text>
          {emergencyMode === 'FIRE' ? (
            <Tag color="red">CHẾ ĐỘ HỎA HOẠN · {activeFireNodeIds.length} điểm cháy</Tag>
          ) : (
            <Tag color="green">Hoạt động bình thường</Tag>
          )}
        </Space>
        <Space wrap>
          {SCENARIOS.map((scenario) => (
            <Button
              key={scenario.id}
              title={scenario.hint}
              danger={scenario.danger}
              type={activeScenarioId === scenario.id ? 'primary' : 'default'}
              loading={isDemoRunning && activeScenarioId === scenario.id}
              disabled={isDemoRunning && activeScenarioId !== scenario.id}
              onClick={() => void runDemoScenario(scenario.id, currentNodeId)}
            >
              {scenario.label}
            </Button>
          ))}
        </Space>
        {simulationMessage && (
          <Alert type={emergencyMode === 'FIRE' ? 'error' : 'info'} showIcon message={simulationMessage} />
        )}
      </Space>
    </Card>
  )
}
