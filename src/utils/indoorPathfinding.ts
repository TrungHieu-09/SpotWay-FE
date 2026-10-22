import type {
  IndoorRoute,
  NodeHazardType,
  RouteStep,
  VerticalLink,
  VerticalLinkKind,
} from '../types/navigation'

export type PathfindingNode = {
  id: string
  floorId: string
  x: number
  y: number
  type: string
  accessible?: boolean
  name?: string | null
  hazard?: NodeHazardType
}

export type PathfindingEdge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  accessible?: boolean
  status?: 'ACTIVE' | 'BLOCKED'
  hazard?: NodeHazardType
}

export type PathfindingOptions = {
  wheelchairMode?: boolean
  emergencyMode?: 'NONE' | 'FIRE'
  blockedNodeIds?: Set<string>
  blockedEdgeIds?: Set<string>
  /** floorId -> floorNumber, dùng để tính số tầng của vertical link và chọn cửa ra tầng trệt */
  floorLevels?: Record<string, number>
  /** floorId -> tên hiển thị trong chỉ dẫn */
  floorNames?: Record<string, string>
}

export type RouteTarget = string | { findNearestExit: boolean }

const EXIT_TYPES = new Set(['EXIT', 'EMERGENCY_EXIT'])
const SMOKE_PENALTY = 3
const WALKING_SPEED = 1.2

type Adjacent = { to: string; cost: number; distance: number; transition?: VerticalLinkKind }

export function isExitNode(node: PathfindingNode) {
  return EXIT_TYPES.has(node.type)
}

export function isNodePassable(node: PathfindingNode, options: PathfindingOptions) {
  if (options.blockedNodeIds?.has(node.id)) return false
  if (node.hazard === 'FIRE' || node.hazard === 'BLOCKED') return false
  if (options.wheelchairMode && node.accessible === false) return false
  return true
}

function verticalCost(kind: VerticalLinkKind, floorsCrossed: number) {
  if (kind === 'ELEVATOR') return 25 + 5 * floorsCrossed
  if (kind === 'STAIR') return 18 * floorsCrossed
  return 12 * floorsCrossed
}

/**
 * Danh sách node có thể làm lối thoát: EXIT/EMERGENCY_EXIT; nếu tòa nhà chưa khai báo,
 * dùng tạm các DOOR ở tầng thấp nhất.
 */
export function getExitCandidates(nodes: PathfindingNode[], floorLevels: Record<string, number> = {}) {
  const exits = nodes.filter(isExitNode)
  if (exits.length > 0) return exits
  const levels = Object.values(floorLevels)
  const groundLevel = levels.length > 0 ? Math.min(...levels) : undefined
  return nodes.filter(
    (node) => node.type === 'DOOR' && (groundLevel === undefined || floorLevels[node.floorId] === groundLevel),
  )
}

function buildAdjacency(
  nodeById: Map<string, PathfindingNode>,
  edges: PathfindingEdge[],
  verticalLinks: VerticalLink[],
  options: PathfindingOptions,
) {
  const adjacency = new Map<string, Adjacent[]>()
  const push = (from: string, item: Adjacent) => {
    const list = adjacency.get(from)
    if (list) list.push(item)
    else adjacency.set(from, [item])
  }

  for (const edge of edges) {
    if (edge.status === 'BLOCKED' || edge.hazard === 'FIRE' || edge.hazard === 'BLOCKED') continue
    if (options.blockedEdgeIds?.has(edge.id)) continue
    if (options.wheelchairMode && edge.accessible === false) continue
    const from = nodeById.get(edge.fromNodeId)
    const to = nodeById.get(edge.toNodeId)
    if (!from || !to) continue
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    const smoky = edge.hazard === 'SMOKE' || from.hazard === 'SMOKE' || to.hazard === 'SMOKE'
    const cost = smoky ? distance * SMOKE_PENALTY : distance
    push(from.id, { to: to.id, cost, distance })
    push(to.id, { to: from.id, cost, distance })
  }

  for (const link of verticalLinks) {
    if (options.emergencyMode === 'FIRE' && link.kind === 'ELEVATOR') continue
    if (options.wheelchairMode && link.kind !== 'ELEVATOR') continue
    const from = nodeById.get(link.nodeIdFrom)
    const to = nodeById.get(link.nodeIdTo)
    if (!from || !to) continue
    const levels = options.floorLevels ?? {}
    const fromLevel = levels[from.floorId]
    const toLevel = levels[to.floorId]
    const floorsCrossed =
      fromLevel !== undefined && toLevel !== undefined ? Math.max(1, Math.abs(toLevel - fromLevel)) : 1
    const cost = verticalCost(link.kind, floorsCrossed)
    push(from.id, { to: to.id, cost, distance: 0, transition: link.kind })
    push(to.id, { to: from.id, cost, distance: 0, transition: link.kind })
  }

  return adjacency
}

