import { create } from 'zustand'
import { graphGateway } from '../api/graphGateway'
import { createGraphSlice } from './createGraphStore'

export type { GraphState } from './createGraphStore'

export const useGraphStore = create(createGraphSlice(graphGateway))
