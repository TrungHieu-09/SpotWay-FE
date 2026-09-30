import type { Poi } from './poi'

export type FloorPublishStatus = 'draft' | 'published'

export type Floor = {
  id: string
  buildingId: string
  name: string
  level: number
  publishStatus: FloorPublishStatus
  mapImageUrl: string | null
  mapWidth: number
  mapHeight: number
  pois: Poi[]
}

export type CreateFloorPayload = {
  buildingId: string
  name: string
  level: number
  publishStatus?: FloorPublishStatus
  mapImageUrl?: string | null
  mapWidth?: number
  mapHeight?: number
}

