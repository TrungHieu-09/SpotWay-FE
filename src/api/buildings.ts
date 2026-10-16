import { apiClient } from './client'
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../types/building'

export async function getBuildings() {
  const { data } = await apiClient.get<Building[]>('/buildings')
  return data
}

export async function createBuilding(payload: CreateBuildingPayload) {
  const formData = new FormData()
  formData.append('name', payload.name)
  formData.append('address', payload.address)
  formData.append('floorCount', String(payload.floors.length))
  formData.append('floors', JSON.stringify(payload.floors))

  const { data } = await apiClient.post<Building>('/buildings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

export async function updateBuilding(buildingId: string, payload: UpdateBuildingPayload) {
  const { data } = await apiClient.patch<Building>(`/buildings/${buildingId}`, payload)
  return data
}

export async function deleteBuilding(buildingId: string) {
  await apiClient.delete(`/buildings/${buildingId}`)
}

