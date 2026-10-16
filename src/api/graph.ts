import { apiClient } from './client'

export type GraphNodeType = 'NORMAL' | 'DOOR' | 'ELEVATOR' | 'STAIR' | 'ESCALATOR' | 'JUNCTION'

export type GraphNode = {
  id: string
  floorId: string
  x: number
  y: number
  name: string | null
  type: GraphNodeType
  accessible: boolean
}

export type GraphEdge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  weight: number
  accessible: boolean
  status: 'ACTIVE' | 'BLOCKED'
}

export async function getGraph(floorId: string) {
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    apiClient.get<GraphNode[]>(`/floors/${floorId}/nodes`),
    apiClient.get<GraphEdge[]>(`/floors/${floorId}/edges`),
  ])
  return { nodes, edges }
}

export async function createGraphNode(floorId: string, input: Omit<GraphNode, 'id' | 'floorId'>) {
  const { data } = await apiClient.post<GraphNode>(`/floors/${floorId}/nodes`, input)
  return data
}

export async function createGraphEdge(floorId: string, fromNodeId: string, toNodeId: string) {
  const { data } = await apiClient.post<GraphEdge>(`/floors/${floorId}/edges`, { fromNodeId, toNodeId })
  return data
}

export async function deleteGraphNode(nodeId: string) {
  await apiClient.delete(`/nodes/${nodeId}`)
}

export async function deleteGraphEdge(edgeId: string) {
  await apiClient.delete(`/edges/${edgeId}`)
}
