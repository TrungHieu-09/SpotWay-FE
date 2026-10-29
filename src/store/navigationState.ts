import type {
  IndoorRoute,
  PublicFloor,
  PublicFloorMap,
  PublicSearchResult,
  VerticalLink,
  VerticalLinkDirection,
  VerticalLinkKind,
} from '../types/navigation.ts'

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

export type RouteRequest = {
  targetName?: string
  wheelchairMode?: boolean
  allowedTransitions?: ReadonlySet<VerticalLinkKind>
  defaultEscalatorDirection?: VerticalLinkDirection
}

/** Dữ liệu bản đồ + tìm đường thật (API, có fallback offline). */
export type NavigationDataState = {
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
  load: (buildingId: string) => Promise<void>
  search: (query: string) => Promise<void>
  findRoute: (input: { fromNodeId: string; toStoreId: string; wheelchairMode: boolean }) => Promise<IndoorRoute | undefined>
  clearRoute: () => void
}

/** Mô phỏng demo/cháy: đổi trạng thái hazard rồi nhờ route engine tính lại tuyến. */
export type NavigationSimulationState = {
  emergencyMode: 'NONE' | 'FIRE'
  activeFireNodeIds: string[]
  blockedEdgeIds: string[]
  isDemoRunning: boolean
  activeScenarioId?: DemoScenarioId
  simulationStartNodeId?: string
  simulationWheelchairMode: boolean
  simulationMessage?: string
  interactiveFireMode: boolean
  triggerFireAlarm: (initialFireNodeId?: string, currentNodeId?: string) => void
  blockExitWithFire: (exitNodeId: string) => void
  toggleFireNode: (nodeId: string, currentNodeId?: string) => void
  setInteractiveFireMode: (enabled: boolean, currentNodeId?: string) => void
  extinguishAllFires: () => void
  resetSimulation: () => void
  runDemoScenario: (scenarioId: DemoScenarioId) => Promise<void>
}

export type NavigationState = NavigationDataState & NavigationSimulationState

/** Trạng thái mô phỏng + kết quả tuyến mà load/reset/startScenario đưa về ban đầu. */
export const INITIAL_SIMULATION = {
  emergencyMode: 'NONE' as const,
  activeFireNodeIds: [] as string[],
  blockedEdgeIds: [] as string[],
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
