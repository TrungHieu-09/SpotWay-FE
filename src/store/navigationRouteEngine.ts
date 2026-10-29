import {
  findIndoorRoute,
  findRouteWithHazardPolicy,
  type RouteTarget,
} from '../utils/indoorPathfinding.ts'
import { allNodesOf, calibrationOf, floorLevelsOf, floorNamesOf } from '../utils/navigationHelpers.ts'
import type { NavigationState, RouteRequest, RouteWarning } from './navigationState.ts'

type StoreSet = (partial: Partial<NavigationState>) => void
type StoreGet = () => NavigationState

/**
 * Tính tuyến offline trên graph đang nạp, có xét hazard. Dùng chung cho tìm đường (fallback)
 * và mô phỏng, nên nằm riêng để hai slice không phụ thuộc lẫn nhau.
 */
export function createRouteEngine(set: StoreSet, get: StoreGet) {
  const graphInput = (request: RouteRequest) => {
    const { floors, mapsByFloorId, verticalLinks, emergencyMode, activeFireNodeIds, blockedEdgeIds } = get()
    const maps = Object.values(mapsByFloorId)
    return {
      nodes: maps.flatMap((map) => map.nodes),
      edges: maps.flatMap((map) => map.edges),
      verticalLinks,
      options: {
        wheelchairMode: request.wheelchairMode,
        emergencyMode,
        blockedNodeIds: new Set(activeFireNodeIds),
        blockedEdgeIds: new Set(blockedEdgeIds),
        allowedTransitions: request.allowedTransitions,
        defaultEscalatorDirection: request.defaultEscalatorDirection,
        floorLevels: floorLevelsOf(floors),
        floorNames: floorNamesOf(floors),
        mapUnitsPerMeter: calibrationOf(floors, 'mapUnitsPerMeter'),
        northOffsetDegrees: calibrationOf(floors, 'northOffsetDegrees'),
      },
    }
  }

  /** Chỉ tính, không ghi vào store. */
  const routeOnGraph = (startNodeId: string, target: RouteTarget, request: RouteRequest = {}) => {
    const { nodes, edges, verticalLinks, options } = graphInput(request)
    return findIndoorRoute(startNodeId, target, nodes, edges, verticalLinks, options)
  }

  const exitName = (nodeId: string | undefined) => {
    const node = allNodesOf(get().mapsByFloorId).find((item) => item.id === nodeId)
    return node?.name ?? (node?.type === 'EMERGENCY_EXIT' ? 'Cửa thoát hiểm' : 'Lối ra')
  }

  /** Tính tuyến và ghi vào store; tự huỷ điểm đến đang cháy và chuyển sang thoát hiểm. */
  const applyRoute = (startNodeId: string, target: RouteTarget, request: RouteRequest = {}) => {
    const wheelchairMode = request.wheelchairMode ?? false
    set({ simulationStartNodeId: startNodeId, simulationWheelchairMode: wheelchairMode })

    const { nodes, edges, verticalLinks, options } = graphInput({ ...request, wheelchairMode })
    const outcome = findRouteWithHazardPolicy(startNodeId, target, nodes, edges, verticalLinks, options)
    if (outcome.effectiveMode === 'EVACUATION') set({ emergencyMode: 'FIRE' })

    let routeWarning: RouteWarning | undefined
    if (outcome.warningCode === 'SOURCE_IN_HAZARD') {
      routeWarning = {
        code: 'SOURCE_IN_HAZARD',
        severity: 'CRITICAL',
        message: 'Vị trí hiện tại nằm trong vùng cháy — không thể tính tuyến an toàn từ điểm này.',
      }
    } else if (outcome.warningCode === 'NO_SAFE_EXIT_FOUND') {
      routeWarning = {
        code: 'NO_SAFE_EXIT_FOUND',
        severity: 'CRITICAL',
        message: 'Không còn lối thoát hiểm an toàn. Di chuyển tới khu vực lánh nạn và gọi 114.',
        destinationCancelled: outcome.destinationCancelled,
        requestedDestinationName: outcome.destinationCancelled ? request.targetName : undefined,
      }
    } else if (outcome.warningCode === 'DESTINATION_IN_HAZARD') {
      routeWarning = {
        code: 'DESTINATION_IN_HAZARD',
        severity: 'CRITICAL',
        message: 'Điểm đến đang nằm trong vùng cháy. Đã huỷ điểm đến — hãy đi theo lộ trình thoát hiểm.',
        destinationCancelled: true,
        requestedDestinationName: request.targetName,
      }
    }

    const route = outcome.route
    if (!route) {
      set({
        route: undefined,
        routeTargetName: undefined,
        routeWarning,
        error: outcome.effectiveMode === 'EVACUATION' ? undefined : 'Không tìm thấy tuyến đường phù hợp trên đồ thị.',
      })
      return undefined
    }

    const lastNodeId = route.nodeIds[route.nodeIds.length - 1]
    set({
      route,
      error: undefined,
      routeWarning,
      routeSource: 'offline',
      routeTargetName: outcome.effectiveMode === 'EVACUATION' ? exitName(lastNodeId) : (request.targetName ?? exitName(lastNodeId)),
    })
    return route
  }

  const rerouteEvacuation = (currentNodeId?: string) => {
    const { simulationStartNodeId, simulationWheelchairMode } = get()
    const start = currentNodeId ?? simulationStartNodeId
    if (start) applyRoute(start, { findNearestExit: true }, { wheelchairMode: simulationWheelchairMode })
  }

  return { routeOnGraph, exitName, applyRoute, rerouteEvacuation }
}

export type RouteEngine = ReturnType<typeof createRouteEngine>
