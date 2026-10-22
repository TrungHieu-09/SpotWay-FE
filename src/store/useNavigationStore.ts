import { create } from 'zustand'
import { getBuildingOverview } from '../api/navigation'
import {
  createPublicRoute,
  getPublicFloorMap,
  getPublicFloors,
  searchPublicDestinations,
} from '../api/publicNavigation'
import type {
  IndoorRoute,
  PublicFloor,
  PublicFloorMap,
  PublicNode,
  PublicSearchResult,
  VerticalLink,
} from '../types/navigation'
import {
  findIndoorRoute,
  getExitCandidates,
  inferVerticalLinks,
  type RouteTarget,
} from '../utils/indoorPathfinding'

export type DemoScenarioId =
  | 'demo-same-floor'
  | 'demo-multi-floor'
  | 'demo-wheelchair'
  | 'demo-fire-alarm'
  | 'demo-fire-blocked-exit'
  | 'demo-reset'

const REROUTE_DELAY_MS = 1200

type NavigationSimulationState = {
  verticalLinks: VerticalLink[]
  emergencyMode: 'NONE' | 'FIRE'
  activeFireNodeIds: string[]
  blockedEdgeIds: string[]
  isDemoRunning: boolean
  activeScenarioId?: DemoScenarioId
  simulationStartNodeId?: string
  simulationWheelchairMode: boolean
  routeTargetName?: string
  simulationMessage?: string
  triggerFireAlarm: (initialFireNodeId?: string, currentNodeId?: string) => void
  blockExitWithFire: (exitNodeId: string) => void
  resetSimulation: () => void
  runDemoScenario: (scenarioId: DemoScenarioId, currentNodeId?: string) => Promise<void>
}

type NavigationState = NavigationSimulationState & {
  buildingId?: string
  floors: PublicFloor[]
  mapsByFloorId: Record<string, PublicFloorMap>
  destinations: PublicSearchResult[]
  route?: IndoorRoute
  isLoading: boolean
  isRouting: boolean
  error?: string
  load: (buildingId: string) => Promise<void>
  search: (query: string) => Promise<void>
  findRoute: (input: { fromNodeId: string; toStoreId: string; wheelchairMode: boolean }) => Promise<IndoorRoute>
  clearRoute: () => void
}

