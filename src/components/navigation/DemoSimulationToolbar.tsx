import { Alert, Button, Card, Space, Switch, Tabs, Tag, Typography } from 'antd'
import {
  useNavigationStore,
  type DemoScenarioId,
  type FireScenarioId,
  type HappyScenarioId,
} from '../../store/useNavigationStore'

type DemoSimulationToolbarProps = {
  /** Node người dùng đang đứng (bước hiện tại của tuyến), dùng làm điểm tái định tuyến khi đặt lửa */
  currentNodeId?: string
}

type ScenarioButton<T extends DemoScenarioId> = { id: T; label: string; hint: string }

const HAPPY_SCENARIOS: ScenarioButton<HappyScenarioId>[] = [
  { id: 'same-floor-shortest', label: 'H1. Cùng tầng — ngắn nhất', hint: 'Điểm đến gần nhất cùng tầng theo chi phí đồ thị' },
  { id: 'same-floor-turns', label: 'H2. Cùng tầng — nhiều ngã rẽ', hint: 'Turn-by-turn: đi thẳng, chếch, rẽ, quay đầu kèm số mét' },
  { id: 'elevator-wait', label: 'H3. Thang máy + thời gian chờ', hint: 'Chỉ dùng thang máy, hiển thị wait time' },
  { id: 'stairs', label: 'H4. Thang bộ', hint: 'Chỉ dùng thang bộ' },
  { id: 'escalator-up', label: 'H5. Thang cuốn lên', hint: 'Thang cuốn một chiều đi lên' },
  { id: 'escalator-reverse', label: 'H6. Thang cuốn ngược chiều', hint: 'Đi xuống không được dùng thang cuốn chiều lên' },
  { id: 'wheelchair', label: 'H7. Xe lăn', hint: 'Loại thang bộ, thang cuốn, lối đi không tiếp cận được' },
  { id: 'nearest-restroom', label: 'H8. WC gần nhất', hint: 'Nhà vệ sinh gần nhất theo chi phí đồ thị' },
  { id: 'nearest-atm', label: 'H9. ATM gần nhất', hint: 'ATM gần nhất theo chi phí đồ thị' },
  { id: 'nearest-info', label: 'H10. Quầy thông tin gần nhất', hint: 'Quầy Info gần nhất theo chi phí đồ thị' },
]

const FIRE_SCENARIOS: ScenarioButton<FireScenarioId>[] = [
  { id: 'fire-ground-main-exit', label: 'F1. Cháy tầng 1 gần cửa chính', hint: 'Né vùng cháy, chọn cửa thoát phía sau' },
  { id: 'fire-middle-floor', label: 'F2. Cháy tầng 2 (tầng giữa)', hint: 'Cấm thang máy, đi thang bộ thoát hiểm' },
  { id: 'fire-at-destination', label: 'F3. Cháy tại điểm đến', hint: 'Huỷ điểm đến, cảnh báo đỏ, chuyển sang thoát hiểm' },
  { id: 'fire-exit-1', label: 'F4. Lửa chặn Cửa 1 → Cửa 2', hint: 'Dynamic reroute sang lối thoát thứ 2' },
  { id: 'fire-exits-1-2', label: 'F5. Lửa chặn Cửa 1 & 2 → Cửa 3', hint: 'Dynamic reroute sang lối thoát thứ 3' },
  { id: 'interactive-fire', label: 'F6. Đặt lửa tương tác', hint: 'Chạm node trên bản đồ để đốt/dập, tuyến tự cập nhật' },
]

