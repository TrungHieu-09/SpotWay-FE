import { Button, Card, Space, Tag, Typography } from 'antd'
import type { IndoorRoute, PublicFloor, VerticalLinkKind } from '../../types/navigation'
import { floorsOnRoute, splitRouteByFloor } from '../../utils/routeSegments'

const RIDE_LABEL: Record<VerticalLinkKind, string> = {
  ELEVATOR: 'thang máy',
  STAIR: 'thang bộ',
  ESCALATOR: 'thang cuốn',
}

type RouteFloorsOverviewProps = {
  route: IndoorRoute
  floors: PublicFloor[]
  activeStepIndex: number
  onJump: (stepIndex: number) => void
}

/** Hành trình nhiều tầng: tầng nào đi bao nhiêu mét, đi thang nào. Chỉ hiện khi tuyến qua ≥ 2 tầng. */
export function RouteFloorsOverview({ route, floors, activeStepIndex, onJump }: RouteFloorsOverviewProps) {
  const floorCount = floorsOnRoute(route.steps).length
  if (floorCount < 2) return null
  const nameOf = (floorId: string) => {
    const floor = floors.find((item) => item.id === floorId)
    return floor ? `Tầng ${floor.floorNumber}` : 'tầng khác'
  }

  return (
    <Card size="small" title={`Hành trình qua ${floorCount} tầng`} style={{ marginBottom: 16 }}>
      <Space orientation="vertical" style={{ width: '100%' }} size={6}>
        {splitRouteByFloor(route.steps).map((segment) => {
          const isActive = activeStepIndex >= segment.firstIndex && activeStepIndex <= segment.lastIndex
          return (
            <Button
              key={`${segment.type}-${segment.firstIndex}`}
              block
              type={isActive ? 'primary' : 'default'}
              style={{ height: 'auto', textAlign: 'left', whiteSpace: 'normal', padding: '6px 12px' }}
              onClick={() => onJump(segment.firstIndex)}
            >
              {segment.type === 'ride' ? (
                <Typography.Text style={{ color: 'inherit' }}>
                  <Tag color="gold">Chuyển tầng</Tag>
                  Đi {RIDE_LABEL[segment.kind]} từ {nameOf(segment.fromFloorId)} đến {nameOf(segment.toFloorId)}
                  {segment.waitSeconds > 0 && ` · chờ ~${Math.round(segment.waitSeconds)} s`}
                </Typography.Text>
              ) : (
                <Typography.Text style={{ color: 'inherit' }}>
                  <Tag color="blue">{nameOf(segment.floorId)}</Tag>
                  Đi bộ ~{Math.round(segment.distanceMeters)} m
                </Typography.Text>
              )}
            </Button>
          )
        })}
      </Space>
    </Card>
  )
}
