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
  VerticalLinkDirection,
  VerticalLinkKind,
} from '../types/navigation'
import {
  findIndoorRoute,
  findRouteWithHazardPolicy,
  getExitCandidates,
  inferVerticalLinks,
  type RouteTarget,
} from '../utils/indoorPathfinding'

export type HappyScenarioId =
  | 'same-floor-shortest'
  | 'same-floor-turns'
  | 'elevator-wait'
  | 'stairs'
  | 'escalator-up'
  | 'escalator-reverse'
  | 'wheelchair'
  | 'nearest-restroom'
  | 'nearest-atm'
  | 'nearest-info'

export type FireScenarioId =
  | 'fire-ground-main-exit'
  | 'fire-middle-floor'
  | 'fire-at-destination'
  | 'fire-exit-1'
  | 'fire-exits-1-2'
  | 'interactive-fire'

export type DemoScenarioId = HappyScenarioId | FireScenarioId | 'reset'

export type RouteWarning = {
  code: string
  severity: 'CRITICAL' | 'WARNING'
  message: string
  destinationCancelled?: boolean
  requestedDestinationName?: string
}

type RouteRequest = {
  targetName?: string
  wheelchairMode?: boolean
  allowedTransitions?: ReadonlySet<VerticalLinkKind>
  defaultEscalatorDirection?: VerticalLinkDirection
}

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
  routeWarning?: RouteWarning
  routeSource?: 'api' | 'offline'
  interactiveFireMode: boolean
  triggerFireAlarm: (initialFireNodeId?: string, currentNodeId?: string) => void
  blockExitWithFire: (exitNodeId: string) => void
  toggleFireNode: (nodeId: string, currentNodeId?: string) => void
  setInteractiveFireMode: (enabled: boolean, currentNodeId?: string) => void
  extinguishAllFires: () => void
  resetSimulation: () => void
  runDemoScenario: (scenarioId: DemoScenarioId) => Promise<void>
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
  findRoute: (input: { fromNodeId: string; toStoreId: string; wheelchairMode: boolean }) => Promise<IndoorRoute | undefined>
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
  routeWarning: undefined,
  routeSource: undefined,
  interactiveFireMode: false,
}

