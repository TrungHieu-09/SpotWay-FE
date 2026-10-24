import { apiClient } from './client'
import type { Building, CreateBuildingPayload } from '../types/building'

type ApiBuilding = {
  id: string
  name: string
  address: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
}

function toBuilding(building: any): Building {
  if (building && 'floorCount' in building) {
    return {
      id: building.id,
      name: building.name,
      address: building.address ?? '',
      status: building.status === 'ACTIVE' || building.status === 'active' ? 'active' : 'draft',
      floorCount: building.floorCount ?? 0,
      createdAt: building.createdAt ?? new Date().toISOString(),
      planImageUrl: building.planImageUrl ?? null,
    }
  }
  return {
    id: building?.id ?? '',
    name: building?.name ?? '',
    address: building?.address ?? '',
    status: building?.status === 'ACTIVE' ? 'active' : 'draft',
    floorCount: 0,
    createdAt: building?.createdAt ?? new Date().toISOString(),
    planImageUrl: null,
  }
}

export async function getBuildings(): Promise<Building[]> {
  const { data } = await apiClient.get<any>('/buildings')
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : []
  return items.map(toBuilding)
}

export async function createBuilding(payload: CreateBuildingPayload) {
  const { data } = await apiClient.post<ApiBuilding>('/buildings', {
    name: payload.name,
    address: payload.address,
  })
  return toBuilding(data)
}

export async function updateBuilding(
  buildingId: string,
  payload: Partial<Pick<Building, 'name' | 'address' | 'status'>>,
) {
  const { data } = await apiClient.patch<ApiBuilding>(`/buildings/${buildingId}`, payload)
  return toBuilding(data)
}

export async function deleteBuilding(buildingId: string) {
  await apiClient.delete(`/buildings/${buildingId}`)
}

export async function assignManagerByEmail(buildingId: string, email: string) {
  const { data } = await apiClient.post(`/buildings/${buildingId}/managers/by-email`, { email })
  return data
}

export async function createAndAssignManager(buildingId: string, email: string, password: string) {
  const { data } = await apiClient.post(`/buildings/${buildingId}/managers`, { email, password })
  return data
}
