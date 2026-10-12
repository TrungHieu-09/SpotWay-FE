import { apiClient } from './client'
import type { FloorGeometry } from '../types/geometry'
import type { Destination, RouteResult } from '../types/route'

export async function getFloorGeometry(floorId: string) {
  const { data } = await apiClient.get<FloorGeometry>(
    `/floors/${floorId}/geometry`,
  )
  return data
}

export async function getBuildingDestinations(buildingId: string) {
  const { data } = await apiClient.get<Destination[]>(
    `/buildings/${buildingId}/destinations`,
  )
  return data
}

export async function getRoute(
  buildingId: string,
  fromNodeId: string,
  toNodeId: string,
) {
  const { data } = await apiClient.get<RouteResult>('/routes', {
    params: { buildingId, fromNodeId, toNodeId },
  })
  return data
}
