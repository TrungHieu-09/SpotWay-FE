import { apiClient } from './client'

export type GraphNodeType =
  | 'NORMAL'
  | 'DOOR'
  | 'ELEVATOR'
  | 'STAIR'
  | 'ESCALATOR'
  | 'JUNCTION'
  | 'EXIT'
  | 'EMERGENCY_EXIT'

export type NodeHazardType = 'NONE' | 'FIRE' | 'SMOKE' | 'BLOCKED'

export type GraphNode = {
  id: string
  floorId: string
  x: number
  y: number
  name: string | null
  type: GraphNodeType
  accessible: boolean
  hazard?: NodeHazardType
}

export type GraphEdge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  weight: number
  accessible: boolean
  status: 'ACTIVE' | 'BLOCKED'
  hazard?: NodeHazardType
}
export type NavigationDraftNode = Omit<GraphNode, 'floorId'> & { confidence: number; requiresConfirmation: boolean; source?: string }
export type NavigationDraftEdge = { id: string; fromNodeId: string; toNodeId: string; accessible: boolean; confidence: number; requiresConfirmation: boolean; weight?: number; source?: string }
export type NavigationDraft = {
  schemaVersion?: 1
  /** Backend always answers in map pixels; fixtures built locally may omit it. */
  coordinateSpace?: 'PIXEL'
  image?: { width: number; height: number }
  nodes: NavigationDraftNode[]
  edges: NavigationDraftEdge[]
  warnings: string[]
  diagnostics?: Record<string, unknown>
}
export type NavigationDraftApplyResult = {
  nodesCreated: number
  edgesCreated: number
  /** draft id -> persisted id */
  nodeIds?: Record<string, string>
  edgeIds?: Record<string, string>
  replayed?: boolean
}

export async function analyzeNavigationDraft(floorId: string) {
  const { data } = await apiClient.post<NavigationDraft>(`/floors/${floorId}/navigation-analysis`, undefined, { timeout: 120_000 })
  if (data.coordinateSpace !== undefined && data.coordinateSpace !== 'PIXEL') throw new Error('Phản hồi Analyze không ở hệ toạ độ pixel bản đồ.')
  return data
}
export async function applyNavigationDraft(floorId: string, draft: NavigationDraft) {
  const { data } = await apiClient.post<NavigationDraftApplyResult>(`/floors/${floorId}/navigation-draft/apply`, {
    // draftId lets the backend ignore a double click / retry of the very same Apply
    draftId: globalThis.crypto?.randomUUID?.(),
    mode: 'APPEND',
    nodes: draft.nodes.map(({ id, x, y, name, type, accessible }) => ({ id, x, y, name, type, accessible, confirmed: true })),
    edges: draft.edges.map(({ id, fromNodeId, toNodeId, accessible }) => ({ id, fromNodeId, toNodeId, accessible, confirmed: true })),
  })
  return data
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
