import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pushRecent, toggleFavorite } from '../utils/guestLists'

type BuildingLists = { favorites: string[]; recent: string[] }

type GuestMemoryState = {
  byBuilding: Record<string, BuildingLists>
  toggleFavorite: (buildingId: string, destinationId: string) => void
  addRecent: (buildingId: string, destinationId: string) => void
  clearRecent: (buildingId: string) => void
}

const EMPTY: BuildingLists = { favorites: [], recent: [] }

export const useGuestMemoryStore = create<GuestMemoryState>()(
  persist(
    (set) => ({
      byBuilding: {},
      toggleFavorite: (buildingId, destinationId) =>
        set((state) => {
          const current = state.byBuilding[buildingId] ?? EMPTY
          return { byBuilding: { ...state.byBuilding, [buildingId]: { ...current, favorites: toggleFavorite(current.favorites, destinationId) } } }
        }),
      addRecent: (buildingId, destinationId) =>
        set((state) => {
          const current = state.byBuilding[buildingId] ?? EMPTY
          return { byBuilding: { ...state.byBuilding, [buildingId]: { ...current, recent: pushRecent(current.recent, destinationId) } } }
        }),
      clearRecent: (buildingId) =>
        set((state) => {
          const current = state.byBuilding[buildingId] ?? EMPTY
          return { byBuilding: { ...state.byBuilding, [buildingId]: { ...current, recent: [] } } }
        }),
    }),
    { name: 'spotway.guest.memory' },
  ),
)

export function selectBuildingLists(state: GuestMemoryState, buildingId: string): BuildingLists {
  return state.byBuilding[buildingId] ?? EMPTY
}
