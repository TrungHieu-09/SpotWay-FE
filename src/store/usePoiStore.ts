import { create } from 'zustand'
import {
  createPoi as createPoiRequest,
  deleteAllPois,
  deletePoi,
  getPois,
  updatePoi,
} from '../api/pois'
import type { Floor } from '../types/floor'
import type { NewPoiInput, Poi, PoiPatch } from '../types/poi'
import { useFloorStore } from './useFloorStore'

type PoiState = {
  poisByFloorId: Record<string, Poi[]>
  isLoading: boolean
  isSaving: boolean
  error: string | null
  loadPois: (floor: Floor) => Promise<void>
  createPoi: (floor: Floor, input: NewPoiInput) => Promise<Poi>
  updatePoi: (floor: Floor, poiId: string, patch: PoiPatch) => Promise<void>
  removePoi: (floor: Floor, poiId: string) => Promise<void>
  clearPois: (floor: Floor) => Promise<void>
}

export const usePoiStore = create<PoiState>((set, get) => {
  const write = (floorId: string, pois: Poi[]) => {
    set((state) => ({ poisByFloorId: { ...state.poisByFloorId, [floorId]: pois } }))
    useFloorStore.getState().setFloorPois(floorId, pois)
  }
  const current = (floorId: string) => get().poisByFloorId[floorId] ?? []
  async function run<T>(task: () => Promise<T>) {
    set({ isSaving: true, error: null })
    try {
      return await task()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  }

  return {
    poisByFloorId: {},
    isLoading: false,
    isSaving: false,
    error: null,

    async loadPois(floor) {
      set({ isLoading: true, error: null })
      try {
        write(floor.id, await getPois(floor.id, floor))
      } catch (error) {
        set({ error: (error as Error).message })
        throw error
      } finally {
        set({ isLoading: false })
      }
    },

    async createPoi(floor, input) {
      return run(async () => {
        const poi = await createPoiRequest(floor.id, floor, input)
        write(floor.id, [...current(floor.id), poi])
        return poi
      })
    },

    async updatePoi(floor, poiId, patch) {
      const previous = current(floor.id)
      // Optimistic: kéo thả không chờ BE; lỗi thì hoàn tác.
      write(floor.id, previous.map((poi) => (poi.id === poiId ? { ...poi, ...patch } : poi)))
      try {
        const saved = await run(() => updatePoi(poiId, floor, patch))
        if (saved) write(floor.id, current(floor.id).map((poi) => (poi.id === poiId ? { ...poi, ...saved } : poi)))
      } catch (error) {
        write(floor.id, previous)
        throw error
      }
    },

    async removePoi(floor, poiId) {
      await run(() => deletePoi(poiId))
      write(floor.id, current(floor.id).filter((poi) => poi.id !== poiId))
    },

    async clearPois(floor) {
      await run(() => deleteAllPois(floor.id))
      write(floor.id, [])
    },
  }
})
