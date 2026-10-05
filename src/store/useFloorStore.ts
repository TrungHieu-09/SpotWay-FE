import { create } from 'zustand'
import {
  createFloor,
  deleteFloor as deleteFloorRequest,
  getFloors,
  saveFloorPois,
  updateFloor,
} from '../api/floors'
import type { Floor, FloorPublishStatus } from '../types/floor'
import type { Poi, PoiType } from '../types/poi'
import { clampPercent } from '../utils/canvasCoordinates'

type NewPoiInput = {
  x: number
  y: number
  type?: PoiType
}

type NewFloorInput = {
  name: string
  level: number
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
  addFloor: (buildingId: string, floor: NewFloorInput) => Promise<void>
  deleteFloor: (floorId: string) => Promise<void>
  updateFloorStatus: (
    floorId: string,
    publishStatus: FloorPublishStatus,
  ) => Promise<void>
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

function sortFloorsByLevel(floors: Floor[]) {
  return [...floors].sort((left, right) => left.level - right.level)
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
      const floors = sortFloorsByLevel(await getFloors(buildingId))
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

  async addFloor(buildingId, floorInput) {
    set({ isFloorLoading: true, error: null })
    try {
      const floor = await createFloor({
        buildingId,
        name: floorInput.name,
        level: floorInput.level,
        planImageUrl: null,
        publishStatus: 'draft',
        mapWidth: get().selectedFloor?.mapWidth ?? 1200,
        mapHeight: get().selectedFloor?.mapHeight ?? 760,
      })
      set((state) => ({
        floors: sortFloorsByLevel([...state.floors, floor]),
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

  async deleteFloor(floorId) {
    const deletingFloor = get().floors.find((floor) => floor.id === floorId)
    if (!deletingFloor || get().floors.length <= 1) {
      return
    }

    set({ isFloorLoading: true, error: null })
    try {
      await deleteFloorRequest(floorId)
      const nextFloors = sortFloorsByLevel(
        get().floors.filter((floor) => floor.id !== floorId),
      )
      const selectedFloor =
        get().selectedFloorId === floorId
          ? nextFloors[0] ?? null
          : get().selectedFloor

      set({
        floors: nextFloors,
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

  async updateFloorStatus(floorId, publishStatus) {
    set({ isFloorLoading: true, error: null })
    try {
      const updatedFloor = await updateFloor(floorId, { publishStatus })
      const floors = sortFloorsByLevel(
        get().floors.map((floor) =>
          floor.id === floorId ? updatedFloor : floor,
        ),
      )
      const selectedFloor =
        get().selectedFloorId === floorId ? updatedFloor : get().selectedFloor

      set({
        floors,
        selectedFloor,
        pois:
          get().selectedFloorId === floorId
            ? updatedFloor.pois
            : get().pois,
      })
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
