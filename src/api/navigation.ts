import { apiClient } from './client'

export type BuildingOverview = {
  building: { id: string; defaultFloorHeight: number }
  floors: Array<{ id: string; floorNumber: number; name: string; elevation: number; mapImageUrl: string | null; mapWidth: number | null; mapHeight: number | null }>
  verticalLinks: Array<{ nodeIdFrom: string; nodeIdTo: string; kind: 'ELEVATOR' }>
}

export async function getBuildingOverview(buildingId: string) {
  const { data } = await apiClient.get<BuildingOverview>(`/public/buildings/${buildingId}/overview`)
  return data
}
