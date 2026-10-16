import { apiClient } from './client'
import type {
  CreateEdgePayload,
  CreateNodePayload,
  Edge,
  NavigationGraph,
  Node,
  UpdateNodePayload,
  UpdateEdgePayload,
} from '../types/node'

export async function getNodesByFloor(floorId: string) {
  const { data } = await apiClient.get<Node[]>(`/floors/${floorId}/nodes`)
  return data
}

export async function getEdgesByFloor(floorId: string) {
  const { data } = await apiClient.get<Edge[]>(`/floors/${floorId}/edges`)
  return data
}

export async function updateNode(nodeId: string, payload: UpdateNodePayload) {
  const { data } = await apiClient.patch<Node>(`/nodes/${nodeId}`, payload)
  return data
}

export async function createNode(floorId: string, payload: CreateNodePayload) {
  const { data } = await apiClient.post<Node>(`/floors/${floorId}/nodes`, payload)
  return data
}

export async function createEdge(payload: CreateEdgePayload) {
  const { data } = await apiClient.post<Edge>('/edges', payload)
  return data
}

export async function updateEdge(edgeId: string, payload: UpdateEdgePayload) {
  const { data } = await apiClient.patch<Edge>(`/edges/${edgeId}`, payload)
  return data
}

export async function deleteNode(nodeId: string) {
  await apiClient.delete(`/nodes/${nodeId}`)
}

export async function deleteEdge(edgeId: string) {
  await apiClient.delete(`/edges/${edgeId}`)
}

export async function generateNavigationGraph(floorId: string) {
  const { data } = await apiClient.post<NavigationGraph>(
    `/floors/${floorId}/navigation-graph`,
  )
  return data
}
