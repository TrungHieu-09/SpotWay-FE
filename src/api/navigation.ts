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

/**
 * BE trả node/POI theo pixel ảnh sơ đồ. Đổi một lần về % (0-100) theo kích thước từng tầng để cảnh 3D
 * không phải đoán đơn vị (trước đây toạ độ pixel nhỏ hơn 100 bị hiểu nhầm là %).
 */
function toPercentOverview(overview: BuildingOverview): BuildingOverview {
  const sizes = new Map(overview.floors.map((floor) => [floor.id, floor]))
  const percent = (floorId: string, x: number, y: number) => {
    const floor = sizes.get(floorId)
    return floor?.mapWidth && floor.mapHeight
      ? { x: (x / floor.mapWidth) * 100, y: (y / floor.mapHeight) * 100 }
      : { x, y }
  }
  return {
    ...overview,
    nodes: overview.nodes?.map((node) => ({ ...node, ...percent(node.floorId, node.x, node.y) })),
    pois: overview.pois?.map((poi) =>
      poi.x != null && poi.y != null ? { ...poi, ...percent(poi.floorId, poi.x, poi.y) } : { ...poi, x: undefined, y: undefined },
    ),
  }
}

export async function getBuildingOverview(buildingId: string) {
  try {
    const { data } = await apiClient.get<BuildingOverview>(`/buildings/${buildingId}/overview`, {
      timeout: 30_000,
    })
    return toPercentOverview(data)
  } catch (error: unknown) {
    // Chưa đăng nhập hoặc không đủ quyền: dùng endpoint công khai cho khách.
    const status = (error as { status?: number })?.status
    if (status === 401 || status === 403) {
      const { data } = await apiClient.get<BuildingOverview>(`/public/buildings/${buildingId}/overview`, {
        timeout: 30_000,
      })
      return toPercentOverview(data)
    }
    throw error
  }
}
