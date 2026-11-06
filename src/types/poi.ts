export type PoiType =
  | 'entrance'
  | 'shop'
  | 'store'
  | 'service'
  | 'elevator'
  | 'toilet'
  | 'exit'
  | 'custom'

/** Khớp enum PoiCategory của BE. */
export type PoiCategory = 'RESTROOM' | 'ELEVATOR' | 'EXIT' | 'INFO' | 'PARKING' | 'CUSTOM'

export type Poi = {
  id: string
  floorId: string
  /** Node đồ thị mà POI được snap vào (BE tự chọn node gần nhất). */
  nodeId?: string
  name: string
  category: PoiCategory
  icon: string | null
  /** Suy ra từ category, dùng cho render 2D/3D. */
  type: PoiType
  /** 0-100, percentage on the floor plan width. Not a pixel value. */
  x: number
  /** 0-100, percentage on the floor plan height. Not a pixel value. */
  y: number
  snapDistanceMeters?: number | null
}

export type NewPoiInput = { x: number; y: number; name: string; category: PoiCategory; icon?: string | null }
export type PoiPatch = Partial<Pick<Poi, 'name' | 'category' | 'icon' | 'x' | 'y' | 'nodeId'>>

export const POI_CATEGORY_LABEL: Record<PoiCategory, string> = {
  RESTROOM: 'Nhà vệ sinh',
  ELEVATOR: 'Thang máy',
  EXIT: 'Lối ra',
  INFO: 'Quầy thông tin',
  PARKING: 'Bãi đỗ xe',
  CUSTOM: 'Khác',
}

export function poiTypeFromCategory(category: PoiCategory): PoiType {
  switch (category) {
    case 'RESTROOM': return 'toilet'
    case 'ELEVATOR': return 'elevator'
    case 'EXIT': return 'exit'
    case 'INFO':
    case 'PARKING': return 'service'
    default: return 'custom'
  }
}
