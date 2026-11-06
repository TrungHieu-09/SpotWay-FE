import { apiClient } from './client'
import { percentToPixelPoint, pixelToPercentPoint, type MapSize } from './graphMapper'
import {
  poiTypeFromCategory,
  type NewPoiInput,
  type Poi,
  type PoiCategory,
  type PoiPatch,
} from '../types/poi'

type PoiDto = {
  id: string
  floorId: string
  nodeId: string
  x: number | null
  y: number | null
  snapDistanceMeters?: number | null
  name: string
  category: PoiCategory
  icon?: string | null
}
type NodeDto = { id: string; x: number; y: number }

function listOf<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  const items = (raw as { items?: unknown } | null)?.items
  return Array.isArray(items) ? (items as T[]) : []
}

function toPoi(dto: PoiDto, size: MapSize, nodes: Map<string, NodeDto>): Poi | null {
  const node = nodes.get(dto.nodeId)
  const px = dto.x ?? node?.x
  const py = dto.y ?? node?.y
  if (px == null || py == null) return null
  return {
    id: dto.id,
    floorId: dto.floorId,
    nodeId: dto.nodeId,
    name: dto.name,
    category: dto.category,
    icon: dto.icon ?? null,
    type: poiTypeFromCategory(dto.category),
    snapDistanceMeters: dto.snapDistanceMeters ?? null,
    ...pixelToPercentPoint(px, py, size),
  }
}

export async function getPois(floorId: string, size: MapSize): Promise<Poi[]> {
  const { data } = await apiClient.get<unknown>(`/floors/${floorId}/pois`)
  const dtos = listOf<PoiDto>(data)
  let nodes = new Map<string, NodeDto>()
  if (dtos.some((dto) => dto.x == null || dto.y == null)) {
    const { data: rawNodes } = await apiClient.get<unknown>(`/floors/${floorId}/nodes`)
    nodes = new Map(listOf<NodeDto>(rawNodes).map((node) => [node.id, node]))
  }
  return dtos.flatMap((dto) => toPoi(dto, size, nodes) ?? [])
}

export async function createPoi(floorId: string, size: MapSize, input: NewPoiInput) {
  const pixel = percentToPixelPoint(input.x, input.y, size)
  const { data } = await apiClient.post<PoiDto>(`/floors/${floorId}/pois`, {
    ...pixel,
    name: input.name,
    category: input.category,
    ...(input.icon ? { icon: input.icon } : {}),
  })
  return toPoi(data, size, new Map()) ?? { ...input, id: data.id, floorId, nodeId: data.nodeId, icon: input.icon ?? null, type: poiTypeFromCategory(input.category) }
}

export async function updatePoi(poiId: string, size: MapSize, patch: PoiPatch) {
  const body: Record<string, unknown> = {}
  if (patch.name !== undefined) body.name = patch.name
  if (patch.category !== undefined) body.category = patch.category
  if (patch.icon !== undefined && patch.icon !== null) body.icon = patch.icon
  if (patch.nodeId !== undefined) body.nodeId = patch.nodeId
  if (patch.x !== undefined && patch.y !== undefined) Object.assign(body, percentToPixelPoint(patch.x, patch.y, size))
  const { data } = await apiClient.patch<PoiDto>(`/pois/${poiId}`, body)
  return toPoi(data, size, new Map())
}

export async function deletePoi(poiId: string) {
  await apiClient.delete(`/pois/${poiId}`)
}

export async function deleteAllPois(floorId: string) {
  await apiClient.delete(`/floors/${floorId}/pois`)
}

/** Xem trước node mà POI tại vị trí này sẽ snap vào, không ghi dữ liệu. */
export async function snapPoi(floorId: string, size: MapSize, x: number, y: number) {
  const pixel = percentToPixelPoint(x, y, size)
  const { data } = await apiClient.get<{ nodeId: string; distanceMeters: number }>(
    `/floors/${floorId}/pois/snap`,
    { params: pixel },
  )
  return data
}
