import { apiClient } from './client'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
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

export async function updateFloor(
  floorId: string,
  payload: UpdateFloorPayload,
) {
  const { data } = await apiClient.patch<Floor>(`/floors/${floorId}`, payload)
  return data
}

export async function deleteFloor(floorId: string) {
  await apiClient.delete(`/floors/${floorId}`)
}

export async function saveFloorPois(
  floorId: string,
  pois: Poi[],
) {
  const { data } = await apiClient.patch<Poi[]>(`/floors/${floorId}/pois`, pois)
  return data
}

