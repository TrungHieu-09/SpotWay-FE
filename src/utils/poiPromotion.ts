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

/**
 * Các POI thang máy / lối ra mà node neo hiện tại chưa đúng loại. POI đã gắn vào node đúng loại thì bỏ qua,
 * nên chạy lại nhiều lần không tạo node trùng.
 */
export function planPoiPromotions(
  pois: readonly PromotablePoi[],
  nodes: readonly { id: string; type: NodeType }[],
): PoiPromotion[] {
  const typeById = new Map(nodes.map((node) => [node.id, node.type]))
  return pois.flatMap((poi) => {
    const nodeType = NODE_TYPE_FOR_POI[poi.category]
    if (!nodeType) return []
    const anchorType = poi.nearestNodeId ? typeById.get(poi.nearestNodeId) : undefined
    if (anchorType === nodeType) return []
    const anchorNodeId = poi.nearestNodeId && typeById.has(poi.nearestNodeId) ? poi.nearestNodeId : null
    return [{ poiId: poi.id, name: poi.name, nodeType, at: { x: poi.x, y: poi.y }, anchorNodeId }]
  })
}
