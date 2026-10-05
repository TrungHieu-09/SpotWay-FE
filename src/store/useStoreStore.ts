import { create } from 'zustand'
import {
  getStore,
  getStoresByFloor,
  getStoresByOwner,
  updateStore as updateStoreRequest,
} from '../api/stores'
import type { Store, UpdateStorePayload } from '../types/store'

type StoreState = {
  storesByFloorId: Record<string, Store[]>
  ownerStores: Store[]
  currentStore: Store | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  loadStoresByFloor: (floorId: string) => Promise<void>
  loadStoresByOwner: (ownerId: string) => Promise<void>
  loadCurrentStore: (storeId?: string) => Promise<void>
  updateStore: (
    storeId: string,
    payload: UpdateStorePayload,
  ) => Promise<Store>
}

const DEFAULT_STORE_ID = 'store-1'

export const useStoreStore = create<StoreState>((set) => ({
  storesByFloorId: {},
  ownerStores: [],
  currentStore: null,
  isLoading: false,
  isSaving: false,
  error: null,

  async loadStoresByFloor(floorId) {
    set({ isLoading: true, error: null })
    try {
      const stores = await getStoresByFloor(floorId)
      set((state) => ({
        storesByFloorId: {
          ...state.storesByFloorId,
          [floorId]: stores,
        },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async loadStoresByOwner(ownerId) {
    set({ isLoading: true, error: null })
    try {
      const stores = await getStoresByOwner(ownerId)
      set({
        ownerStores: stores,
        currentStore: stores[0] ?? null,
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async loadCurrentStore(storeId = DEFAULT_STORE_ID) {
    set({ isLoading: true, error: null, currentStore: null })
    try {
      const store = await getStore(storeId)
      set({ currentStore: store })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async updateStore(storeId, payload) {
    set({ isSaving: true, error: null })
    try {
      const store = await updateStoreRequest(storeId, payload)
      set((state) => ({
        currentStore:
          state.currentStore?.id === store.id ? store : state.currentStore,
        ownerStores: state.ownerStores.map((item) =>
          item.id === store.id ? store : item,
        ),
        storesByFloorId: {
          ...state.storesByFloorId,
          [store.floorId]: (state.storesByFloorId[store.floorId] ?? []).map(
            (item) => (item.id === store.id ? store : item),
          ),
        },
      }))
      return store
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },
}))
