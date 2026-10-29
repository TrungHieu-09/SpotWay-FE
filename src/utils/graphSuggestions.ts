import type { MapSize, PercentPoint } from '../types/geometry.ts'
import type { ConnectorKind } from '../types/graph.ts'
import { distanceInMapUnits } from './graphGeometry.ts'

type PointWithId = PercentPoint & { id: string }

export type EdgeSuggestion = { id: string; fromNodeId: string; toNodeId: string }

/**
 * Gợi ý edge để cả tầng thành một mạng liền: lặp lại việc nối cặp node gần nhất đang thuộc hai
 * nhóm rời nhau (cây khung nhỏ nhất, Kruskal). Edge đã có được tính là đã nối sẵn.
 * Không biết tường nên có thể nối xuyên tường — kết quả chỉ là nháp để người vẽ duyệt.
 */
export function suggestEdges(
  nodes: readonly PointWithId[],
  edges: readonly { fromNodeId: string; toNodeId: string }[],
  size: MapSize,
  options: { maxDistance?: number; /** Cặp node không được nối (vd. đoạn thẳng xuyên tường). */ isBlocked?: (a: PointWithId, b: PointWithId) => boolean } = {},
): EdgeSuggestion[] {
  const maxDistance = options.maxDistance ?? Infinity
  const parent = new Map(nodes.map((node) => [node.id, node.id]))
  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root)!
    for (let current = id; current !== root; ) {
      const next = parent.get(current)!
      parent.set(current, root)
      current = next
    }
    return root
  }
  const union = (a: string, b: string) => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA === rootB) return false
    parent.set(rootA, rootB)
    return true
  }
  for (const edge of edges) if (parent.has(edge.fromNodeId) && parent.has(edge.toNodeId)) union(edge.fromNodeId, edge.toNodeId)

  const pairs: { a: PointWithId; b: PointWithId; distance: number }[] = []
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const distance = distanceInMapUnits(nodes[i], nodes[j], size)
      if (distance <= maxDistance && !options.isBlocked?.(nodes[i], nodes[j])) pairs.push({ a: nodes[i], b: nodes[j], distance })
    }
  }
  pairs.sort((left, right) => left.distance - right.distance)

  const suggestions: EdgeSuggestion[] = []
  for (const { a, b } of pairs) {
    if (union(a.id, b.id)) suggestions.push({ id: `suggest-${a.id}-${b.id}`, fromNodeId: a.id, toNodeId: b.id })
  }
  return suggestions
}

export type SuggestionNode = PointWithId & { type: string; name: string | null }
export type SuggestionFloor = { floorId: string; level: number; nodes: readonly SuggestionNode[] }
export type ConnectorSuggestion = {
  kind: ConnectorKind
  name: string
  stops: { floorId: string; nodeId: string }[]
}

const KINDS: { kind: ConnectorKind; label: string }[] = [
  { kind: 'ELEVATOR', label: 'Thang máy' },
  { kind: 'STAIR', label: 'Cầu thang bộ' },
  { kind: 'ESCALATOR', label: 'Thang cuốn' },
]

/**
 * Gợi ý connector: node cùng loại (thang máy/thang bộ/thang cuốn) nằm gần như cùng vị trí (%) ở nhiều
 * tầng thì coi là một trục. Node đã thuộc connector (`linkedNodeIds`) được bỏ qua.
 * Mỗi cụm cần ≥ 2 tầng; mỗi tầng chỉ một node.
 */
export function suggestConnectors(
  floors: readonly SuggestionFloor[],
  linkedNodeIds: ReadonlySet<string>,
  maxDistancePercent = 8,
): ConnectorSuggestion[] {
  const ordered = [...floors].sort((a, b) => a.level - b.level)
  const used = new Set<string>(linkedNodeIds)
  const suggestions: ConnectorSuggestion[] = []

  for (const { kind, label } of KINDS) {
    let count = 0
    ordered.forEach((floor, index) => {
      for (const anchor of floor.nodes) {
        if (anchor.type !== kind || used.has(anchor.id)) continue
        const stops = [{ floorId: floor.floorId, nodeId: anchor.id }]
        const taken = [anchor.id]
        for (const other of ordered.slice(index + 1)) {
          let best: SuggestionNode | undefined
          let bestDistance = maxDistancePercent
          for (const candidate of other.nodes) {
            if (candidate.type !== kind || used.has(candidate.id)) continue
            const distance = Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y)
            if (distance <= bestDistance) {
              best = candidate
              bestDistance = distance
            }
          }
          if (best) {
            stops.push({ floorId: other.floorId, nodeId: best.id })
            taken.push(best.id)
          }
        }
        if (stops.length < 2) continue
        taken.forEach((id) => used.add(id))
        count += 1
        suggestions.push({ kind, name: anchor.name?.trim() || `${label} ${count}`, stops })
      }
    })
  }
  return suggestions
}
