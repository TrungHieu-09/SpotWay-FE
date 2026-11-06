import { create } from 'zustand'
import { getBuildings } from '../api/buildings'
import { getFloors } from '../api/floors'
import {
  getBuildingDestinations,
  getFloorGeometry,
  getRoute,
} from '../api/geometry'
import { graphGateway, poiGateway } from '../api/graphGateway'
import { getStoresByFloor } from '../api/stores'
import type { Building } from '../types/building'
import type { Floor } from '../types/floor'
import type { FloorGeometry } from '../types/geometry'
import type { GraphNode } from '../types/graph'
import type { Poi } from '../types/poi'
import type { Destination, RouteResult } from '../types/route'
import type { Store } from '../types/store'

type GuestMapState = {
  buildings: Building[]
  floors: Floor[]
  geometriesByFloorId: Record<string, FloorGeometry>
  nodesByFloorId: Record<string, GraphNode[]>
  poisByFloorId: Record<string, Poi[]>
  storesByFloorId: Record<string, Store[]>
  destinations: Destination[]
  selectedBuildingId?: string
  selectedFloorId?: string
  fromNodeId?: string
  toNodeId?: string
  route: RouteResult | null
  isLoading: boolean
  isRouteLoading: boolean
  error: string | null
  loadInitialData: () => Promise<void>
  refreshCurrentBuilding: () => Promise<void>
  selectBuilding: (buildingId: string) => Promise<void>
  selectFloor: (floorId: string) => Promise<void>
  setFromNodeId: (nodeId: string | undefined) => void
  setToNodeId: (nodeId: string | undefined) => void
  findRoute: () => Promise<void>
  clearRoute: () => void
}

function sortFloors(floors: Floor[]) {
  return [...floors].sort((left, right) => left.level - right.level)
}

function pickDefaultFromNode(destinations: Destination[]) {
  return (
    destinations.find((destination) => destination.type === 'entrance') ??
    destinations[0]
  )?.nodeId
}

async function loadBuildingBundle(buildingId: string) {
  const floors = sortFloors(await getFloors(buildingId))
  const destinations = await getBuildingDestinations(buildingId)
  const geometries = await Promise.all(
    floors.map((floor) => getFloorGeometry(floor.id).catch(() => null)),
  )
  const stores = await Promise.all(
    floors.map((floor) => getStoresByFloor(floor.id).catch(() => [])),
  )
  const graphs = await Promise.all(
    floors.map((floor) =>
      graphGateway
        .fetchGraph(floor.id, { width: floor.mapWidth, height: floor.mapHeight })
        .catch(() => ({ nodes: [] as GraphNode[], edges: [] })),
    ),
  )
  const pois = await Promise.all(
    floors.map((floor) =>
      poiGateway
        .fetchPois(floor.id, { width: floor.mapWidth, height: floor.mapHeight })
        .catch(() => [] as Poi[]),
    ),
  )
  const geometriesByFloorId = Object.fromEntries(
    geometries
      .filter((geometry): geometry is FloorGeometry => Boolean(geometry))
      .map((geometry) => [geometry.floorId, geometry]),
  )
  const storesByFloorId = Object.fromEntries(
    floors.map((floor, index) => [floor.id, stores[index]]),
  )
  const nodesByFloorId = Object.fromEntries(
    floors.map((floor, index) => [floor.id, graphs[index].nodes]),
  )
  const poisByFloorId = Object.fromEntries(
    floors.map((floor, index) => [floor.id, pois[index]]),
  )

  return {
    floors,
    destinations,
    geometriesByFloorId,
    storesByFloorId,
    nodesByFloorId,
    poisByFloorId,
  }
}

export const useGuestMapStore = create<GuestMapState>((set, get) => ({
  buildings: [],
  floors: [],
  geometriesByFloorId: {},
  nodesByFloorId: {},
  poisByFloorId: {},
  storesByFloorId: {},
  destinations: [],
  route: null,
  isLoading: false,
  isRouteLoading: false,
  error: null,

  async loadInitialData() {
    set({ isLoading: true, error: null })
    try {
      const buildings = await getBuildings()
      const defaultBuilding = buildings[0]

      if (!defaultBuilding) {
        set({ buildings, floors: [], destinations: [], isLoading: false })
        return
      }

      const bundle = await loadBuildingBundle(defaultBuilding.id)
      set({
        buildings,
        ...bundle,
        selectedBuildingId: defaultBuilding.id,
        selectedFloorId: bundle.floors[0]?.id,
        fromNodeId: pickDefaultFromNode(bundle.destinations),
        toNodeId: bundle.destinations.find(
          (destination) => destination.nodeId !== pickDefaultFromNode(bundle.destinations),
        )?.nodeId,
        route: null,
        isLoading: false,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  async refreshCurrentBuilding() {
    const selectedBuildingId = get().selectedBuildingId
    set({ isLoading: true, error: null, route: null })
    try {
      const buildings = await getBuildings()
      const nextBuilding =
        buildings.find((building) => building.id === selectedBuildingId) ??
        buildings[0]

      if (!nextBuilding) {
        set({
          buildings,
          floors: [],
          destinations: [],
          selectedBuildingId: undefined,
          selectedFloorId: undefined,
          isLoading: false,
        })
        return
      }

      const bundle = await loadBuildingBundle(nextBuilding.id)
      const fromNodeId = pickDefaultFromNode(bundle.destinations)
      set({
        buildings,
        ...bundle,
        selectedBuildingId: nextBuilding.id,
        selectedFloorId:
          bundle.floors.find((floor) => floor.id === get().selectedFloorId)
            ?.id ?? bundle.floors[0]?.id,
        fromNodeId,
        toNodeId: bundle.destinations.find(
          (destination) => destination.nodeId !== fromNodeId,
        )?.nodeId,
        isLoading: false,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  async selectBuilding(buildingId) {
    set({ isLoading: true, error: null, route: null })
    try {
      const bundle = await loadBuildingBundle(buildingId)
      const fromNodeId = pickDefaultFromNode(bundle.destinations)
      set({
        ...bundle,
        selectedBuildingId: buildingId,
        selectedFloorId: bundle.floors[0]?.id,
        fromNodeId,
        toNodeId: bundle.destinations.find(
          (destination) => destination.nodeId !== fromNodeId,
        )?.nodeId,
        isLoading: false,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  async selectFloor(floorId) {
    const cachedGeometry = get().geometriesByFloorId[floorId]
    set({ selectedFloorId: floorId })

    if (cachedGeometry) {
      return
    }

    try {
      const geometry = await getFloorGeometry(floorId)
      set((state) => ({
        geometriesByFloorId: {
          ...state.geometriesByFloorId,
          [floorId]: geometry,
        },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  setFromNodeId(nodeId) {
    set({ fromNodeId: nodeId })
  },

  setToNodeId(nodeId) {
    set({ toNodeId: nodeId })
  },

  async findRoute() {
    const { selectedBuildingId, fromNodeId, toNodeId } = get()
    if (!selectedBuildingId || !fromNodeId || !toNodeId) {
      set({ error: 'Chọn điểm bắt đầu và điểm đến trước khi tìm đường.' })
      return
    }

    set({ isRouteLoading: true, error: null })
    try {
      const route = await getRoute(selectedBuildingId, fromNodeId, toNodeId)
      set({
        route,
        selectedFloorId: route.segments[0]?.floorId ?? get().selectedFloorId,
        isRouteLoading: false,
      })
    } catch (error) {
      set({ error: (error as Error).message, route: null, isRouteLoading: false })
    }
  },

  clearRoute() {
    set({ route: null, error: null })
  },
}))
