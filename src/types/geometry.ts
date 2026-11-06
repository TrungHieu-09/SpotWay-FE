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

/** Toạ độ chuẩn hoá của domain: 0-100, theo chiều rộng/cao ảnh sơ đồ. Không bao giờ là pixel. */
export type PercentPoint = {
  x: number
  y: number
}

/** Kích thước tham chiếu để đổi qua lại với pixel (ảnh sơ đồ hoặc Konva Stage). */
export type MapSize = {
  width: number
  height: number
}