const INITIAL_SIMULATION = {
  emergencyMode: 'NONE' as const,
  activeFireNodeIds: [],
  blockedEdgeIds: [],
  isDemoRunning: false,
  activeScenarioId: undefined,
  simulationStartNodeId: undefined,
  simulationWheelchairMode: false,
  routeTargetName: undefined,
  simulationMessage: undefined,
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function floorLevelsOf(floors: PublicFloor[]) {
  return Object.fromEntries(floors.map((floor) => [floor.id, floor.floorNumber]))
}

function floorNamesOf(floors: PublicFloor[]) {
  return Object.fromEntries(floors.map((floor) => [floor.id, `Tầng ${floor.floorNumber}`]))
}

function allNodesOf(mapsByFloorId: Record<string, PublicFloorMap>) {
  return Object.values(mapsByFloorId).flatMap((map) => map.nodes)
}

function pickDefaultStart(floors: PublicFloor[], nodes: PublicNode[]) {
  const ground = [...floors].sort((a, b) => a.floorNumber - b.floorNumber)[0]
  const groundNodes = nodes.filter((node) => node.floorId === ground?.id)
  return (groundNodes.find((node) => node.type === 'DOOR') ?? groundNodes[0] ?? nodes[0])?.id
}

function pickDestination(destinations: PublicSearchResult[], floorId: string | undefined, keywords: string[]) {
  const onFloor = destinations.filter((item) => item.floorId === floorId)
  return onFloor.find((item) => keywords.some((keyword) => item.name.toLowerCase().includes(keyword))) ?? onFloor[0]
}

export const useNavigationStore = create<NavigationState>((set, get) => {
  const computeLocalRoute = (
    startNodeId: string,
    target: RouteTarget,
    targetName: string | undefined,
    wheelchairMode: boolean,
  ) => {
    const { floors, mapsByFloorId, verticalLinks, emergencyMode, activeFireNodeIds, blockedEdgeIds } = get()
    const maps = Object.values(mapsByFloorId)
    const route = findIndoorRoute(
      startNodeId,
      target,
      maps.flatMap((map) => map.nodes),
      maps.flatMap((map) => map.edges),
      verticalLinks,
      {
        wheelchairMode,
        emergencyMode,
        blockedNodeIds: new Set(activeFireNodeIds),
        blockedEdgeIds: new Set(blockedEdgeIds),
        floorLevels: floorLevelsOf(floors),
        floorNames: floorNamesOf(floors),
      },
    )
    if (!route) {
      set({
        route: undefined,
        routeTargetName: undefined,
        simulationStartNodeId: startNodeId,
        error:
          emergencyMode === 'FIRE'
            ? 'Không còn lối thoát hiểm an toàn. Di chuyển tới khu vực lánh nạn và gọi 114.'
            : 'Không tìm thấy tuyến đường phù hợp trên đồ thị.',
      })
      return
    }
    const lastNodeId = route.nodeIds[route.nodeIds.length - 1]
    const lastNode = allNodesOf(mapsByFloorId).find((node) => node.id === lastNodeId)
    set({
      route,
      error: undefined,
      simulationStartNodeId: startNodeId,
      simulationWheelchairMode: wheelchairMode,
      routeTargetName:
        targetName ?? lastNode?.name ?? (lastNode?.type === 'EMERGENCY_EXIT' ? 'Cửa thoát hiểm' : 'Lối ra'),
    })
  }

  return {
    floors: [],
    mapsByFloorId: {},
    destinations: [],
    isLoading: false,
    isRouting: false,
    verticalLinks: [],
    ...INITIAL_SIMULATION,
    async load(buildingId) {
      set({ isLoading: true, error: undefined, route: undefined, ...INITIAL_SIMULATION })
      try {
        const floors = await getPublicFloors(buildingId)
        const maps = await Promise.all(floors.map((floor) => getPublicFloorMap(floor.id)))
        const destinations = await searchPublicDestinations(buildingId)
        // Vertical link không bắt buộc: thiếu overview vẫn suy luận được từ các node thang cùng loại
        const explicitLinks = await getBuildingOverview(buildingId)
          .then((overview): VerticalLink[] => overview.verticalLinks ?? [])
          .catch((): VerticalLink[] => [])
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
        const route = await createPublicRoute(input)
        set({ route, routeTargetName: undefined })
        return route
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể tìm tuyến đường.'
        set({ error: message })
        throw error
      } finally {
        set({ isRouting: false })
      }
    },
    clearRoute() {
      set({ route: undefined, routeTargetName: undefined })
    },
    triggerFireAlarm(initialFireNodeId, currentNodeId) {
      const { floors, mapsByFloorId, route, simulationStartNodeId, simulationWheelchairMode, activeFireNodeIds } =
        get()
      const startNodeId = currentNodeId ?? simulationStartNodeId ?? pickDefaultStart(floors, allNodesOf(mapsByFloorId))
      if (!startNodeId) return
      // Mặc định đám cháy bùng phát tại đích mua sắm cũ (nếu có) để thấy rõ việc huỷ đích đến
      const previousTarget = route?.nodeIds[route.nodeIds.length - 1]
      const fireNodeId = initialFireNodeId ?? (previousTarget !== startNodeId ? previousTarget : undefined)
      set({
        emergencyMode: 'FIRE',
        activeFireNodeIds: fireNodeId ? [...new Set([...activeFireNodeIds, fireNodeId])] : activeFireNodeIds,
        simulationMessage: 'BÁO ĐỘNG CHÁY: thang máy bị khoá, đang dẫn tới lối thoát hiểm gần nhất.',
      })
      computeLocalRoute(startNodeId, { findNearestExit: true }, undefined, simulationWheelchairMode)
    },
    blockExitWithFire(exitNodeId) {
      const { activeFireNodeIds, simulationStartNodeId, simulationWheelchairMode } = get()
      set({
        emergencyMode: 'FIRE',
        activeFireNodeIds: [...new Set([...activeFireNodeIds, exitNodeId])],
        simulationMessage:
          'Lửa đã chặn lối thoát hiểm — hệ thống tự động tái định tuyến sang lối thoát an toàn tiếp theo.',
      })
      if (simulationStartNodeId) {
        computeLocalRoute(simulationStartNodeId, { findNearestExit: true }, undefined, simulationWheelchairMode)
      }
    },
    resetSimulation() {
      set({ ...INITIAL_SIMULATION, route: undefined, error: undefined })
    },
    async runDemoScenario(scenarioId, currentNodeId) {
      if (scenarioId === 'demo-reset') {
        get().resetSimulation()
        return
      }
      const { floors, mapsByFloorId, destinations } = get()
      const nodes = allNodesOf(mapsByFloorId)
      const defaultStart = pickDefaultStart(floors, nodes)
      if (!defaultStart) {
        set({ error: 'Tòa nhà chưa có node điều hướng để chạy demo.' })
        return
      }

      set({ isDemoRunning: true, activeScenarioId: scenarioId })
      try {
        if (scenarioId === 'demo-same-floor') {
          set({ ...INITIAL_SIMULATION, isDemoRunning: true, activeScenarioId: scenarioId })
          const startFloorId = nodes.find((node) => node.id === defaultStart)?.floorId
          const destination = pickDestination(destinations, startFloorId, ['cafe', 'coffee', 'cà phê'])
          const fallback = nodes.filter((node) => node.floorId === startFloorId && node.id !== defaultStart).at(-1)
          const targetNodeId = destination?.nodeId ?? fallback?.id
          if (targetNodeId) computeLocalRoute(defaultStart, targetNodeId, destination?.name, false)
          set({ simulationMessage: 'Demo 1: tuyến đường cùng tầng với chỉ dẫn turn-by-turn.' })
        } else if (scenarioId === 'demo-multi-floor' || scenarioId === 'demo-wheelchair') {
          const wheelchair = scenarioId === 'demo-wheelchair'
          set({ ...INITIAL_SIMULATION, isDemoRunning: true, activeScenarioId: scenarioId })
          const sorted = [...floors].sort((a, b) => a.floorNumber - b.floorNumber)
          const topFloor = sorted.length > 2 ? sorted[2] : sorted.at(-1)
          const destination = pickDestination(destinations, topFloor?.id, ['rạp', 'cinema', 'cgv', 'phim'])
          const fallback = nodes.find((node) => node.floorId === topFloor?.id)
          const targetNodeId = destination?.nodeId ?? fallback?.id
          if (targetNodeId) computeLocalRoute(defaultStart, targetNodeId, destination?.name, wheelchair)
          set({
            simulationMessage: wheelchair
              ? 'Demo 3: chế độ xe lăn — loại bỏ thang bộ/thang cuốn, chỉ dùng thang máy và lối đi tiếp cận được.'
              : `Demo 2: tuyến đa tầng lên ${topFloor ? `Tầng ${topFloor.floorNumber}` : 'tầng trên'}.`,
          })
        } else if (scenarioId === 'demo-fire-alarm') {
          get().triggerFireAlarm(undefined, currentNodeId)
        } else if (scenarioId === 'demo-fire-blocked-exit') {
          if (get().emergencyMode !== 'FIRE') {
            get().triggerFireAlarm(undefined, currentNodeId)
            await wait(REROUTE_DELAY_MS)
          }
          const route = get().route
          const exitNodeId =
            route?.nodeIds[route.nodeIds.length - 1] ??
            getExitCandidates(nodes, floorLevelsOf(floors)).find(
              (node) => !get().activeFireNodeIds.includes(node.id),
            )?.id
          if (exitNodeId) get().blockExitWithFire(exitNodeId)
        }
      } finally {
        set({ isDemoRunning: false })
      }
    },
  }
})