/**
 * Nối các node STAIR/ESCALATOR/ELEVATOR cùng loại ở 2 tầng liền kề (gần vị trí nhất)
 * khi backend chưa trả vertical link tương ứng.
 */
export function inferVerticalLinks(
  nodes: PathfindingNode[],
  floorLevels: Record<string, number>,
  existing: VerticalLink[] = [],
  maxOffset = 15,
) {
  const linked = new Set(existing.flatMap((link) => [link.nodeIdFrom, link.nodeIdTo]))
  const inferred: VerticalLink[] = []
  const kinds: VerticalLinkKind[] = ['ELEVATOR', 'STAIR', 'ESCALATOR']

  for (const kind of kinds) {
    const candidates = nodes.filter((node) => node.type === kind && floorLevels[node.floorId] !== undefined)
    for (const from of candidates) {
      if (linked.has(from.id)) continue
      const fromLevel = floorLevels[from.floorId]
      // Thang máy đi thẳng tới mọi tầng trong cùng trục (chỉ chờ thang 1 lần), thang bộ/cuốn chỉ nối tầng liền kề
      const bestByFloor = new Map<string, { node: PathfindingNode; offset: number }>()
      for (const to of candidates) {
        const toLevel = floorLevels[to.floorId]
        if (kind === 'ELEVATOR' ? toLevel <= fromLevel : toLevel !== fromLevel + 1) continue
        const offset = Math.hypot(to.x - from.x, to.y - from.y)
        const best = bestByFloor.get(to.floorId)
        if (offset <= maxOffset && (!best || offset < best.offset)) bestByFloor.set(to.floorId, { node: to, offset })
      }
      for (const { node: to } of bestByFloor.values()) {
        inferred.push({ id: `inferred-${from.id}-${to.id}`, nodeIdFrom: from.id, nodeIdTo: to.id, kind })
      }
    }
  }
  return inferred
}

