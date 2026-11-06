import { create } from 'zustand'
import { poiGateway } from '../api/graphGateway'
import { createPoiSlice } from './createPoiStore'
import { useGraphStore } from './useGraphStore'

export type { PoiState } from './createPoiStore'

export const usePoiStore = create(
  createPoiSlice(poiGateway, (floorId) => useGraphStore.getState().nodesByFloor[floorId] ?? []),
)
