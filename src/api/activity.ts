import { apiClient } from './client'

export type ActivityEntry = {
  id: string
  action: string
  summary: string
  at: string
  actor: { id: string; role: string; email: string | null; name: string | null }
  extra?: { durationSeconds?: number; evacuees?: number } & Record<string, unknown>
}

/** Who did what in a building, newest first. `kind` keeps one family, for example INCIDENT. */
export async function getActivity(buildingId: string, kind?: string, limit = 100) {
  const { data } = await apiClient.get<ActivityEntry[]>(`/buildings/${buildingId}/operations/activity`, {
    params: { ...(kind ? { kind } : {}), limit },
  })
  return Array.isArray(data) ? data : []
}
