import { create } from 'zustand'
import { createFloor, getFloors, saveFloorPois } from '../api/floors'
import type { Floor } from '../types/floor'
import type { Poi, PoiType } from '../types/poi'
import { clampPercent } from '../utils/canvasCoordinates'

type NewPoiInput = {
  x: number
  y: number
  type?: PoiType
}

type FloorState = {
  floors: Floor[]
  selectedFloorId?: string
  selectedFloor: Floor | null
  pois: Poi[]
  isFloorLoading: boolean
  isPoiSaving: boolean
  error: string | null
  loadFloors: (buildingId: string) => Promise<void>
  selectFloor: (floorId?: string) => void
  addFloor: (buildingId: string) => Promise<void>
  addPoi: (poi: NewPoiInput) => Promise<void>
  movePoi: (
    poiId: string,
    position: Pick<Poi, 'x' | 'y'>,
  ) => Promise<void>
  removePoi: (poiId: string) => Promise<void>
}

function syncFloorPois(floors: Floor[], floorId: string, pois: Poi[]) {
  return floors.map((floor) =>
    floor.id === floorId ? { ...floor, pois } : floor,
  )
}

export const useFloorStore = create<FloorState>((set, get) => ({
  floors: [],
  selectedFloorId: undefined,
  selectedFloor: null,
  pois: [],
  isFloorLoading: false,
  isPoiSaving: false,
  error: null,

  async loadFloors(buildingId) {
    set({ isFloorLoading: true, error: null })
    try {
      const floors = await getFloors(buildingId)
      const selectedFloor = floors[0] ?? null
      set({
        floors,
        selectedFloor,
        selectedFloorId: selectedFloor?.id,
        pois: selectedFloor?.pois ?? [],
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isFloorLoading: false })
    }
  },

  selectFloor(floorId) {
    const selectedFloor =
      get().floors.find((floor) => floor.id === floorId) ?? null
    set({
      selectedFloor,
      selectedFloorId: selectedFloor?.id,
      pois: selectedFloor?.pois ?? [],
    })
  },

  async addFloor(buildingId) {
    const nextLevel = get().floors.length + 1
    set({ isFloorLoading: true, error: null })
    try {
      const floor = await createFloor({
        buildingId,
        name: nextLevel === 1 ? 'Ground Floor' : `Level ${nextLevel}`,
        level: nextLevel,
        mapImageUrl: get().selectedFloor?.mapImageUrl,
        mapWidth: get().selectedFloor?.mapWidth,
        mapHeight: get().selectedFloor?.mapHeight,
      })
      set((state) => ({
        floors: [...state.floors, floor],
        selectedFloor: floor,
        selectedFloorId: floor.id,
        pois: [],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isFloorLoading: false })
    }
  },

  async addPoi(poi) {
    const selectedFloor = get().selectedFloor
    if (!selectedFloor) {
      return
    }

    const nextPois: Poi[] = [
      ...get().pois,
      {
        id: `poi-${crypto.randomUUID()}`,
        floorId: selectedFloor.id,
        name: `POI ${get().pois.length + 1}`,
        type: poi.type ?? 'custom',
        x: clampPercent(poi.x),
        y: clampPercent(poi.y),
      },
    ]

    set({
      pois: nextPois,
      floors: syncFloorPois(get().floors, selectedFloor.id, nextPois),
      selectedFloor: { ...selectedFloor, pois: nextPois },
      isPoiSaving: true,
      error: null,
    })

    try {
      const savedPois = await saveFloorPois(selectedFloor.id, nextPois)
      set({
        pois: savedPois,
        floors: syncFloorPois(get().floors, selectedFloor.id, savedPois),
        selectedFloor: { ...selectedFloor, pois: savedPois },
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isPoiSaving: false })
    }
  },

  async movePoi(poiId, position) {
    const selectedFloor = get().selectedFloor
    if (!selectedFloor) {
      return
    }

    const nextPois = get().pois.map((poi) =>
      poi.id === poiId
        ? {
            ...poi,
            x: clampPercent(position.x),
            y: clampPercent(position.y),
          }
        : poi,
    )

    set({
      pois: nextPois,
      floors: syncFloorPois(get().floors, selectedFloor.id, nextPois),
      selectedFloor: { ...selectedFloor, pois: nextPois },
      isPoiSaving: true,
      error: null,
    })

    try {
      const savedPois = await saveFloorPois(selectedFloor.id, nextPois)
      set({
        pois: savedPois,
        floors: syncFloorPois(get().floors, selectedFloor.id, savedPois),
        selectedFloor: { ...selectedFloor, pois: savedPois },
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isPoiSaving: false })
    }
  },

  async removePoi(poiId) {
    const selectedFloor = get().selectedFloor
    if (!selectedFloor) {
      return
    }

    const nextPois = get().pois.filter((poi) => poi.id !== poiId)
    set({
      pois: nextPois,
      floors: syncFloorPois(get().floors, selectedFloor.id, nextPois),
      selectedFloor: { ...selectedFloor, pois: nextPois },
      isPoiSaving: true,
      error: null,
    })

    try {
      const savedPois = await saveFloorPois(selectedFloor.id, nextPois)
      set({
        pois: savedPois,
        floors: syncFloorPois(get().floors, selectedFloor.id, savedPois),
        selectedFloor: { ...selectedFloor, pois: savedPois },
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isPoiSaving: false })
    }
  },
}))
