import type { StateCreator } from 'zustand/vanilla'
import type {
  IndoorRoute,
  PublicFloor,
  PublicFloorMap,
  PublicSearchResult,
  VerticalLink,
} from '../types/navigation.ts'
import { floorLevelsOf } from '../utils/navigationHelpers.ts'
import { inferVerticalLinks } from '../utils/indoorPathfinding.ts'
import { createRouteEngine } from './navigationRouteEngine.ts'
import { INITIAL_SIMULATION, type NavigationDataState, type NavigationState } from './navigationState.ts'

export type RouteRequestInput = {
  fromNodeId: string
  toStoreId: string
  wheelchairMode: boolean
  mode?: 'NORMAL' | 'EVACUATION'
  hazardNodeIds?: string[]
}

/** Cổng ra ngoài của store; test thay bằng bản giả, app dùng `api/*`. */
export type NavigationGateway = {
  getFloors: (buildingId: string) => Promise<PublicFloor[]>
  getFloorMap: (floorId: string) => Promise<PublicFloorMap>
  searchDestinations: (buildingId: string, query?: string) => Promise<PublicSearchResult[]>
  /** Vertical link khai báo sẵn của toà nhà; không bắt buộc. */
  getVerticalLinks: (buildingId: string) => Promise<VerticalLink[]>
  createRoute: (input: RouteRequestInput) => Promise<IndoorRoute>
}

export function createNavigationDataSlice(
  gateway: NavigationGateway,
): StateCreator<NavigationState, [], [], NavigationDataState> {
  return (set, get) => {
    const { applyRoute, exitName } = createRouteEngine(set, get)

    return {
      floors: [],
      mapsByFloorId: {},
      destinations: [],
      verticalLinks: [],
      isLoading: false,
      isRouting: false,

      async load(buildingId) {
        set({ isLoading: true, error: undefined, route: undefined, ...INITIAL_SIMULATION })
        try {
          const floors = await gateway.getFloors(buildingId)
          const maps = await Promise.all(floors.map((floor) => gateway.getFloorMap(floor.id)))
          const destinations = await gateway.searchDestinations(buildingId)
          // Vertical link không bắt buộc: thiếu overview vẫn suy luận được từ các node thang cùng loại
          const explicitLinks = await gateway.getVerticalLinks(buildingId).catch((): VerticalLink[] => [])
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
        set({ destinations: await gateway.searchDestinations(buildingId, query) })
      },

      async findRoute(input) {
        set({ isRouting: true, error: undefined })
        try {
          const { emergencyMode, activeFireNodeIds } = get()
          const evacuation = emergencyMode === 'FIRE'
          try {
            const route = await gateway.createRoute({
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
          set({ error: error instanceof Error ? error.message : 'Không thể tìm tuyến đường.' })
          throw error
        } finally {
          set({ isRouting: false })
        }
      },

      clearRoute() {
        set({ route: undefined, routeTargetName: undefined, routeWarning: undefined, routeSource: undefined })
      },
    }
  }
}
