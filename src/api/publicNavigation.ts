import { apiClient } from './client'
import type {
  IndoorRoute,
  PublicFloor,
  PublicFloorMap,
  PublicQrResolution,
  PublicSearchResult,
  VerticalLink,
} from '../types/navigation'

export async function getPublicFloors(buildingId: string) {
  const { data } = await apiClient.get<PublicFloor[]>(`/public/buildings/${buildingId}/floors`)
  return data
}

export async function getPublicVerticalLinks(buildingId: string) {
  const { data } = await apiClient.get<{ verticalLinks?: VerticalLink[] }>(
    `/public/buildings/${buildingId}/overview`,
    { timeout: 30_000 },
  )
  return data.verticalLinks ?? []
}

export async function getPublicFloorMap(floorId: string) {
  const { data } = await apiClient.get<PublicFloorMap>(`/public/floors/${floorId}/map`)
  return data
}

export async function searchPublicDestinations(buildingId: string, query = '') {
  const results = await Promise.all(
    (['STORE', 'POI'] as const).map(async (type) => {
      const { data } = await apiClient.get<{ items: PublicSearchResult[] }>(
        `/public/buildings/${buildingId}/search`,
        { params: { q: query, type, limit: 100 } },
      )
      return data.items
    }),
  )
  return results.flat().sort((left, right) => left.name.localeCompare(right.name))
}

const isBackendUnreachable = (error: unknown) =>
  error instanceof Error && /network error|timeout|failed to fetch/i.test(error.message)

export async function resolvePublicQrToken(
  token: string,
  fallback?: () => PublicQrResolution | undefined,
) {
  try {
    const { data } = await apiClient.get<PublicQrResolution>(
      `/qr/${encodeURIComponent(token)}`,
      { timeout: 10_000 },
    )
    return data
  } catch (error) {
    const localResolution = isBackendUnreachable(error) ? fallback?.() : undefined
    if (localResolution) return localResolution
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
  const { data } = await apiClient.post<IndoorRoute>('/public/routes', { lang: 'vi', ...input })
  return data
}
