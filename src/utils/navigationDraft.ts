import type { NavigationDraft, NavigationDraftEdge, NavigationDraftNode } from '../api/graph'

const MARGIN = 0.1
const SEED_CONFIDENCE = 0.3

const round1 = (value: number) => Math.round(value * 10) / 10

/**
 * Bản nháp mẫu khi AI không nhận diện được node: một hành lang ngang ở giữa bản đồ
 * cắt một hành lang dọc ở giữa. Toạ độ theo đơn vị bản đồ (cùng hệ với GraphNode.x/y).
 */
export function buildCorridorDraft(mapWidth: number, mapHeight: number, warnings: string[] = []): NavigationDraft {
  const at = (px: number, py: number) => ({ x: round1(mapWidth * px), y: round1(mapHeight * py) })
  const node = (id: string, px: number, py: number, type: NavigationDraftNode['type']): NavigationDraftNode => ({
    id,
    ...at(px, py),
    name: null,
    type,
    accessible: true,
    confidence: SEED_CONFIDENCE,
    requiresConfirmation: true,
  })
  const nodes: NavigationDraftNode[] = [
    node('seed-w', MARGIN, 0.5, 'NORMAL'),
    node('seed-w2', 0.3, 0.5, 'NORMAL'),
    node('seed-c', 0.5, 0.5, 'JUNCTION'),
    node('seed-e2', 0.7, 0.5, 'NORMAL'),
    node('seed-e', 1 - MARGIN, 0.5, 'NORMAL'),
    node('seed-n', 0.5, MARGIN + 0.05, 'NORMAL'),
    node('seed-s', 0.5, 0.95 - MARGIN, 'NORMAL'),
  ]
  const link = (from: string, to: string): NavigationDraftEdge => ({
    id: `seed-edge-${from}-${to}`,
    fromNodeId: from,
    toNodeId: to,
    accessible: true,
    confidence: SEED_CONFIDENCE,
    requiresConfirmation: true,
  })
  return {
    nodes,
    edges: [
      link('seed-w', 'seed-w2'),
      link('seed-w2', 'seed-c'),
      link('seed-c', 'seed-e2'),
      link('seed-e2', 'seed-e'),
      link('seed-c', 'seed-n'),
      link('seed-c', 'seed-s'),
    ],
    warnings: [...warnings, 'Bản nháp mẫu dọc hành lang (không phải kết quả AI) — hãy kéo các điểm vàng cho khớp sơ đồ trước khi áp dụng.'],
  }
}
