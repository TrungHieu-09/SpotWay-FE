import { create } from 'zustand'
import { getFloorGeometry } from '../api/geometry'
import type { FloorGeometry } from '../types/geometry'

type GeometryState = {
  geometriesByFloorId: Record<string, FloorGeometry>
  isLoading: boolean
  error: string | null
  loadGeometriesByFloors: (floorIds: string[]) => Promise<void>
}

export const useGeometryStore = create<GeometryState>((set, get) => ({
  geometriesByFloorId: {},
  isLoading: false,
  error: null,

  async loadGeometriesByFloors(floorIds) {
    const missingFloorIds = floorIds.filter(
      (floorId) => !get().geometriesByFloorId[floorId],
    )

    if (missingFloorIds.length === 0) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const geometryEntries = await Promise.all(
        missingFloorIds.map(async (floorId) => [
          floorId,
          await getFloorGeometry(floorId),
        ] as const),
      )

      set((state) => ({
        geometriesByFloorId: {
          ...state.geometriesByFloorId,
          ...Object.fromEntries(geometryEntries),
        },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },
}))
