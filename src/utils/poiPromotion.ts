import type { PercentPoint } from '../types/geometry.ts'
import type { NodeType } from '../types/graph.ts'
import type { PoiCategory } from '../types/poi.ts'

/** Loại POI cần một node trung chuyển tương ứng để thuật toán đi xuyên tầng hoặc thoát hiểm. */
export const NODE_TYPE_FOR_POI: Partial<Record<PoiCategory, NodeType>> = {
  elevator: 'ELEVATOR',
  exit: 'EXIT',
}

export type PoiPromotion = {
  poiId: string
  name: string
  nodeType: NodeType
  /** Vị trí (%) của node mới = vị trí POI. */
  at: PercentPoint
  /** Node hành lang POI đang gắn vào; node mới được nối edge tới đó. null nếu tầng chưa có node nào. */
  anchorNodeId: string | null
}

type PromotablePoi = PercentPoint & { id: string; name: string; category: PoiCategory; nearestNodeId: string | null }

/** Đã có node cùng loại cách POI không quá ngần này (% bản đồ) thì coi như POI đã có node, không tạo thêm. */
const SAME_SPOT_PERCENT = 2

/**
 * Các POI thang máy / lối ra chưa có node đúng loại: node neo không đúng loại và cũng chưa có node cùng loại
 * nằm ngay tại chỗ POI. Nhờ vậy chạy lại (hoặc bấm hai lần) không tạo node trùng.
 */
export function planPoiPromotions(
  pois: readonly PromotablePoi[],
  nodes: readonly (PercentPoint & { id: string; type: NodeType })[],
): PoiPromotion[] {
  const typeById = new Map(nodes.map((node) => [node.id, node.type]))
  return pois.flatMap((poi) => {
    const nodeType = NODE_TYPE_FOR_POI[poi.category]
    if (!nodeType) return []
    const anchorType = poi.nearestNodeId ? typeById.get(poi.nearestNodeId) : undefined
    if (anchorType === nodeType) return []
    if (nodes.some((node) => node.type === nodeType && Math.hypot(node.x - poi.x, node.y - poi.y) <= SAME_SPOT_PERCENT)) return []
    const anchorNodeId = poi.nearestNodeId && typeById.has(poi.nearestNodeId) ? poi.nearestNodeId : null
    return [{ poiId: poi.id, name: poi.name, nodeType, at: { x: poi.x, y: poi.y }, anchorNodeId }]
  })
}
