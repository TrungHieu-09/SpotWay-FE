import { apiClient } from './client'
import type { IndoorRoute, PublicFloor, PublicFloorMap, PublicSearchResult } from '../types/navigation'

export async function getPublicFloors(buildingId: string) {
  const { data } = await apiClient.get<PublicFloor[]>(`/public/buildings/${buildingId}/floors`)
  return data
}

export async function getPublicFloorMap(floorId: string) {
  const { data } = await apiClient.get<PublicFloorMap>(`/public/floors/${floorId}/map`)
  return data
}

export async function searchPublicDestinations(buildingId: string, query = '') {
  const { data } = await apiClient.get<{ items: PublicSearchResult[] }>(
    `/public/buildings/${buildingId}/search`,
    { params: { q: query, type: 'STORE', limit: 100 } },
  )
  return data.items
}

export async function createPublicRoute(input: {
  fromNodeId: string
  toStoreId: string
  wheelchairMode: boolean
}) {
  const { data } = await apiClient.post<IndoorRoute>('/public/routes', input)
  return data
}
