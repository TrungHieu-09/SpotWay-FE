import { apiClient } from './client'
import type { Area } from '../types/area'

export async function getBuildingAreas(buildingId: string) {
  const { data } = await apiClient.get<Area[]>(`/buildings/${buildingId}/areas`)
  return data
}

export async function createArea(buildingId: string, payload: Pick<Area, 'name' | 'description' | 'color'>) {
  const { data } = await apiClient.post<Area>(`/buildings/${buildingId}/areas`, payload)
  return data
}

export async function updateArea(areaId: string, payload: Partial<Pick<Area, 'name' | 'description' | 'color'>>) {
  const { data } = await apiClient.patch<Area>(`/areas/${areaId}`, payload)
  return data
}

export async function deleteArea(areaId: string) {
  await apiClient.delete(`/areas/${areaId}`)
}
