export type Point = {
  /** 0-100, percentage on the floor plan width. Not a pixel value. */
  x: number
  /** 0-100, percentage on the floor plan height. Not a pixel value. */
  y: number
}

export type RoomType =
  | 'store'
  | 'corridor'
  | 'atrium'
  | 'office'
  | 'toilet'
  | 'service'
  | 'other'

export type Room = {
  id: string
  floorId: string
  name: string
  type: RoomType
  polygon: Point[]
  storeId?: string | null
}

export type FloorGeometry = {
  floorId: string
  rooms: Room[]
  wallHeight: number
  status: 'draft' | 'confirmed'
  updatedAt: string
  realWidthM: number
  realHeightM: number
}
