import { create } from 'zustand'
import {
  createFloor,
  deleteFloor as deleteFloorRequest,
  getFloors,
  updateFloor,
} from '../api/floors'
import type { Floor, FloorPublishStatus } from '../types/floor'

type NewFloorInput = {
  name: string
  level: number
}

type FloorState = {
  floors: Floor[]
  selectedFloorId?: string
  selectedFloor: Floor | null
  isFloorLoading: boolean
  error: string | null
  loadFloors: (buildingId: string) => Promise<void>
  selectFloor: (floorId?: string) => void
  addFloor: (buildingId: string, floor: NewFloorInput) => Promise<void>
  deleteFloor: (floorId: string) => Promise<void>
  updateFloorStatus: (
    floorId: string,
    publishStatus: FloorPublishStatus,
  ) => Promise<void>
}

function sortFloorsByLevel(floors: Floor[]) {
  return [...floors].sort((left, right) => left.level - right.level)
}

export const useFloorStore = create<FloorState>((set, get) => ({
  floors: [],
  selectedFloorId: undefined,
  selectedFloor: null,
  isFloorLoading: false,
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
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isFloorLoading: false })
    }
  },
}))
