import { apiClient } from './client'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import { getPois } from './pois'

type ApiFloor = { id: string; buildingId: string; floorNumber: number; name: string; mapImageUrl: string | null; mapWidth: number | null; mapHeight: number | null; metersPerPixel?: number | null; publishStatus: 'DRAFT' | 'PUBLISHED' }
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
      metersPerPixel: floor.metersPerPixel ?? null,
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
    metersPerPixel: floor?.metersPerPixel ?? null,
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
  return Promise.all(floors.map(async (floor: Floor) => ({ ...floor, pois: await getPois(floor.id, floor).catch(() => []) })))
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

type PixelPoint = { x: number; y: number }
export type CalibrateFloorInput =
  | { metersPerPixel: number }
  | { pointA: PixelPoint; pointB: PixelPoint; realDistanceMeters: number }

export type FloorGraphIssue = {
  code: string
  severity: 'ERROR' | 'WARNING'
  message: string
  ids?: string[]
}

/** Cập nhật thước đo thực tế của sơ đồ; BE sẽ tính lại trọng số các cạnh. */
export async function calibrateFloor(floorId: string, input: CalibrateFloorInput) {
  const { data } = await apiClient.patch<{ metersPerPixel: number; edgesRecomputed: number }>(
    `/floors/${floorId}/calibration`,
    input,
  )
  return data
}

/** Kiểm tra đồ thị điều hướng trước publish, không ghi dữ liệu. */
export async function validateFloorGraph(floorId: string) {
  const { data } = await apiClient.post<{ valid: boolean; issues: FloorGraphIssue[] }>(
    `/floors/${floorId}/graph/validate`,
  )
  return data
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
