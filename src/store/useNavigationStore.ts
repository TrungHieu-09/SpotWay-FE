import { create } from 'zustand'
import {
  createPublicRoute,
  getPublicFloorMap,
  getPublicFloors,
  searchPublicDestinations,
} from '../api/publicNavigation'
import type { IndoorRoute, PublicFloor, PublicFloorMap, PublicSearchResult } from '../types/navigation'

type NavigationState = {
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

export const useNavigationStore = create<NavigationState>((set, get) => ({
  floors: [],
  mapsByFloorId: {},
  destinations: [],
  isLoading: false,
  isRouting: false,
  async load(buildingId) {
    set({ isLoading: true, error: undefined, route: undefined })
    try {
      const floors = await getPublicFloors(buildingId)
      const maps = await Promise.all(floors.map((floor) => getPublicFloorMap(floor.id)))
      const destinations = await searchPublicDestinations(buildingId)
      set({
        buildingId,
        floors,
        mapsByFloorId: Object.fromEntries(maps.map((map) => [map.floor.id, map])),
        destinations,
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
      set({ route })
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
    set({ route: undefined })
  },
}))
