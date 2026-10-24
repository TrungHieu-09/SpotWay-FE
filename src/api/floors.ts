import { apiClient } from './client'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import type { Poi } from '../types/poi'

type ApiFloor = { id: string; buildingId: string; floorNumber: number; name: string; mapImageUrl: string | null; mapWidth: number | null; mapHeight: number | null; publishStatus: 'DRAFT' | 'PUBLISHED' }
type ApiPoi = { id: string; floorId: string; nodeId: string; name: string; category: string }
type ApiNode = { id: string; x: number; y: number }
function toFloor(floor: any): Floor {
  if (floor && 'level' in floor) {
    return {
      id: floor.id,
      buildingId: floor.buildingId,
      name: floor.name,
      level: floor.level,
      publishStatus: floor.publishStatus ?? 'draft',
      mapImageUrl: floor.mapImageUrl ?? null,
      mapWidth: floor.mapWidth ?? 1200,
      mapHeight: floor.mapHeight ?? 760,
      pois: floor.pois ?? [],
    }
  }
  return {
    id: floor?.id ?? '',
    buildingId: floor?.buildingId ?? '',
    name: floor?.name ?? '',
    level: floor?.floorNumber ?? 0,
    publishStatus: floor?.publishStatus === 'PUBLISHED' ? 'published' : 'draft',
    mapImageUrl: floor?.mapImageUrl ?? null,
    mapWidth: floor?.mapWidth ?? 1200,
    mapHeight: floor?.mapHeight ?? 760,
    pois: [],
  }
}

export async function getFloors(buildingId: string) {
  const { data } = await apiClient.get<any>(
    `/buildings/${buildingId}/floors`,
  )
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : []
  const floors = items.map(toFloor)
  return Promise.all(floors.map(async (floor) => ({ ...floor, pois: await getFloorPois(floor) })))
}

export async function createFloor(payload: CreateFloorPayload) {
  const { data } = await apiClient.post<ApiFloor>(`/buildings/${payload.buildingId}/floors`, { floorNumber: payload.level, name: payload.name, mapImageUrl: payload.mapImageUrl, mapWidth: payload.mapWidth, mapHeight: payload.mapHeight })
  return toFloor(data)
}

export async function updateFloor(
  floorId: string,
  payload: UpdateFloorPayload,
) {
  if (payload.publishStatus) {
    const { data } = await apiClient.post<ApiFloor>(`/floors/${floorId}/${payload.publishStatus === 'published' ? 'publish' : 'unpublish'}`)
    return toFloor(data)
  }
  const { data } = await apiClient.patch<ApiFloor>(`/floors/${floorId}`, { name: payload.name, mapImageUrl: payload.mapImageUrl, mapWidth: payload.mapWidth, mapHeight: payload.mapHeight })
  return toFloor(data)
}

export async function deleteFloor(floorId: string) {
  await apiClient.delete(`/floors/${floorId}`)
}

export type UploadUrlResponse = {
  signedUrl: string
  path: string
  publicUrl: string
  token: string
}

export async function getFloorUploadUrl(buildingId: string, filename: string, mimeType?: string) {
  const { data } = await apiClient.post<UploadUrlResponse>(
    `/buildings/${buildingId}/floors/upload-url`,
    { filename, mimeType },
  )
  return data
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 800 })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 1200, height: 800 })
    }
    img.src = url
  })
}

export async function uploadFloorPlanImage(
  buildingId: string,
  file: File,
): Promise<{ mapImageUrl: string; mapWidth: number; mapHeight: number }> {
  const [{ width, height }, uploadInfo] = await Promise.all([
    getImageDimensions(file),
    getFloorUploadUrl(buildingId, file.name, file.type),
  ])

  const uploadResponse = await fetch(uploadInfo.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'image/png',
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error(`Upload ảnh sơ đồ thất bại: ${uploadResponse.statusText}`)
  }

  return {
    mapImageUrl: uploadInfo.publicUrl,
    mapWidth: width,
    mapHeight: height,
  }
}

async function getFloorPois(floor: Floor) {
  try {
    const [{ data: pois }, { data: nodes }] = await Promise.all([
      apiClient.get<ApiPoi[]>(`/floors/${floor.id}/pois`),
      apiClient.get<ApiNode[]>(`/floors/${floor.id}/nodes`),
    ])
    const nodeById = new Map(nodes.map((node) => [node.id, node]))
    return pois.flatMap((poi): Poi[] => {
      const node = nodeById.get(poi.nodeId)
      return node ? [{ id: poi.id, nodeId: poi.nodeId, floorId: poi.floorId, name: poi.name, type: 'custom', x: (node.x / floor.mapWidth) * 100, y: (node.y / floor.mapHeight) * 100 }] : []
    })
  } catch {
    return []
  }
}

export async function saveFloorPois(floorId: string, pois: Poi[]) {
  const { data: rawFloor } = await apiClient.get<ApiFloor>(`/floors/${floorId}`)
  const floor = toFloor(rawFloor)
  const [{ data: serverPois }, { data: serverNodes }] = await Promise.all([
    apiClient.get<ApiPoi[]>(`/floors/${floorId}/pois`),
    apiClient.get<ApiNode[]>(`/floors/${floorId}/nodes`),
  ])
  const desiredIds = new Set(pois.map((poi) => poi.id))
  await Promise.all(serverPois.filter((poi) => !desiredIds.has(poi.id)).map(async (poi) => {
    await apiClient.delete(`/pois/${poi.id}`)
    await apiClient.delete(`/nodes/${poi.nodeId}`)
  }))
  const serverPoiIds = new Set(serverPois.map((poi) => poi.id))
  const nodesById = new Map(serverNodes.map((node) => [node.id, node]))
  const saved = await Promise.all(pois.map(async (poi) => {
    const x = (poi.x / 100) * floor.mapWidth
    const y = (poi.y / 100) * floor.mapHeight
    if (serverPoiIds.has(poi.id) && poi.nodeId && nodesById.has(poi.nodeId)) {
      await apiClient.patch(`/nodes/${poi.nodeId}`, { x, y })
      return { ...poi }
    }
    const { data: node } = await apiClient.post<ApiNode>(`/floors/${floorId}/nodes`, { x, y, type: 'NORMAL' })
    const { data: created } = await apiClient.post<ApiPoi>(`/floors/${floorId}/pois`, { nodeId: node.id, name: poi.name, category: 'CUSTOM' })
    return { ...poi, id: created.id, nodeId: node.id }
  }))
  return saved
}

