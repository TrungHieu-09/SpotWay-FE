import type { ConnectorKind, GraphNode } from '../api/graph'

export type SuggestionFloor = {
  floorId: string
  level: number
  mapWidth: number
  mapHeight: number
  nodes: readonly GraphNode[]
}
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
 * Gợi ý connector: node cùng loại nằm gần như cùng vị trí (%) ở nhiều tầng thì coi là một trục.
 * Node đã thuộc connector (`linkedNodeIds`) bị bỏ qua. Mỗi cụm cần ≥ 2 tầng, mỗi tầng một node.
 */
export function suggestConnectors(
  floors: readonly SuggestionFloor[],
  linkedNodeIds: ReadonlySet<string>,
  maxDistancePercent = 8,
): ConnectorSuggestion[] {
  const ordered = [...floors].sort((a, b) => a.level - b.level)
  const pct = (floor: SuggestionFloor, node: GraphNode) => ({
    x: (node.x / floor.mapWidth) * 100,
    y: (node.y / floor.mapHeight) * 100,
  })
  const used = new Set<string>(linkedNodeIds)
  const suggestions: ConnectorSuggestion[] = []

  for (const { kind, label } of KINDS) {
    let count = 0
    ordered.forEach((floor, index) => {
      for (const anchor of floor.nodes) {
        if (anchor.type !== kind || used.has(anchor.id)) continue
        const anchorPoint = pct(floor, anchor)
        const stops = [{ floorId: floor.floorId, nodeId: anchor.id }]
        const taken = [anchor.id]
        for (const other of ordered.slice(index + 1)) {
          let best: GraphNode | undefined
          let bestDistance = maxDistancePercent
          for (const candidate of other.nodes) {
            if (candidate.type !== kind || used.has(candidate.id)) continue
            const point = pct(other, candidate)
            const distance = Math.hypot(point.x - anchorPoint.x, point.y - anchorPoint.y)
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
