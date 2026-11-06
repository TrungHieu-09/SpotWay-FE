import type { PercentPoint } from '../types/geometry.ts'
import type { ConnectorKind } from '../types/graph.ts'

type PointWithId = PercentPoint & { id: string }

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
