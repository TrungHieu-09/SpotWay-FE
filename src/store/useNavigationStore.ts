import { create } from 'zustand'
import {
  createPublicRoute,
  getPublicFloorMap,
  getPublicFloors,
  getPublicVerticalLinks,
  searchPublicDestinations,
} from '../api/publicNavigation'
import { inferVerticalLinks } from '../utils/indoorPathfinding'
import { allNodesOf, floorLevelsOf, pickDefaultStart } from '../utils/navigationHelpers'
import { createRouteEngine } from './navigationRouteEngine'
import type { IndoorRoute, PublicFloor, PublicFloorMap, PublicSearchResult, VerticalLink, VerticalLinkDirection, VerticalLinkKind } from '../types/navigation'

export type RouteWarning = { code: string; severity: 'CRITICAL' | 'WARNING'; message: string; destinationCancelled?: boolean; requestedDestinationName?: string }
export type RouteRequest = { targetName?: string; wheelchairMode?: boolean; allowedTransitions?: ReadonlySet<VerticalLinkKind>; defaultEscalatorDirection?: VerticalLinkDirection }

export type NavigationState = {
  buildingId?: string
  floors: PublicFloor[]
  mapsByFloorId: Record<string, PublicFloorMap>
  destinations: PublicSearchResult[]
  verticalLinks: VerticalLink[]
  route?: IndoorRoute
  isLoading: boolean
  isRouting: boolean
  error?: string
  routeTargetName?: string
  routeWarning?: RouteWarning
  routeSource?: 'api' | 'offline'
  emergencyMode: 'NONE' | 'FIRE'
  activeFireNodeIds: string[]
  blockedEdgeIds: string[]
  simulationStartNodeId?: string
  simulationWheelchairMode: boolean
  interactiveFireMode: boolean
  isDemoRunning: boolean
  activeScenarioId?: DemoScenarioId
  simulationMessage?: string
  load: (buildingId: string) => Promise<void>
  search: (query: string) => Promise<void>
  findRoute: (input: { fromNodeId: string; toStoreId: string; wheelchairMode: boolean; transitions?: VerticalLinkKind[] }) => Promise<IndoorRoute | undefined>
  clearRoute: () => void
  toggleFireNode: (nodeId: string, currentNodeId?: string) => void
  setInteractiveFireMode: (enabled: boolean, currentNodeId?: string) => void
  extinguishAllFires: () => void
  resetSimulation: () => void
  runDemoScenario: (scenarioId: DemoScenarioId, startNodeId?: string) => Promise<void>
}

export type HappyScenarioId =
  | 'same-floor-shortest' | 'same-floor-turns' | 'elevator-wait' | 'stairs' | 'escalator-up'
  | 'escalator-reverse' | 'wheelchair' | 'nearest-restroom' | 'nearest-atm' | 'nearest-info'
export type FireScenarioId = 'fire-ground-main-exit' | 'fire-middle-floor' | 'fire-at-destination' | 'fire-exit-1' | 'fire-exits-1-2' | 'interactive-fire'
export type DemoScenarioId = HappyScenarioId | FireScenarioId | 'reset'

