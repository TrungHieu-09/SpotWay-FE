import { findRouteWithHazardPolicy, type RouteTarget } from '../utils/indoorPathfinding'
import { allNodesOf, calibrationOf, floorLevelsOf, floorNamesOf, nodesWithPoiExits } from '../utils/navigationHelpers'
import type { NavigationState, RouteRequest, RouteWarning } from './useNavigationStore'

type SetState = (partial: Partial<NavigationState>) => void
type GetState = () => NavigationState

export function createRouteEngine(set: SetState, get: GetState) {
  const exitName = (nodeId: string | undefined) => {
    const node = allNodesOf(get().mapsByFloorId).find((item) => item.id === nodeId)
    return node?.name ?? (node?.type === 'EMERGENCY_EXIT' ? 'Cửa thoát hiểm' : 'Lối ra')
  }
  const applyRoute = (startNodeId: string, target: RouteTarget, request: RouteRequest = {}) => {
    const state = get(); const maps = Object.values(state.mapsByFloorId)
    const outcome = findRouteWithHazardPolicy(startNodeId, target, nodesWithPoiExits(state.mapsByFloorId), maps.flatMap((map) => map.edges), state.verticalLinks, {
      wheelchairMode: request.wheelchairMode, emergencyMode: state.emergencyMode, blockedNodeIds: new Set(state.activeFireNodeIds), blockedEdgeIds: new Set(state.blockedEdgeIds), allowedTransitions: request.allowedTransitions, floorLevels: floorLevelsOf(state.floors), floorNames: floorNamesOf(state.floors), mapUnitsPerMeter: calibrationOf(state.floors, 'mapUnitsPerMeter'), northOffsetDegrees: calibrationOf(state.floors, 'northOffsetDegrees'),
    })
    const messages: Record<string, RouteWarning> = {
      SOURCE_IN_HAZARD: { code: 'SOURCE_IN_HAZARD', severity: 'CRITICAL', message: 'Vị trí hiện tại nằm trong vùng cháy — không thể tính tuyến an toàn.' },
      NO_SAFE_EXIT_FOUND: { code: 'NO_SAFE_EXIT_FOUND', severity: 'CRITICAL', message: 'Không còn lối thoát hiểm an toàn. Di chuyển tới khu vực lánh nạn và gọi 114.' },
      DESTINATION_IN_HAZARD: { code: 'DESTINATION_IN_HAZARD', severity: 'CRITICAL', message: 'Điểm đến đang nằm trong vùng cháy. Đã chuyển sang lộ trình thoát hiểm.', destinationCancelled: true, requestedDestinationName: request.targetName },
    }
    const warning = outcome.warningCode ? messages[outcome.warningCode] : undefined
    if (!outcome.route) { set({ route: undefined, routeWarning: warning, error: outcome.effectiveMode === 'NORMAL' ? 'Không tìm thấy tuyến đường phù hợp.' : undefined }); return undefined }
    const last = outcome.route.nodeIds.at(-1)
    set({ route: outcome.route, routeSource: 'offline', routeWarning: warning, error: undefined, routeTargetName: outcome.effectiveMode === 'EVACUATION' ? exitName(last) : request.targetName, emergencyMode: outcome.effectiveMode === 'EVACUATION' ? 'FIRE' : state.emergencyMode, simulationStartNodeId: startNodeId, simulationWheelchairMode: request.wheelchairMode ?? false })
    return outcome.route
  }
  const rerouteEvacuation = (startNodeId?: string) => {
    const state = get()
    const start = startNodeId ?? state.simulationStartNodeId
    if (!start) return undefined
    return applyRoute(start, { findNearestExit: true }, { wheelchairMode: state.simulationWheelchairMode })
  }
  return { applyRoute, exitName, rerouteEvacuation }
}