export function DemoSimulationToolbar({ currentNodeId }: DemoSimulationToolbarProps) {
  const emergencyMode = useNavigationStore((state) => state.emergencyMode)
  const activeFireNodeIds = useNavigationStore((state) => state.activeFireNodeIds)
  const isDemoRunning = useNavigationStore((state) => state.isDemoRunning)
  const activeScenarioId = useNavigationStore((state) => state.activeScenarioId)
  const simulationMessage = useNavigationStore((state) => state.simulationMessage)
  const routeWarning = useNavigationStore((state) => state.routeWarning)
  const routeTargetName = useNavigationStore((state) => state.routeTargetName)
  const route = useNavigationStore((state) => state.route)
  const interactiveFireMode = useNavigationStore((state) => state.interactiveFireMode)
  const runDemoScenario = useNavigationStore((state) => state.runDemoScenario)
  const setInteractiveFireMode = useNavigationStore((state) => state.setInteractiveFireMode)
  const extinguishAllFires = useNavigationStore((state) => state.extinguishAllFires)

  const renderButtons = <T extends DemoScenarioId>(items: ScenarioButton<T>[], danger = false) => (
    <Space wrap>
      {items.map((scenario) => (
        <Button
          key={scenario.id}
          title={scenario.hint}
          danger={danger}
          type={activeScenarioId === scenario.id ? 'primary' : 'default'}
          loading={isDemoRunning && activeScenarioId === scenario.id}
          disabled={isDemoRunning && activeScenarioId !== scenario.id}
          onClick={() => void runDemoScenario(scenario.id)}
        >
          {scenario.label}
        </Button>
      ))}
    </Space>
  )

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
          <Button size="small" disabled={isDemoRunning} onClick={() => void runDemoScenario('reset')}>
            🔄 Reset trạng thái
          </Button>
        </Space>

        <Tabs
          size="small"
          defaultActiveKey="happy"
          items={[
            { key: 'happy', label: '🟢 Happy Cases thường', children: renderButtons(HAPPY_SCENARIOS) },
            {
              key: 'fire',
              label: '🚨 Kịch bản hỏa hoạn',
              children: (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {renderButtons(FIRE_SCENARIOS, true)}
                  <Space wrap align="center">
                    <Switch
                      checked={interactiveFireMode}
                      onChange={(checked) => setInteractiveFireMode(checked, currentNodeId)}
                    />
                    <Typography.Text>🔥 Chế độ đặt lửa tương tác</Typography.Text>
                    <Button danger disabled={activeFireNodeIds.length === 0} onClick={extinguishAllFires}>
                      🧯 Dập tắt tất cả lửa
                    </Button>
                  </Space>
                  {interactiveFireMode && (
                    <Typography.Text type="secondary">
                      Chạm vào node bất kỳ trên bản đồ để đốt, chạm lại để dập — tuyến thoát hiểm tự tính lại ngay.
                    </Typography.Text>
                  )}
                </Space>
              ),
            },
          ]}
        />

        {routeWarning && (
          <Alert
            type={routeWarning.severity === 'CRITICAL' ? 'error' : 'warning'}
            showIcon
            message={
              <Space wrap>
                <Typography.Text strong>{routeWarning.code}</Typography.Text>
                {routeWarning.destinationCancelled && <Tag color="red">Destination cancelled</Tag>}
              </Space>
            }
            description={
              <>
                {routeWarning.message}
                {routeWarning.requestedDestinationName && <div>Điểm đến bị huỷ: {routeWarning.requestedDestinationName}</div>}
                {route && routeTargetName && <div>Lối thoát được chọn: <b>{routeTargetName}</b></div>}
              </>
            }
          />
        )}
        {simulationMessage && (
          <Alert type={emergencyMode === 'FIRE' ? 'error' : 'info'} showIcon message={simulationMessage} />
        )}
        {route?.instructions && (
          <Typography.Text type="secondary">
            Tổng {Math.round(route.totalDistance)} m · đi bộ {route.walkingDurationSeconds ?? 0} s · chuyển tầng{' '}
            {route.transitionDurationSeconds ?? 0} s · tổng {route.estimatedDurationSeconds} s
          </Typography.Text>
        )}
      </Space>
    </Card>
  )
}
