import type { GraphNode, GraphNodeType } from '../api/graph'
import type { Poi, PoiCategory } from '../types/poi'

/** Loại POI cần một node trung chuyển tương ứng để định tuyến xuyên tầng hoặc thoát hiểm. */
export const NODE_TYPE_FOR_POI: Partial<Record<PoiCategory, GraphNodeType>> = {
  ELEVATOR: 'ELEVATOR',
  EXIT: 'EXIT',
}

export type PoiPromotion = {
  poiId: string
  name: string
  nodeType: GraphNodeType
  /** Vị trí POI theo % (0-100). */
  at: { x: number; y: number }
  /** Node hành lang POI đang gắn vào; node mới được nối edge tới đó. */
  anchorNodeId: string | null
}

/** Đã có node cùng loại cách POI không quá ngần này (% bản đồ) thì coi như đã có node. */
const SAME_SPOT_PERCENT = 2

/**
 * POI thang máy / lối ra chưa có node đúng loại. Chạy lại không tạo node trùng.
 * `nodes` ở pixel, `size` là kích thước ảnh sơ đồ để quy về %.
 */
export function planPoiPromotions(
  pois: readonly Poi[],
  nodes: readonly GraphNode[],
  size: { mapWidth: number; mapHeight: number },
): PoiPromotion[] {
  const typeById = new Map(nodes.map((node) => [node.id, node.type]))
  const nodesPercent = nodes.map((node) => ({
    type: node.type,
    x: (node.x / size.mapWidth) * 100,
    y: (node.y / size.mapHeight) * 100,
  }))
  return pois.flatMap((poi) => {
    const nodeType = NODE_TYPE_FOR_POI[poi.category]
    if (!nodeType) return []
    if (poi.nodeId && typeById.get(poi.nodeId) === nodeType) return []
    if (nodesPercent.some((node) => node.type === nodeType && Math.hypot(node.x - poi.x, node.y - poi.y) <= SAME_SPOT_PERCENT)) return []
    const anchorNodeId = poi.nodeId && typeById.has(poi.nodeId) ? poi.nodeId : null
    return [{ poiId: poi.id, name: poi.name, nodeType, at: { x: poi.x, y: poi.y }, anchorNodeId }]
  })
}
