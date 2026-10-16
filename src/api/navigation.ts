import { apiClient } from './client'
import type { FloorPlanRevision } from './floorPlanAnalysis'

export type OverviewNode = {
  id: string
  floorId: string
  x: number
  y: number
  type: string
  accessible?: boolean
}

export type OverviewEdge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  weight: number
}

export type OverviewPoi = {
  id: string
  floorId: string
  nodeId: string
  name: string
  category: string
  x?: number
  y?: number
}

export type OverviewStore = {
  id: string
  floorId: string
  nodeId: string | null
  name: string
  status: string
  x?: number
  y?: number
}

export type BuildingOverview = {
  building: { id: string; defaultFloorHeight: number; name?: string }
  floors: Array<{
    id: string
    floorNumber: number
    name: string
    elevation: number
    mapImageUrl: string | null
    mapWidth: number | null
    mapHeight: number | null
    publishStatus?: string
    mapRevision?: Pick<FloorPlanRevision, 'version' | 'publishedAt' | 'editorState'> | null
  }>
  verticalLinks: Array<{ id?: string; nodeIdFrom: string; nodeIdTo: string; kind: 'ELEVATOR' }>
  nodes?: OverviewNode[]
  edges?: OverviewEdge[]
  pois?: OverviewPoi[]
  stores?: OverviewStore[]
}

export async function getBuildingOverview(buildingId: string) {
  try {
    const { data } = await apiClient.get<BuildingOverview>(`/buildings/${buildingId}/overview`, {
      timeout: 30_000,
    })
    return data
  } catch (error: unknown) {
    // If unauthorized or forbidden, try public endpoint for guest navigation
    const err = error as { response?: { status?: number }; message?: string }
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      const { data } = await apiClient.get<BuildingOverview>(`/public/buildings/${buildingId}/overview`, {
        timeout: 30_000,
      })
      return data
    }
    throw error
  }
}
