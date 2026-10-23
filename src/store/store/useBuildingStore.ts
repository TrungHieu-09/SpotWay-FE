import { create } from 'zustand'
import {
  createBuilding as createBuildingRequest,
  getBuildings,
} from '../api/buildings'
import type { Building, CreateBuildingPayload } from '../types/building'
import { deleteBuilding as deleteBuildingRequest, updateBuilding as updateBuildingRequest } from '../api/buildings'

type BuildingState = {
  buildings: Building[]
  isLoading: boolean
  error: string | null
  loadBuildings: () => Promise<void>
  createBuilding: (payload: CreateBuildingPayload) => Promise<Building>
  updateBuilding: (buildingId: string, payload: Partial<Pick<Building, 'name' | 'address' | 'status'>>) => Promise<Building>
  deleteBuilding: (buildingId: string) => Promise<void>
  getBuildingById: (buildingId: string) => Building | undefined
}

export const useBuildingStore = create<BuildingState>((set, get) => ({
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

  async updateBuilding(buildingId, payload) {
    const building = await updateBuildingRequest(buildingId, payload)
    set((state) => ({ buildings: state.buildings.map((item) => item.id === buildingId ? building : item) }))
    return building
  },

  async deleteBuilding(buildingId) {
    await deleteBuildingRequest(buildingId)
    set((state) => ({ buildings: state.buildings.filter((item) => item.id !== buildingId) }))
  },

  getBuildingById(buildingId) {
    return get().buildings.find((building) => building.id === buildingId)
  },
}))

