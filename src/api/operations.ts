import { apiClient } from './client'

export type OperationsState = {
  elevator: boolean
  power: boolean
  zone: { nodeId: string; name: string } | null
  announcement: { id: number; text: string; at: string } | null
  updatedAt: string | null
}

export type OperationsPatch = {
  elevator?: boolean
  power?: boolean
  zoneNodeId?: string | null
  zoneName?: string
  announcement?: string | null
}

export type HelpRequest = { id: string; kind: 'LOST' | 'WHEELCHAIR' | 'SMOKE' | 'OTHER' | string; at: string; place: string | null }

/** What this building has declared right now (lifts, power, closed zone, notice). Every building has its own. */
export async function getOperations(buildingId: string) {
  const { data } = await apiClient.get<OperationsState>(`/buildings/${buildingId}/operations`)
  return data
}

export async function updateOperations(buildingId: string, patch: OperationsPatch) {
  const { data } = await apiClient.put<OperationsState>(`/buildings/${buildingId}/operations`, patch)
  return data
}

export async function clearOperations(buildingId: string) {
  const { data } = await apiClient.delete<OperationsState>(`/buildings/${buildingId}/operations`)
  return data
}

/** Help requests the guests of this building sent in the last 30 minutes. */
export async function getHelpRequests(buildingId: string) {
  const { data } = await apiClient.get<HelpRequest[]>(`/buildings/${buildingId}/operations/help`)
  return Array.isArray(data) ? data : []
}