const AMENITY_MATCHERS: Record<'RESTROOM' | 'ATM' | 'INFO', { categories: string[]; keywords: string[]; label: string }> = {
  RESTROOM: { categories: ['RESTROOM', 'TOILET'], keywords: ['wc', 'toilet', 'vệ sinh', 'restroom'], label: 'nhà vệ sinh' },
  ATM: { categories: ['ATM'], keywords: ['atm'], label: 'ATM' },
  INFO: { categories: ['INFO'], keywords: ['info', 'thông tin', 'lễ tân', 'quầy'], label: 'quầy thông tin' },
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const floorLevelsOf = (floors: PublicFloor[]) =>
  Object.fromEntries(floors.map((floor) => [floor.id, floor.floorNumber]))

const floorNamesOf = (floors: PublicFloor[]) =>
  Object.fromEntries(floors.map((floor) => [floor.id, `Tầng ${floor.floorNumber}`]))

const calibrationOf = (floors: PublicFloor[], key: 'mapUnitsPerMeter' | 'northOffsetDegrees') =>
  Object.fromEntries(
    floors.flatMap((floor) => (typeof floor[key] === 'number' ? [[floor.id, floor[key] as number]] : [])),
  )

const allNodesOf = (mapsByFloorId: Record<string, PublicFloorMap>) =>
  Object.values(mapsByFloorId).flatMap((map) => map.nodes)

const sortFloors = (floors: PublicFloor[]) => [...floors].sort((a, b) => a.floorNumber - b.floorNumber)

function pickDefaultStart(floors: PublicFloor[], nodes: PublicNode[]) {
  const ground = sortFloors(floors)[0]
  const groundNodes = nodes.filter((node) => node.floorId === ground?.id)
  return (groundNodes.find((node) => node.type === 'DOOR') ?? groundNodes[0] ?? nodes[0])?.id
}

function pickDestination(destinations: PublicSearchResult[], floorId: string | undefined, keywords: string[]) {
  const onFloor = destinations.filter((item) => item.floorId === floorId)
  return onFloor.find((item) => keywords.some((keyword) => item.name.toLowerCase().includes(keyword))) ?? onFloor[0]
}

/** Tầng đích cho demo đa tầng: Tầng 3 nếu có, không thì tầng cao nhất */
const upperFloorOf = (floors: PublicFloor[]) => {
  const sorted = sortFloors(floors)
  return sorted.length > 2 ? sorted[2] : sorted.at(-1)
}

function neighborsOf(mapsByFloorId: Record<string, PublicFloorMap>, nodeId: string) {
  return Object.values(mapsByFloorId)
    .flatMap((map) => map.edges)
    .flatMap((edge) =>
      edge.fromNodeId === nodeId ? [edge.toNodeId] : edge.toNodeId === nodeId ? [edge.fromNodeId] : [],
    )
}

export const useNavigationStore = create<NavigationState>((set, get) => {
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

  const startScenario = (scenarioId: DemoScenarioId, message: string) =>
    set({ ...INITIAL_SIMULATION, isDemoRunning: true, activeScenarioId: scenarioId, simulationMessage: message, route: undefined, error: undefined })

  const runHappyScenario = (scenarioId: HappyScenarioId, defaultStart: string) => {
    const { floors, mapsByFloorId, destinations } = get()
    const nodes = allNodesOf(mapsByFloorId)
    const startFloorId = nodes.find((node) => node.id === defaultStart)?.floorId
    const upperFloor = upperFloorOf(floors)
    const upperDestination = pickDestination(destinations, upperFloor?.id, ['rạp', 'cinema', 'cgv', 'phim'])
    const upperTarget = upperDestination?.nodeId ?? nodes.find((node) => node.floorId === upperFloor?.id)?.id
    const upperLabel = upperFloor ? `Tầng ${upperFloor.floorNumber}` : 'tầng trên'

    const sameFloorCandidates = () => {
      const fromDestinations = destinations.filter((item) => item.floorId === startFloorId).map((item) => item.nodeId)
      const ids = fromDestinations.length > 0
        ? fromDestinations
        : nodes.filter((node) => node.floorId === startFloorId && node.id !== defaultStart).map((node) => node.id)
      return ids.filter((id) => id !== defaultStart)
    }
    const nameOfNode = (nodeId: string | undefined) =>
      destinations.find((item) => item.nodeId === nodeId)?.name ?? nodes.find((node) => node.id === nodeId)?.name ?? undefined

    const viaTransition = (kind: VerticalLinkKind, message: string, direction?: VerticalLinkDirection) => {
      startScenario(scenarioId, message)
      if (!upperTarget) return set({ error: 'Tòa nhà cần ít nhất 2 tầng có node để demo chuyển tầng.' })
      const route = applyRoute(defaultStart, upperTarget, {
        targetName: upperDestination?.name,
        allowedTransitions: new Set([kind]),
        defaultEscalatorDirection: direction,
      })
      if (!route) set({ error: `Không có tuyến lên ${upperLabel} bằng ${kind === 'ELEVATOR' ? 'thang máy' : kind === 'STAIR' ? 'thang bộ' : 'thang cuốn'} — kiểm tra node/vertical link.` })
    }

    switch (scenarioId) {
      case 'same-floor-shortest': {
        startScenario(scenarioId, 'H1: điểm đến gần nhất cùng tầng theo chi phí đồ thị.')
        const route = applyRoute(defaultStart, { nodeIds: sameFloorCandidates() })
        if (route) set({ routeTargetName: nameOfNode(route.nodeIds.at(-1)) ?? 'Điểm đến' })
        return
      }
      case 'same-floor-turns': {
        startScenario(scenarioId, 'H2: tuyến cùng tầng nhiều ngã rẽ — chỉ dẫn turn-by-turn kèm khoảng cách mét.')
        const turnCount = (route: IndoorRoute) =>
          route.instructions?.filter((item) => !['START', 'STRAIGHT', 'ARRIVE', 'ARRIVE_AT_SAFE_EXIT'].includes(item.maneuver)).length ?? 0
        let best: { nodeId: string; turns: number; distance: number } | undefined
        for (const nodeId of sameFloorCandidates().slice(0, 80)) {
          const route = routeOnGraph(defaultStart, nodeId)
          if (!route) continue
          const turns = turnCount(route)
          if (!best || turns > best.turns || (turns === best.turns && route.totalDistance > best.distance)) {
            best = { nodeId, turns, distance: route.totalDistance }
          }
        }
        if (best) applyRoute(defaultStart, best.nodeId, { targetName: nameOfNode(best.nodeId) })
        else set({ error: 'Không có điểm đến cùng tầng nào nối được với điểm xuất phát.' })
        return
      }
      case 'elevator-wait':
        return viaTransition('ELEVATOR', `H3: lên ${upperLabel} bằng thang máy — hiển thị thời gian chờ và phân rã thời gian.`)
      case 'stairs':
        return viaTransition('STAIR', `H4: lên ${upperLabel} bằng thang bộ.`)
      case 'escalator-up':
        return viaTransition('ESCALATOR', `H5: thang cuốn một chiều đi lên ${upperLabel}.`, 'UP')
      case 'escalator-reverse': {
        startScenario(scenarioId, 'H6: thang cuốn mô phỏng một chiều LÊN — khi đi xuống, hệ thống không dùng thang cuốn ngược chiều.')
        if (!upperTarget) return set({ error: 'Tòa nhà cần ít nhất 2 tầng có node để demo chuyển tầng.' })
        applyRoute(upperTarget, defaultStart, { targetName: nameOfNode(defaultStart) ?? 'Cửa chính', defaultEscalatorDirection: 'UP' })
        return
      }
      case 'wheelchair': {
        startScenario(scenarioId, 'H7: chế độ xe lăn — loại thang bộ/thang cuốn và lối đi không tiếp cận được.')
        if (!upperTarget) return set({ error: 'Tòa nhà cần ít nhất 2 tầng có node để demo chuyển tầng.' })
        applyRoute(defaultStart, upperTarget, { targetName: upperDestination?.name, wheelchairMode: true })
        return
      }
      case 'nearest-restroom':
      case 'nearest-atm':
      case 'nearest-info': {
        const key = scenarioId === 'nearest-restroom' ? 'RESTROOM' : scenarioId === 'nearest-atm' ? 'ATM' : 'INFO'
        const matcher = AMENITY_MATCHERS[key]
        startScenario(scenarioId, `Tìm ${matcher.label} gần nhất theo chi phí đồ thị (không theo đường chim bay).`)
        const pois = Object.values(mapsByFloorId).flatMap((map) => map.pois).filter((poi) =>
          matcher.categories.includes(poi.category.toUpperCase()) ||
          matcher.keywords.some((keyword) => poi.name.toLowerCase().includes(keyword)),
        )
        if (pois.length === 0) return set({ error: `Tòa nhà chưa có POI ${matcher.label} để demo.` })
        const route = applyRoute(defaultStart, { nodeIds: pois.map((poi) => poi.nodeId) })
        if (route) {
          const poi = pois.find((item) => item.nodeId === route.nodeIds.at(-1))
          set({ routeTargetName: poi?.name ?? matcher.label })
        }
        return
      }
    }
  }

  const runFireScenario = async (scenarioId: FireScenarioId, defaultStart: string) => {
    const { floors, mapsByFloorId } = get()
    const nodes = allNodesOf(mapsByFloorId)
    const isExit = (nodeId: string) => getExitCandidates(nodes, floorLevelsOf(floors)).some((node) => node.id === nodeId)
    const ignite = (nodeIds: string[]) =>
      set({ emergencyMode: 'FIRE', activeFireNodeIds: [...new Set([...get().activeFireNodeIds, ...nodeIds])] })
    const evacuate = (start: string) => applyRoute(start, { findNearestExit: true })

    switch (scenarioId) {
      case 'fire-ground-main-exit': {
        startScenario(scenarioId, 'F1: cháy gần cửa chính tầng trệt — tránh vùng cháy, dẫn ra cửa thoát phía sau.')
        set({ emergencyMode: 'FIRE' })
        const mainExit = evacuate(defaultStart)?.nodeIds.at(-1)
        if (!mainExit) return
        ignite([mainExit, ...neighborsOf(mapsByFloorId, mainExit).filter((id) => id !== defaultStart && !isExit(id))])
        await wait(REROUTE_DELAY_MS)
        evacuate(defaultStart)
        return
      }
      case 'fire-middle-floor': {
        startScenario(scenarioId, 'F2: cháy tại sảnh thang máy tầng giữa — cấm thang máy, đi thang bộ thoát hiểm xuống.')
        const middle = sortFloors(floors)[1]
        if (!middle) return set({ error: 'Cần ít nhất 2 tầng để demo cháy tầng giữa.' })
        const floorNodes = nodes.filter((node) => node.floorId === middle.id)
        const elevators = floorNodes.filter((node) => node.type === 'ELEVATOR')
        const fire = elevators.length > 0
          ? elevators.flatMap((node) => neighborsOf(mapsByFloorId, node.id)).filter((id) => floorNodes.some((node) => node.id === id && node.type !== 'STAIR'))
          : floorNodes.slice(Math.floor(floorNodes.length / 2), Math.floor(floorNodes.length / 2) + 1).map((node) => node.id)
        const anchor = elevators[0] ?? floorNodes.find((node) => fire.includes(node.id))
        const start = floorNodes
          .filter((node) => !fire.includes(node.id) && !['ELEVATOR', 'STAIR', 'ESCALATOR'].includes(node.type))
          .sort((a, b) => (anchor ? Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y) : 0))[0]
        if (!start) return set({ error: `Tầng ${middle.floorNumber} không có node phù hợp làm vị trí người dùng.` })
        ignite(fire)
        evacuate(start.id)
        return
      }
      case 'fire-at-destination': {
        const upperFloor = upperFloorOf(floors)
        const destination = pickDestination(get().destinations, upperFloor?.id, ['rạp', 'cinema', 'cgv', 'phim'])
        const target = destination?.nodeId ?? nodes.find((node) => node.floorId === upperFloor?.id)?.id
        startScenario(scenarioId, 'F3: đang đi mua sắm thì điểm đến bốc cháy — huỷ điểm đến, chuyển sang thoát hiểm.')
        if (!target) return set({ error: 'Không tìm được điểm đến để demo.' })
        applyRoute(defaultStart, target, { targetName: destination?.name })
        await wait(REROUTE_DELAY_MS)
        ignite([target])
        applyRoute(defaultStart, target, { targetName: destination?.name })
        return
      }
      case 'fire-exit-1':
      case 'fire-exits-1-2': {
        const both = scenarioId === 'fire-exits-1-2'
        startScenario(scenarioId, both
          ? 'F5: lửa lần lượt chặn Cửa thoát 1 và 2 — tái định tuyến sang Cửa thoát 3.'
          : 'F4: lửa chặn Cửa thoát 1 — tái định tuyến tức thời sang Cửa thoát 2.')
        set({ emergencyMode: 'FIRE' })
        for (let round = 0; round < (both ? 2 : 1); round += 1) {
          const exitNodeId = evacuate(defaultStart)?.nodeIds.at(-1)
          if (!exitNodeId) return
          await wait(REROUTE_DELAY_MS)
          ignite([exitNodeId])
        }
        evacuate(defaultStart)
        return
      }
      case 'interactive-fire': {
        startScenario(scenarioId, 'F6: bật chế độ đặt lửa — chạm vào node bất kỳ trên bản đồ để đốt/dập, tuyến thoát hiểm tự cập nhật.')
        set({ emergencyMode: 'FIRE', interactiveFireMode: true })
        evacuate(defaultStart)
      }
    }
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
        const { emergencyMode, activeFireNodeIds } = get()
        const evacuation = emergencyMode === 'FIRE'
        try {
          const route = await createPublicRoute({
            ...input,
            ...(evacuation ? { mode: 'EVACUATION' as const, hazardNodeIds: activeFireNodeIds } : {}),
          })
          const critical = route.warnings?.find((item) => item.severity === 'CRITICAL') ?? route.warnings?.[0]
          const resolvedNodeId = route.resolvedDestination?.nodeId
          set({
            route,
            routeSource: 'api',
            routeTargetName: route.effectiveMode === 'EVACUATION' ? exitName(resolvedNodeId ?? route.nodeIds.at(-1)) : undefined,
            routeWarning: critical && {
              code: critical.code,
              severity: critical.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
              message: route.destinationCancelled
                ? `${critical.message} Đã chuyển sang lộ trình thoát hiểm.`
                : critical.message,
              destinationCancelled: route.destinationCancelled,
              requestedDestinationName: get().destinations.find((item) => item.id === input.toStoreId)?.name,
            },
            ...(route.effectiveMode === 'EVACUATION' ? { emergencyMode: 'FIRE' as const } : {}),
          })
          return route
        } catch (apiError) {
          // Backend lỗi/mất mạng: tính tuyến offline bằng Dijkstra cục bộ để không gián đoạn trải nghiệm
          const destination = get().destinations.find((item) => item.id === input.toStoreId)
          if (!destination || Object.keys(get().mapsByFloorId).length === 0) throw apiError
          const route = applyRoute(input.fromNodeId, destination.nodeId, {
            targetName: destination.name,
            wheelchairMode: input.wheelchairMode,
          })
          if (route) {
            set({ routeSource: 'offline' })
            return route
          }
          if (get().routeWarning) {
            set({ routeSource: 'offline' })
            return undefined
          }
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
    triggerFireAlarm(initialFireNodeId, currentNodeId) {
      const { floors, mapsByFloorId, simulationStartNodeId, activeFireNodeIds } = get()
      const start = currentNodeId ?? simulationStartNodeId ?? pickDefaultStart(floors, allNodesOf(mapsByFloorId))
      if (!start) return
      set({
        emergencyMode: 'FIRE',
        activeFireNodeIds: initialFireNodeId ? [...new Set([...activeFireNodeIds, initialFireNodeId])] : activeFireNodeIds,
        simulationMessage: 'BÁO ĐỘNG CHÁY: thang máy bị khoá, đang dẫn tới lối thoát hiểm gần nhất.',
      })
      rerouteEvacuation(start)
    },
    blockExitWithFire(exitNodeId) {
      set({
        emergencyMode: 'FIRE',
        activeFireNodeIds: [...new Set([...get().activeFireNodeIds, exitNodeId])],
        simulationMessage: 'Lửa đã chặn lối thoát hiểm — tự động tái định tuyến sang lối thoát an toàn tiếp theo.',
      })
      rerouteEvacuation()
    },
    toggleFireNode(nodeId, currentNodeId) {
      const { activeFireNodeIds, simulationStartNodeId, floors, mapsByFloorId } = get()
      const start = currentNodeId ?? simulationStartNodeId ?? pickDefaultStart(floors, allNodesOf(mapsByFloorId))
      const burning = activeFireNodeIds.includes(nodeId)
      if (!burning && nodeId === start) {
        set({ simulationMessage: 'Không thể đặt lửa tại vị trí bạn đang đứng — chọn node khác.' })
        return
      }
      set({
        emergencyMode: 'FIRE',
        activeFireNodeIds: burning ? activeFireNodeIds.filter((id) => id !== nodeId) : [...activeFireNodeIds, nodeId],
        simulationMessage: burning
          ? 'Đã dập lửa tại node vừa chọn — tính lại tuyến thoát hiểm.'
          : '🔥 Node vừa chọn đang cháy — đã tái định tuyến né điểm cháy.',
      })
      rerouteEvacuation(start)
    },
    setInteractiveFireMode(enabled, currentNodeId) {
      set({ interactiveFireMode: enabled })
      if (enabled && get().emergencyMode !== 'FIRE') {
        set({ emergencyMode: 'FIRE', simulationMessage: 'Chế độ đặt lửa: chạm vào node trên bản đồ để đốt/dập lửa.' })
        rerouteEvacuation(currentNodeId)
      }
    },
    extinguishAllFires() {
      set({ activeFireNodeIds: [], blockedEdgeIds: [], routeWarning: undefined, simulationMessage: '🧯 Đã dập tắt toàn bộ lửa mô phỏng.' })
      if (get().emergencyMode === 'FIRE') rerouteEvacuation()
    },
    resetSimulation() {
      set({ ...INITIAL_SIMULATION, route: undefined, error: undefined })
    },
    async runDemoScenario(scenarioId) {
      if (scenarioId === 'reset') {
        get().resetSimulation()
        return
      }
      const defaultStart = pickDefaultStart(get().floors, allNodesOf(get().mapsByFloorId))
      if (!defaultStart) {
        set({ error: 'Tòa nhà chưa có node điều hướng để chạy demo.' })
        return
      }
      try {
        if (scenarioId.startsWith('fire-') || scenarioId === 'interactive-fire') {
          await runFireScenario(scenarioId as FireScenarioId, defaultStart)
        } else {
          runHappyScenario(scenarioId as HappyScenarioId, defaultStart)
        }
      } finally {
        set({ isDemoRunning: false })
      }
    },
  }
})
