import { apiClient } from './client'
import type { Building, CreateBuildingPayload } from '../types/building'

export async function getBuildings() {
  const { data } = await apiClient.get<Building[]>('/buildings')
  return data
}

export async function createBuilding(payload: CreateBuildingPayload) {
  const formData = new FormData()
  formData.append('name', payload.name)
  formData.append('address', payload.address)

  if (payload.planImage) {
    formData.append('planImage', payload.planImage)
  }

  const { data } = await apiClient.post<Building>('/buildings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

