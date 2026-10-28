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