export const useNavigationStore = create<NavigationState>((set, get) => {
  const { applyRoute, rerouteEvacuation } = createRouteEngine(set, get)
  return {
  floors: [],
  mapsByFloorId: {},
  destinations: [],
  verticalLinks: [],
  isLoading: false,
  isRouting: false,
  emergencyMode: 'NONE',
  activeFireNodeIds: [],
  blockedEdgeIds: [],
  simulationWheelchairMode: false,
  interactiveFireMode: false,
  isDemoRunning: false,
  async load(buildingId) {
    set({ isLoading: true, error: undefined, route: undefined, routeWarning: undefined, routeSource: undefined, emergencyMode: 'NONE', activeFireNodeIds: [], blockedEdgeIds: [] })
    try {
      const floors = await getPublicFloors(buildingId)
      const maps = await Promise.all(floors.map((floor) => getPublicFloorMap(floor.id)))
      const destinations = await searchPublicDestinations(buildingId)
      const explicitLinks = await getPublicVerticalLinks(buildingId).catch((): VerticalLink[] => [])
      const nodes = maps.flatMap((map) => map.nodes)
      set({
        buildingId,
        floors,
        mapsByFloorId: Object.fromEntries(maps.map((map) => [map.floor.id, map])),
        destinations,
        verticalLinks: [...explicitLinks, ...inferVerticalLinks(nodes, floorLevelsOf(floors), explicitLinks)],
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Không thể tải bản đồ.' })
    } finally {
      set({ isLoading: false })
    }
  },
  async search(query) {
    const buildingId = get().buildingId
    if (!buildingId) return
    const destinations = await searchPublicDestinations(buildingId, query)
    set({ destinations })
  },
  async findRoute(input) {
    set({ isRouting: true, error: undefined })
    try {
      const picked = get().destinations.find((item) => item.id === input.toStoreId)
      const localRoute = () => picked && applyRoute(input.fromNodeId, picked.nodeId, { targetName: picked.name, wheelchairMode: input.wheelchairMode, allowedTransitions: input.transitions?.length ? new Set(input.transitions) : undefined })
      if (picked && (picked.type !== 'STORE' || input.transitions?.length) && Object.keys(get().mapsByFloorId).length > 0) return localRoute()
      try {
        const route = await createPublicRoute({ ...input, ...(get().emergencyMode === 'FIRE' ? { mode: 'EVACUATION', hazardNodeIds: get().activeFireNodeIds } : {}) })
        const warning = route.warnings?.find((item) => item.severity === 'CRITICAL')
        set({ route, routeSource: 'api', routeWarning: warning ? { code: warning.code, severity: 'CRITICAL', message: warning.message, destinationCancelled: route.destinationCancelled, requestedDestinationName: picked?.name } : undefined, routeTargetName: route.effectiveMode === 'EVACUATION' ? 'Lối thoát hiểm' : picked?.name, emergencyMode: route.effectiveMode === 'EVACUATION' ? 'FIRE' : get().emergencyMode })
        return route
      } catch (apiError) {
        const offline = localRoute()
        if (offline || get().routeWarning) return offline
        throw apiError
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tìm tuyến đường.'
      set({ error: message })
      throw error
    } finally {
      set({ isRouting: false })
    }
  },
  clearRoute() {
    set({ route: undefined, routeTargetName: undefined, routeWarning: undefined, routeSource: undefined })
  },
  toggleFireNode(nodeId, currentNodeId) {
    const state = get()
    const start = currentNodeId ?? state.simulationStartNodeId ?? pickDefaultStart(state.floors, allNodesOf(state.mapsByFloorId))
    if (nodeId === start) {
      set({ simulationMessage: 'Không thể đặt lửa tại vị trí hiện tại.' })
      return
    }
    const burning = state.activeFireNodeIds.includes(nodeId)
    set({
      emergencyMode: 'FIRE',
      activeFireNodeIds: burning ? state.activeFireNodeIds.filter((id) => id !== nodeId) : [...state.activeFireNodeIds, nodeId],
      simulationMessage: burning ? 'Đã dập lửa tại node vừa chọn — đang tính lại tuyến thoát hiểm.' : '🔥 Node vừa chọn đang cháy — đang tái định tuyến né vùng cháy.',
    })
    rerouteEvacuation(start)
  },
  setInteractiveFireMode(enabled, currentNodeId) {
    set({ interactiveFireMode: enabled })
    if (enabled) {
      const state = get()
      const start = currentNodeId ?? state.simulationStartNodeId ?? pickDefaultStart(state.floors, allNodesOf(state.mapsByFloorId))
      set({ emergencyMode: 'FIRE', simulationMessage: 'Chế độ đặt lửa: chạm node trên bản đồ để đốt hoặc dập lửa.' })
      rerouteEvacuation(start)
    }
  },
  extinguishAllFires() {
    set({ activeFireNodeIds: [], blockedEdgeIds: [], routeWarning: undefined, simulationMessage: '🧯 Đã dập tắt toàn bộ lửa mô phỏng.' })
    rerouteEvacuation()
  },
  resetSimulation() {
    set({ emergencyMode: 'NONE', activeFireNodeIds: [], blockedEdgeIds: [], interactiveFireMode: false, isDemoRunning: false, activeScenarioId: undefined, simulationMessage: undefined, route: undefined, routeWarning: undefined, routeSource: undefined, error: undefined })
  },
  async runDemoScenario(scenarioId, requestedStartNodeId) {
    if (scenarioId === 'reset') { get().resetSimulation(); return }
    const state = get()
    const start = requestedStartNodeId ?? state.simulationStartNodeId ?? pickDefaultStart(state.floors, allNodesOf(state.mapsByFloorId))
    if (!start) { set({ error: 'Tòa nhà chưa có node điều hướng để chạy demo.' }); return }
    set({ isDemoRunning: true, activeScenarioId: scenarioId, error: undefined, route: undefined, routeWarning: undefined })
    try {
      const nodes = allNodesOf(get().mapsByFloorId)
      const current = nodes.find((node) => node.id === start)
      const sameFloorNodes = nodes.filter((node) => node.floorId === current?.floorId && node.id !== start)
      const upperFloor = [...get().floors].filter((floor) => floor.floorNumber > (get().floors.find((floor) => floor.id === current?.floorId)?.floorNumber ?? -Infinity)).sort((a, b) => a.floorNumber - b.floorNumber)[0]
      const upperCandidate = nodes.find((node) => node.floorId === upperFloor?.id)
      const candidate = sameFloorNodes[0]
      if (scenarioId === 'interactive-fire') {
        get().setInteractiveFireMode(true, start)
        return
      }
      if (scenarioId.startsWith('fire-')) {
        const exits = nodes.filter((node) => node.type === 'EXIT' || node.type === 'EMERGENCY_EXIT')
        const elevatorNodes = nodes.filter((node) => node.type === 'ELEVATOR')
        const destination = get().destinations.find((item) => item.nodeId !== start)
        const blocked = scenarioId === 'fire-exits-1-2' ? exits.slice(0, 2)
          : scenarioId === 'fire-exit-1' ? exits.slice(0, 1)
          : scenarioId === 'fire-at-destination' && destination ? [{ id: destination.nodeId }]
          : scenarioId === 'fire-middle-floor' ? elevatorNodes.slice(0, 1)
          : []
        set({ emergencyMode: 'FIRE', activeFireNodeIds: blocked.map((node) => node.id), simulationMessage: '🚨 Mô phỏng hỏa hoạn: thang máy bị cấm, đang tìm lối thoát an toàn.' })
        rerouteEvacuation(start)
        return
      }
      const amenity = scenarioId === 'nearest-restroom' ? ['TOILET', 'RESTROOM'] : scenarioId === 'nearest-atm' ? ['ATM'] : scenarioId === 'nearest-info' ? ['INFO', 'INFORMATION'] : undefined
      const amenityTarget = amenity && Object.values(get().mapsByFloorId).flatMap((map) => map.pois).find((poi) => amenity.includes(poi.category.toUpperCase()) || amenity.some((value) => poi.name.toUpperCase().includes(value)))
      const needsTransition = ['elevator-wait', 'stairs', 'escalator-up', 'escalator-reverse', 'wheelchair'].includes(scenarioId)
      const target = amenityTarget?.nodeId ?? (needsTransition ? upperCandidate?.id : candidate?.id)
      if (!target) { set({ error: needsTransition ? 'Cần tối thiểu hai tầng có node để chạy demo chuyển tầng.' : 'Không có điểm đến phù hợp để chạy demo.' }); return }
      const transition = scenarioId === 'elevator-wait' ? 'ELEVATOR' : scenarioId === 'stairs' ? 'STAIR' : scenarioId.startsWith('escalator') ? 'ESCALATOR' : undefined
      const routeStart = scenarioId === 'escalator-reverse' && upperCandidate ? upperCandidate.id : start
      const routeTarget = scenarioId === 'escalator-reverse' ? start : target
      applyRoute(routeStart, routeTarget, {
        wheelchairMode: scenarioId === 'wheelchair',
        allowedTransitions: transition ? new Set([transition]) : undefined,
        defaultEscalatorDirection: scenarioId === 'escalator-up' ? 'UP' : undefined,
        targetName: scenarioId === 'wheelchair' ? 'Điểm đến tiếp cận được' : 'Điểm đến mô phỏng',
      })
      set({ simulationMessage: `Đang chạy ${scenarioId}: kiểm tra tuyến, chỉ dẫn rẽ và khả năng tiếp cận.` })
    } finally {
      set({ isDemoRunning: false })
    }
  },
  }
})
