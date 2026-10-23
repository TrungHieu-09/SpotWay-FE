import { apiClient } from './client'
import type { IndoorRoute, PublicFloor, PublicFloorMap, PublicQrResolution, PublicSearchResult } from '../types/navigation'

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

const isBackendUnreachable = (error: unknown) =>
  error instanceof Error && /network error|timeout|failed to fetch/i.test(error.message)

/**
 * Giải mã QR token thành vị trí xuất phát. Chỉ khi backend không truy cập được (mất mạng/timeout)
 * mới dùng `fallback` (mock cục bộ); token sai/hết hiệu lực vẫn ném lỗi để UI báo đúng.
 */
export async function resolvePublicQrToken(token: string, fallback?: () => PublicQrResolution | undefined) {
  try {
    const { data } = await apiClient.get<PublicQrResolution>(`/public/qr/${encodeURIComponent(token)}`, { timeout: 10_000 })
    return data
  } catch (error) {
    const mock = isBackendUnreachable(error) ? fallback?.() : undefined
    if (mock) return mock
    throw error
  }
}

export async function createPublicRoute(input: {
  fromNodeId: string
  toStoreId: string
  wheelchairMode: boolean
  mode?: 'NORMAL' | 'EVACUATION'
  hazardNodeIds?: string[]
}) {
  const { data } = await apiClient.post<IndoorRoute>('/public/routes', input)
  return data
}
