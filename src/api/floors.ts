import { apiClient } from './client'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'

type ApiFloor = { id: string; buildingId: string; floorNumber: number; name: string; mapImageUrl: string | null; mapWidth: number | null; mapHeight: number | null; metersPerPixel?: number | null; publishStatus: 'DRAFT' | 'PUBLISHED' }
function toFloor(floor: ApiFloor): Floor { return { id: floor.id, buildingId: floor.buildingId, name: floor.name, level: floor.floorNumber, publishStatus: floor.publishStatus === 'PUBLISHED' ? 'published' : 'draft', mapImageUrl: floor.mapImageUrl, mapWidth: floor.mapWidth ?? 1200, mapHeight: floor.mapHeight ?? 760, metersPerPixel: floor.metersPerPixel ?? null } }

export async function getFloors(buildingId: string) {
  const { data } = await apiClient.get<{ items: ApiFloor[] }>(
    `/buildings/${buildingId}/floors`,
  )
  return data.items.map(toFloor)
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

/** Một trong hai dạng BE chấp nhận; toạ độ điểm là pixel bản đồ. */
export type CalibrateFloorInput =
  | { metersPerPixel: number }
  | { pointA: PixelPoint; pointB: PixelPoint; realDistanceMeters: number }

export async function calibrateFloor(floorId: string, input: CalibrateFloorInput) {
  const { data } = await apiClient.patch<{ metersPerPixel: number; edgesRecomputed: number }>(
    `/floors/${floorId}/calibration`,
    input,
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

