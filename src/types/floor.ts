import type { Poi } from './poi'

export type FloorPublishStatus = 'draft' | 'published'

export type Floor = {
  id: string
  buildingId: string
  areaId: string | null
  name: string
  level: number
  publishStatus: FloorPublishStatus
  mapImageUrl: string | null
  mapWidth: number
  mapHeight: number
  pois: Poi[]
  nextPoiNumber: number
}

export type CreateFloorPayload = {
  buildingId: string
  areaId?: string | null
  name: string
  level: number
  publishStatus?: FloorPublishStatus
  planImageUrl?: string | null
  mapImageUrl?: string | null
  mapWidth?: number
  mapHeight?: number
  nextPoiNumber?: number
}

export type UpdateFloorPayload = Partial<{
  name: string
  level: number
  areaId?: string | null
  publishStatus: FloorPublishStatus
  planImageUrl: string | null
  mapImageUrl: string | null
  mapWidth: number
  mapHeight: number
  nextPoiNumber: number
}>

