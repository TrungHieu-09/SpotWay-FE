import { apiClient } from './client'
import type { IndoorRoute, PublicFloor, PublicFloorMap, PublicQrResolution, PublicSearchResult, VerticalLink } from '../types/navigation'

export async function getPublicFloors(buildingId: string) {
  const { data } = await apiClient.get<PublicFloor[]>(`/public/buildings/${buildingId}/floors`)
  return data
}

/** Tổng quan toà nhà công khai; trang khách chỉ cần danh sách liên kết thang (vertical links). */
export async function getPublicVerticalLinks(buildingId: string) {
  const { data } = await apiClient.get<{ verticalLinks?: VerticalLink[] }>(`/public/buildings/${buildingId}/overview`, { timeout: 30_000 })
  return data.verticalLinks ?? []
}

export async function getPublicFloorMap(floorId: string) {
  const { data } = await apiClient.get<PublicFloorMap>(`/public/floors/${floorId}/map`)
  return data
}

/** Điểm đến = cửa hàng + POI (BE tách hai loại theo `type`; node có tên bị bỏ để khỏi trùng POI). */
export async function searchPublicDestinations(buildingId: string, query = '') {
  const [stores, pois] = await Promise.all(
    (['STORE', 'POI'] as const).map(async (type) => {
      const { data } = await apiClient.get<{ items: PublicSearchResult[] }>(
        `/public/buildings/${buildingId}/search`,
        { params: { q: query, type, limit: 100 } },
      )
      return data.items
    }),
  )
  return [...stores, ...pois].sort((a, b) => a.name.localeCompare(b.name))
}

const isBackendUnreachable = (error: unknown) =>
  error instanceof Error && /network error|timeout|failed to fetch/i.test(error.message)

/**
 * Giải mã QR token thành vị trí xuất phát. Chỉ khi backend không truy cập được (mất mạng/timeout)
 * mới dùng `fallback` (mock cục bộ); token sai/hết hiệu lực vẫn ném lỗi để UI báo đúng.
 */
export async function resolvePublicQrToken(token: string, fallback?: () => PublicQrResolution | undefined) {
  try {
    const { data } = await apiClient.get<PublicQrResolution>(`/qr/${encodeURIComponent(token)}`, { timeout: 10_000 })
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
  // lang: 'vi' để BE trả chỉ dẫn tiếng Việt (mặc định BE giữ tiếng Anh cho client cũ)
  const { data } = await apiClient.post<IndoorRoute>('/public/routes', { lang: 'vi', ...input })
  return data
}
