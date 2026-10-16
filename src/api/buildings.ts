import { apiClient } from './client'
import type { Building, CreateBuildingPayload } from '../types/building'

type ApiBuilding = { id: string; name: string; address: string | null; status: 'ACTIVE' | 'INACTIVE'; createdAt: string }
function toBuilding(building: ApiBuilding): Building { return { id: building.id, name: building.name, address: building.address ?? '', status: building.status === 'ACTIVE' ? 'active' : 'draft', floorCount: 0, createdAt: building.createdAt, planImageUrl: null } }

export async function getBuildings() {
  const { data } = await apiClient.get<{ items: ApiBuilding[] }>('/buildings')
  return data.items.map(toBuilding)
}

export async function createBuilding(payload: CreateBuildingPayload) {
  const { data } = await apiClient.post<ApiBuilding>('/buildings', { name: payload.name, address: payload.address })
  return toBuilding(data)
}

export async function assignManagerByEmail(buildingId: string, email: string) {
  const { data } = await apiClient.post(`/buildings/${buildingId}/managers/by-email`, { email })
  return data
}

export async function createAndAssignManager(buildingId: string, email: string, password: string) {
  const { data } = await apiClient.post(`/buildings/${buildingId}/managers`, { email, password })
  return data
}

