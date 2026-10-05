import { apiClient } from './client'
import type { Node, UpdateNodePayload } from '../types/node'

export async function getNodesByFloor(floorId: string) {
  const { data } = await apiClient.get<Node[]>(`/floors/${floorId}/nodes`)
  return data
}

export async function updateNode(nodeId: string, payload: UpdateNodePayload) {
  const { data } = await apiClient.patch<Node>(`/nodes/${nodeId}`, payload)
  return data
}
