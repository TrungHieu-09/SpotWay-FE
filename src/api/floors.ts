import { apiClient } from './client'
import type { CreateFloorPayload, Floor } from '../types/floor'
import type { Poi } from '../types/poi'

export async function getFloors(buildingId: string) {
  const { data } = await apiClient.get<Floor[]>(
    `/buildings/${buildingId}/floors`,
  )
  return data
}

export async function createFloor(payload: CreateFloorPayload) {
  const { data } = await apiClient.post<Floor>('/floors', payload)
  return data
}

export async function saveFloorPois(
  floorId: string,
  pois: Poi[],
) {
  const { data } = await apiClient.patch<Poi[]>(`/floors/${floorId}/pois`, pois)
  return data
}

