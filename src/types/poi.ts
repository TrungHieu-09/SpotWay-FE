import type { PercentPoint } from './geometry'

/** Khớp enum `PoiCategory` của BE (viết thường). */
export type PoiCategory = 'restroom' | 'elevator' | 'exit' | 'info' | 'parking' | 'custom'

/** POI là entity độc lập: có toạ độ riêng; `nearestNodeId` là điểm đồ thị dùng để dẫn đường tới nó. */
export type Poi = PercentPoint & {
  id: string
  floorId: string
  name: string
  category: PoiCategory
  /** Khoá icon; null = dùng icon mặc định của category. */
  icon: string | null
  nearestNodeId: string | null
}

export type NewPoi = Pick<Poi, 'x' | 'y' | 'name' | 'category' | 'icon'>

/** Trường người dùng sửa được mà không đổi vị trí. */
export type PoiDetailsPatch = Partial<Pick<Poi, 'name' | 'category' | 'icon'>>

/** Loại hiển thị (màu/biểu tượng) trên bản đồ 2D/3D, suy ra từ category của BE. */
export type PoiType = 'entrance' | 'shop' | 'store' | 'service' | 'elevator' | 'toilet' | 'exit' | 'custom'

export function poiVisualType(category: PoiCategory): PoiType {
  switch (category) {
    case 'restroom': return 'toilet'
    case 'elevator': return 'elevator'
    case 'exit': return 'exit'
    case 'info':
    case 'parking': return 'service'
    default: return 'custom'
  }
}

export const POI_CATEGORY_LABEL: Record<PoiCategory, string> = {
  restroom: 'Nhà vệ sinh',
  elevator: 'Thang máy',
  exit: 'Lối ra',
  info: 'Quầy thông tin',
  parking: 'Bãi đỗ xe',
  custom: 'Khác',
}
