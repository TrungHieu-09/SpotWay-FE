import { create } from 'zustand'
import {
  getFloorGeometry,
  recognizeFloorGeometry,
  saveFloorGeometry,
} from '../api/geometry'
import type { FloorGeometry } from '../types/geometry'

type GeometryState = {
  geometriesByFloorId: Record<string, FloorGeometry>
  isLoading: boolean
  isRecognizing: boolean
  isSaving: boolean
  error: string | null
  loadGeometriesByFloors: (floorIds: string[]) => Promise<void>
  recognizeGeometry: (floorId: string) => Promise<FloorGeometry>
  saveGeometry: (
    floorId: string,
    geometry: FloorGeometry,
  ) => Promise<FloorGeometry>
  setGeometry: (floorId: string, geometry: FloorGeometry) => void
}

export const useGeometryStore = create<GeometryState>((set, get) => ({
  geometriesByFloorId: {},
  isLoading: false,
  isRecognizing: false,
  isSaving: false,
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

  async recognizeGeometry(floorId) {
    set({ isRecognizing: true, error: null })
    try {
      const geometry = await recognizeFloorGeometry(floorId)
      set((state) => ({
        geometriesByFloorId: {
          ...state.geometriesByFloorId,
          [floorId]: geometry,
        },
      }))
      return geometry
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isRecognizing: false })
    }
  },

  async saveGeometry(floorId, geometry) {
    set({ isSaving: true, error: null })
    try {
      const savedGeometry = await saveFloorGeometry(floorId, geometry)
      set((state) => ({
        geometriesByFloorId: {
          ...state.geometriesByFloorId,
          [floorId]: savedGeometry,
        },
      }))
      return savedGeometry
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  setGeometry(floorId, geometry) {
    set((state) => ({
      geometriesByFloorId: {
        ...state.geometriesByFloorId,
        [floorId]: geometry,
      },
    }))
  },
}))
