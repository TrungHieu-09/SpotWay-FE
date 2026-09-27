import { create } from 'zustand'
import {
  createBuilding as createBuildingRequest,
  getBuildings,
} from '../api/buildings'
import type { Building, CreateBuildingPayload } from '../types/building'

type BuildingState = {
  buildings: Building[]
  isLoading: boolean
  error: string | null
  loadBuildings: () => Promise<void>
  createBuilding: (payload: CreateBuildingPayload) => Promise<Building>
}

export const useBuildingStore = create<BuildingState>((set) => ({
  buildings: [],
  isLoading: false,
  error: null,

  async loadBuildings() {
    set({ isLoading: true, error: null })
    try {
      const buildings = await getBuildings()
      set({ buildings })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async createBuilding(payload) {
    const building = await createBuildingRequest(payload)
    set((state) => ({ buildings: [building, ...state.buildings] }))
    return building
  },
}))

