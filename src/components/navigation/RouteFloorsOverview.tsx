import { toRouteMapData } from '../../api/graphMapper'
import type { IndoorRoute, PublicFloor, PublicFloorMap, VerticalLinkKind } from '../../types/navigation'
import { floorsOnRoute, splitRouteByFloor } from '../../utils/routeSegments'
import { RouteMap } from './RouteMap'
import './RouteFloorsOverview.css'

const RIDE_LABEL: Record<VerticalLinkKind, { icon: string; text: string }> = {
  ELEVATOR: { icon: '🛗', text: 'thang máy' },
  STAIR: { icon: '🪜', text: 'thang bộ' },
  ESCALATOR: { icon: '↗', text: 'thang cuốn' },
}

type RouteFloorsOverviewProps = {
  route: IndoorRoute
  floors: PublicFloor[]
  mapsByFloorId: Record<string, PublicFloorMap>
  activeStepIndex: number
  destinationName?: string
  onJump: (stepIndex: number) => void
}

/**
 * Hành trình qua nhiều tầng trên một màn hình: tầng nào đi bộ bao nhiêu mét, lên thang nào, ra ở tầng nào.
 * Bấm vào một đoạn để nhảy tới bước đầu tiên của đoạn đó trên bản đồ chính. Chỉ hiện khi tuyến qua ≥ 2 tầng.
 */
export function RouteFloorsOverview({ route, floors, mapsByFloorId, activeStepIndex, destinationName, onJump }: RouteFloorsOverviewProps) {
  if (floorsOnRoute(route.steps).length < 2) return null
  const floorNameById = Object.fromEntries(floors.map((floor) => [floor.id, `Tầng ${floor.floorNumber}`]))
  const nameOf = (floorId: string) => floorNameById[floorId] ?? 'tầng khác'
  const segments = splitRouteByFloor(route.steps)

  return (
    <section className="route-floors" aria-label="Hành trình qua các tầng">
      <header className="route-floors__header">
        <strong>Hành trình qua {floorsOnRoute(route.steps).length} tầng</strong>
        <span>Bấm vào từng đoạn để xem trên bản đồ</span>
      </header>
      <ol className="route-floors__list">
        {segments.map((segment) => {
          const isActive = activeStepIndex >= segment.firstIndex && activeStepIndex <= segment.lastIndex
          if (segment.type === 'ride') {
            const ride = RIDE_LABEL[segment.kind]
            return (
              <li key={`ride-${segment.firstIndex}`}>
                <button type="button" className={`route-floors__ride${isActive ? ' is-active' : ''}`} onClick={() => onJump(segment.firstIndex)}>
                  <span className="route-floors__ride-icon">{ride.icon}</span>
                  <span>
                    Đi <b>{ride.text}</b> từ <b>{nameOf(segment.fromFloorId)}</b> lên <b>{nameOf(segment.toFloorId)}</b>
                    {segment.viaFloorIds.length > 0 && ` (đi ngang ${segment.viaFloorIds.map(nameOf).join(', ')})`}
                    {segment.waitSeconds > 0 && ` · chờ ~${Math.round(segment.waitSeconds)} s`}
                  </span>
                </button>
              </li>
            )
          }
          const map = mapsByFloorId[segment.floorId]
          return (
            <li key={`walk-${segment.firstIndex}`}>
              <button type="button" className={`route-floors__walk${isActive ? ' is-active' : ''}`} onClick={() => onJump(segment.firstIndex)}>
                <div className="route-floors__walk-head">
                  <strong>{nameOf(segment.floorId)}</strong>
                  {segment.isStart && <span className="route-floors__tag route-floors__tag--start">Xuất phát</span>}
                  {segment.isEnd && <span className="route-floors__tag route-floors__tag--end">Đích đến</span>}
                  <span className="route-floors__distance">đi bộ ~{Math.round(segment.distanceMeters)} m</span>
                </div>
                <div className="route-floors__map">
                  {map && (
                    <RouteMap
                      map={toRouteMapData(map)}
                      routeSteps={route.steps}
                      destinationName={destinationName}
                      floorNameById={floorNameById}
                      compact
                      onSelectNode={() => undefined}
                    />
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
