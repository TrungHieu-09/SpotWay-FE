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
  /** Tỉ lệ mét/pixel; null/thiếu = chưa hiệu chuẩn (BE không cho publish). */
  metersPerPixel?: number | null
}

export type CreateFloorPayload = {
  buildingId: string
  name: string
  level: number
  publishStatus?: FloorPublishStatus
  planImageUrl?: string | null
  mapImageUrl?: string | null
  mapWidth?: number
  mapHeight?: number
}

export type UpdateFloorPayload = Partial<{
  name: string
  level: number
  publishStatus: FloorPublishStatus
  planImageUrl: string | null
  mapImageUrl: string | null
  mapWidth: number
  mapHeight: number
}>

