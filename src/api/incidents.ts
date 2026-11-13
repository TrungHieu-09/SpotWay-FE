import { apiClient } from './client'

export type IncidentState =
  | { active: false }
  | { active: true; id: string; type: 'FIRE'; nodeIds: string[]; floorIds: string[]; message: string | null; startedAt: string; evacuees?: number; exits?: Record<string, number> }

export async function getIncident(buildingId: string) {
  const { data } = await apiClient.get<IncidentState>(`/buildings/${buildingId}/incident`)
  return data
}

/** Raise a fire alarm: guests' phones switch to evacuation and routes avoid these nodes. */
export async function startIncident(buildingId: string, nodeIds: string[], message?: string) {
  const { data } = await apiClient.post<IncidentState>(`/buildings/${buildingId}/incident`, { nodeIds, message: message?.trim() || undefined })
  return data
}

export async function clearIncident(buildingId: string) {
  const { data } = await apiClient.delete<IncidentState>(`/buildings/${buildingId}/incident`)
  return data
}