function bearingBetween(from: PathfindingNode, to: PathfindingNode) {
  // Hệ toạ độ ảnh: y hướng xuống, 0° = hướng lên trên sơ đồ
  const degrees = (Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI
  return (degrees + 360) % 360
}

function nodeLabel(node: PathfindingNode) {
  if (node.name) return node.name
  if (node.type === 'EMERGENCY_EXIT') return 'Cửa thoát hiểm'
  if (node.type === 'EXIT') return 'Cửa ra'
  return 'điểm đến'
}

const TRANSITION_LABEL: Record<VerticalLinkKind, string> = {
  ELEVATOR: 'thang máy',
  STAIR: 'thang bộ',
  ESCALATOR: 'thang cuốn',
}

/** Sinh chỉ dẫn turn-by-turn từ chuỗi node của tuyến đường. */
export function buildTurnByTurnSteps(
  path: PathfindingNode[],
  transitions: Array<VerticalLinkKind | undefined>,
  options: Pick<PathfindingOptions, 'floorLevels' | 'floorNames' | 'emergencyMode'> = {},
): RouteStep[] {
  const steps: RouteStep[] = []
  let previousBearing: number | null = null

  path.forEach((node, index) => {
    const next = path[index + 1]
    const transition = transitions[index]
    const isVertical = transition !== undefined
    const bearing = next && !isVertical ? bearingBetween(node, next) : previousBearing
    let instruction: string

    if (!next) {
      instruction =
        options.emergencyMode === 'FIRE'
          ? `Đã tới ${nodeLabel(node)} — rời khỏi tòa nhà ngay`
          : `Đã đến ${nodeLabel(node)}`
    } else if (isVertical) {
      const fromLevel = options.floorLevels?.[node.floorId]
      const toLevel = options.floorLevels?.[next.floorId]
      const direction = fromLevel !== undefined && toLevel !== undefined && toLevel < fromLevel ? 'xuống' : 'lên'
      const target = options.floorNames?.[next.floorId] ?? (toLevel !== undefined ? `Tầng ${toLevel}` : 'tầng tiếp theo')
      instruction = `Đi ${TRANSITION_LABEL[transition]} ${direction} ${target}`
    } else if (index === 0) {
      instruction = options.emergencyMode === 'FIRE' ? 'Bình tĩnh, di chuyển theo lối thoát hiểm' : 'Bắt đầu di chuyển'
    } else if (previousBearing === null || bearing === null) {
      instruction = 'Đi thẳng'
    } else {
      const delta = ((bearing - previousBearing + 540) % 360) - 180
      if (delta > 135 || delta < -135) instruction = 'Quay đầu'
      else if (delta > 30) instruction = 'Rẽ phải'
      else if (delta < -30) instruction = 'Rẽ trái'
      else instruction = 'Đi thẳng'
    }

    steps.push({
      nodeId: node.id,
      floorId: node.floorId,
      x: node.x,
      y: node.y,
      bearing,
      transition,
      targetFloorId: isVertical ? next?.floorId : undefined,
      instruction,
    })
    if (!isVertical && next) previousBearing = bearing
    if (isVertical) previousBearing = null
  })

  return steps
}

/**
 * Dijkstra đa tầng có tính an toàn PCCC.
 * - target là nodeId: tìm đường tới node đó.
 * - target là { findNearestExit: true }: tìm lối thoát an toàn gần nhất (bỏ qua lối thoát bị chặn).
 */
export function findIndoorRoute(
  startNodeId: string,
  target: RouteTarget,
  nodes: PathfindingNode[],
  edges: PathfindingEdge[],
  verticalLinks: VerticalLink[],
  options: PathfindingOptions = {},
): IndoorRoute | null {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const start = nodeById.get(startNodeId)
  if (!start || !isNodePassable(start, options)) return null

  const targetIds =
    typeof target === 'string'
      ? new Set([target])
      : new Set(
          getExitCandidates(nodes, options.floorLevels)
            .filter((node) => isNodePassable(node, options))
            .map((node) => node.id),
        )
  if (targetIds.size === 0) return null

  const adjacency = buildAdjacency(nodeById, edges, verticalLinks, options)
  const cost = new Map<string, number>([[startNodeId, 0]])
  const previous = new Map<string, { from: string; distance: number; transition?: VerticalLinkKind }>()
  const visited = new Set<string>()
  const queue: Array<{ id: string; cost: number }> = [{ id: startNodeId, cost: 0 }]
  let reached: string | undefined

  while (queue.length > 0) {
    let minIndex = 0
    for (let i = 1; i < queue.length; i += 1) if (queue[i].cost < queue[minIndex].cost) minIndex = i
    const [current] = queue.splice(minIndex, 1)
    if (visited.has(current.id)) continue
    visited.add(current.id)
    if (targetIds.has(current.id)) {
      reached = current.id
      break
    }

    for (const next of adjacency.get(current.id) ?? []) {
      const nextNode = nodeById.get(next.to)
      if (!nextNode || visited.has(next.to) || !isNodePassable(nextNode, options)) continue
      const nextCost = current.cost + next.cost
      if (nextCost < (cost.get(next.to) ?? Infinity)) {
        cost.set(next.to, nextCost)
        previous.set(next.to, { from: current.id, distance: next.distance, transition: next.transition })
        queue.push({ id: next.to, cost: nextCost })
      }
    }
  }

  if (!reached) return null

  const nodeIds: string[] = [reached]
  const transitions: Array<VerticalLinkKind | undefined> = [undefined]
  let totalDistance = 0
  let cursor = reached
  while (cursor !== startNodeId) {
    const link = previous.get(cursor)
    if (!link) return null
    totalDistance += link.distance
    nodeIds.unshift(link.from)
    transitions.unshift(link.transition)
    cursor = link.from
  }

  const path = nodeIds.map((id) => nodeById.get(id) as PathfindingNode)
  const totalCost = cost.get(reached) ?? 0
  return {
    totalDistance,
    estimatedDurationSeconds: Math.round(totalCost / WALKING_SPEED),
    nodeIds,
    steps: buildTurnByTurnSteps(path, transitions, options),
  }
}
