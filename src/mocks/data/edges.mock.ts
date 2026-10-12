import type { Edge } from '../../types/node'
import { loadFromStorage, MOCK_STORAGE_KEYS, saveToStorage } from '../persist'

export const initialEdgesSeed: Edge[] = [
  {
    id: 'edge-gf-entrance-lumi',
    floorId: 'floor-1',
    fromNodeId: 'node-gf-entrance',
    toNodeId: 'node-gf-lumi',
  },
  {
    id: 'edge-gf-lumi-atrium',
    floorId: 'floor-1',
    fromNodeId: 'node-gf-lumi',
    toNodeId: 'node-gf-atrium',
  },
  {
    id: 'edge-gf-atrium-elevator',
    floorId: 'floor-1',
    fromNodeId: 'node-gf-atrium',
    toNodeId: 'node-12',
  },
  {
    id: 'edge-gf-elevator-bep',
    floorId: 'floor-1',
    fromNodeId: 'node-12',
    toNodeId: 'node-gf-bep',
  },
  {
    id: 'edge-gf-atrium-toilet',
    floorId: 'floor-1',
    fromNodeId: 'node-gf-atrium',
    toNodeId: 'node-gf-toilet',
  },
  {
    id: 'edge-gf-bep-exit',
    floorId: 'floor-1',
    fromNodeId: 'node-gf-bep',
    toNodeId: 'node-gf-exit',
  },
  {
    id: 'edge-l2-green-elevator',
    floorId: 'floor-2',
    fromNodeId: 'node-l2-green',
    toNodeId: 'node-45',
  },
  {
    id: 'edge-l2-elevator-kids',
    floorId: 'floor-2',
    fromNodeId: 'node-45',
    toNodeId: 'node-l2-kids',
  },
  {
    id: 'edge-l2-elevator-service',
    floorId: 'floor-2',
    fromNodeId: 'node-45',
    toNodeId: 'node-l2-service',
  },
  {
    id: 'edge-l2-green-toilet',
    floorId: 'floor-2',
    fromNodeId: 'node-l2-green',
    toNodeId: 'node-l2-toilet',
  },
  {
    id: 'edge-l3-cinema-elevator',
    floorId: 'floor-3',
    fromNodeId: 'node-l3-cinema',
    toNodeId: 'node-78',
  },
  {
    id: 'edge-l3-elevator-food',
    floorId: 'floor-3',
    fromNodeId: 'node-78',
    toNodeId: 'node-l3-food',
  },
  {
    id: 'edge-l3-cinema-games',
    floorId: 'floor-3',
    fromNodeId: 'node-l3-cinema',
    toNodeId: 'node-l3-games',
  },
  {
    id: 'edge-l3-games-toilet',
    floorId: 'floor-3',
    fromNodeId: 'node-l3-games',
    toNodeId: 'node-l3-toilet',
  },
]

export const edges = loadFromStorage<Edge[]>(
  MOCK_STORAGE_KEYS.edges,
  initialEdgesSeed,
).map((edge) => ({
  ...edge,
  accessible: edge.accessible ?? true,
}))

saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
