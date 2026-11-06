import type {
  IndoorRoute,
  Maneuver,
  NodeHazardType,
  RouteInstruction,
  RouteStep,
  VerticalLink,
  VerticalLinkDirection,
  VerticalLinkKind,
} from '../types/navigation'

export type PathfindingNode = { id: string; floorId: string; x: number; y: number; type: string; accessible?: boolean; name?: string | null; hazard?: NodeHazardType }
export type PathfindingEdge = { id: string; floorId: string; fromNodeId: string; toNodeId: string; accessible?: boolean; status?: 'ACTIVE' | 'BLOCKED'; hazard?: NodeHazardType }
export type VerticalTiming = { waitSeconds: number; travelSecondsPerFloor: number }
export type PathfindingOptions = {
  wheelchairMode?: boolean; emergencyMode?: 'NONE' | 'FIRE'; blockedNodeIds?: ReadonlySet<string>; blockedEdgeIds?: ReadonlySet<string>
  floorLevels?: Record<string, number>; floorNames?: Record<string, string>; mapUnitsPerMeter?: Record<string, number>; northOffsetDegrees?: Record<string, number>
  allowedTransitions?: ReadonlySet<VerticalLinkKind>; defaultEscalatorDirection?: VerticalLinkDirection; hazardSafetyRadiusMeters?: number
  timing?: Partial<Record<VerticalLinkKind, VerticalTiming>>; walkingSpeedMps?: number
}
export type RouteTarget = string | { findNearestExit: boolean } | { nodeIds: string[] }
export const DEFAULT_MAP_UNITS_PER_METER = 10
export const DEFAULT_WALKING_SPEED_MPS = 1.2
export const DEFAULT_HAZARD_SAFETY_RADIUS_METERS = 8
export const DEFAULT_VERTICAL_TIMING: Record<VerticalLinkKind, VerticalTiming> = {
  ELEVATOR: { waitSeconds: 30, travelSecondsPerFloor: 4 }, STAIR: { waitSeconds: 0, travelSecondsPerFloor: 18 }, ESCALATOR: { waitSeconds: 0, travelSecondsPerFloor: 12 },
}
export const MANEUVER_THRESHOLDS = { straight: 15, slight: 45, turn: 135 }
const exits = new Set(['EXIT', 'EMERGENCY_EXIT'])
const round2 = (value: number) => Math.round(value * 100) / 100

export const normalize360 = (angle: number) => ((angle % 360) + 360) % 360
export const mapBearing = (from: { x: number; y: number }, to: { x: number; y: number }) => normalize360(Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI)
export const deltaBearing = (incoming: number, outgoing: number) => ((outgoing - incoming + 540) % 360) - 180
export function classifyManeuver(delta: number): Maneuver {
  const magnitude = Math.abs(delta); const right = delta >= 0
  if (magnitude < MANEUVER_THRESHOLDS.straight) return 'STRAIGHT'
  if (magnitude < MANEUVER_THRESHOLDS.slight) return right ? 'SLIGHT_RIGHT' : 'SLIGHT_LEFT'
  if (magnitude < MANEUVER_THRESHOLDS.turn) return right ? 'TURN_RIGHT' : 'TURN_LEFT'
  return right ? 'U_TURN_RIGHT' : 'U_TURN_LEFT'
}

export const isExitNode = (node: PathfindingNode) => exits.has(node.type)
export function getExitCandidates(nodes: PathfindingNode[], floorLevels: Record<string, number> = {}) {
  const declared = nodes.filter(isExitNode)
  if (declared.length) return declared
  const levels = Object.values(floorLevels); const ground = levels.length ? Math.min(...levels) : undefined
  return nodes.filter((node) => node.type === 'DOOR' && (ground === undefined || floorLevels[node.floorId] === ground))
}
function passable(node: PathfindingNode, options: PathfindingOptions) {
  return !options.blockedNodeIds?.has(node.id) && node.hazard !== 'FIRE' && node.hazard !== 'BLOCKED' && !(options.wheelchairMode && node.accessible === false)
}

export function inferVerticalLinks(nodes: PathfindingNode[], levels: Record<string, number>, existing: VerticalLink[] = [], maxOffset = 150) {
  const linked = new Set(existing.flatMap((item) => [item.nodeIdFrom, item.nodeIdTo])); const output: VerticalLink[] = []
  for (const kind of ['ELEVATOR', 'STAIR', 'ESCALATOR'] as const) {
    const candidates = nodes.filter((node) => node.type === kind && levels[node.floorId] !== undefined)
    for (const from of candidates) {
      if (linked.has(from.id)) continue
      for (const to of candidates) {
        const delta = levels[to.floorId] - levels[from.floorId]
        if ((kind === 'ELEVATOR' ? delta <= 0 : delta !== 1) || Math.hypot(to.x - from.x, to.y - from.y) > maxOffset) continue
        output.push({ id: `inferred-${from.id}-${to.id}`, nodeIdFrom: from.id, nodeIdTo: to.id, kind })
      }
    }
  }
  return output
}

type Arc = { to: string; kind: 'WALK' | VerticalLinkKind; cost: number; seconds: number; meters: number; waitSeconds: number }
type QueueItem = { id: string; risk: number; cost: number }
class MinHeap {
  private readonly values: QueueItem[] = []
  get size() { return this.values.length }
  push(value: QueueItem) { this.values.push(value); for (let i = this.values.length - 1; i > 0;) { const parent = (i - 1) >> 1; if (compare(this.values[i], this.values[parent]) >= 0) break; [this.values[i], this.values[parent]] = [this.values[parent], this.values[i]]; i = parent } }
  pop() { const first = this.values[0]; const last = this.values.pop(); if (this.values.length && last) { this.values[0] = last; for (let i = 0;;) { const left = i * 2 + 1; const right = left + 1; let best = i; if (left < this.values.length && compare(this.values[left], this.values[best]) < 0) best = left; if (right < this.values.length && compare(this.values[right], this.values[best]) < 0) best = right; if (best === i) break; [this.values[i], this.values[best]] = [this.values[best], this.values[i]]; i = best } } return first }
}
function compare(left: QueueItem, right: QueueItem) { return Math.abs(left.risk - right.risk) > 1e-9 ? left.risk - right.risk : left.cost !== right.cost ? left.cost - right.cost : left.id.localeCompare(right.id) }

function transitionAllowed(link: VerticalLink, options: PathfindingOptions) {
  if (link.status === 'BLOCKED' || (options.allowedTransitions && !options.allowedTransitions.has(link.kind))) return false
  if (options.wheelchairMode && (link.kind !== 'ELEVATOR' || link.accessible === false)) return false
  if (options.emergencyMode === 'FIRE' && (link.kind === 'ELEVATOR' || !(link.emergencyAllowed ?? link.kind === 'STAIR'))) return false
  return true
}
function buildGraph(nodes: Map<string, PathfindingNode>, edges: PathfindingEdge[], links: VerticalLink[], options: PathfindingOptions) {
  const graph = new Map<string, Arc[]>(); const push = (id: string, arc: Arc) => graph.set(id, [...(graph.get(id) ?? []), arc])
  const units = (floorId: string) => options.mapUnitsPerMeter?.[floorId] && options.mapUnitsPerMeter[floorId] > 0 ? options.mapUnitsPerMeter[floorId] : DEFAULT_MAP_UNITS_PER_METER
  const speed = options.walkingSpeedMps ?? DEFAULT_WALKING_SPEED_MPS
  for (const edge of edges) {
    if (edge.status === 'BLOCKED' || edge.hazard === 'FIRE' || edge.hazard === 'BLOCKED' || options.blockedEdgeIds?.has(edge.id) || (options.wheelchairMode && edge.accessible === false)) continue
    const from = nodes.get(edge.fromNodeId); const to = nodes.get(edge.toNodeId)
    if (!from || !to || from.floorId !== to.floorId) continue
    const meters = Math.hypot(to.x - from.x, to.y - from.y) / units(from.floorId); const seconds = meters / speed
    const smoky = edge.hazard === 'SMOKE' || from.hazard === 'SMOKE' || to.hazard === 'SMOKE'; const arc = { kind: 'WALK' as const, cost: smoky ? seconds * 3 : seconds, seconds, meters, waitSeconds: 0 }
    push(from.id, { ...arc, to: to.id }); push(to.id, { ...arc, to: from.id })
  }
  const timing = { ...DEFAULT_VERTICAL_TIMING, ...options.timing }
  for (const link of links) {
    if (!transitionAllowed(link, options)) continue
    const from = nodes.get(link.nodeIdFrom); const to = nodes.get(link.nodeIdTo); if (!from || !to || from.floorId === to.floorId) continue
    const fromLevel = options.floorLevels?.[from.floorId]; const toLevel = options.floorLevels?.[to.floorId]; const floors = fromLevel === undefined || toLevel === undefined ? 1 : Math.max(1, Math.abs(fromLevel - toLevel)); const time = timing[link.kind]
    const arc = { kind: link.kind, cost: time.waitSeconds + time.travelSecondsPerFloor * floors, seconds: time.waitSeconds + time.travelSecondsPerFloor * floors, meters: 0, waitSeconds: time.waitSeconds }
    const direction = link.kind === 'ESCALATOR' ? (link.direction ?? options.defaultEscalatorDirection ?? 'BIDIRECTIONAL') : 'BIDIRECTIONAL'; const upward = fromLevel === undefined || toLevel === undefined || fromLevel < toLevel
    if (direction === 'BIDIRECTIONAL' || (direction === 'UP') === upward) push(from.id, { ...arc, to: to.id })
    if (direction === 'BIDIRECTIONAL' || (direction === 'UP') !== upward) push(to.id, { ...arc, to: from.id })
  }
  return graph
}

export function nodeRisk(node: PathfindingNode, hazards: PathfindingNode[], radius: number, units: number) {
  return hazards.filter((hazard) => hazard.floorId === node.floorId).reduce((risk, hazard) => { const distance = Math.hypot(hazard.x - node.x, hazard.y - node.y) / units; return distance < radius ? risk + 1 - distance / radius : risk }, 0)
}
function label(node: PathfindingNode) { return node.name ?? (node.type === 'EMERGENCY_EXIT' ? 'cửa thoát hiểm' : node.type === 'EXIT' ? 'cửa ra' : 'điểm đến') }
function maneuverText(maneuver: Maneuver) { return ({ START: 'Xuất phát, đi thẳng', STRAIGHT: 'Đi thẳng', SLIGHT_LEFT: 'Chếch trái', SLIGHT_RIGHT: 'Chếch phải', TURN_LEFT: 'Rẽ trái', TURN_RIGHT: 'Rẽ phải', U_TURN_LEFT: 'Quay đầu bên trái', U_TURN_RIGHT: 'Quay đầu bên phải' } as Partial<Record<Maneuver, string>>)[maneuver] ?? 'Đi thẳng' }

export function buildTurnByTurn(path: PathfindingNode[], arcs: Arc[], options: Pick<PathfindingOptions, 'floorLevels' | 'floorNames' | 'emergencyMode' | 'northOffsetDegrees'> = {}) {
  const instructions: RouteInstruction[] = []; let incoming: number | null = null
  const steps: RouteStep[] = path.map((node, index) => {
    const arc = arcs[index]; const next = path[index + 1]
    if (!arc || !next) return { nodeId: node.id, floorId: node.floorId, x: node.x, y: node.y, bearing: null, instruction: options.emergencyMode === 'FIRE' ? `Đã tới ${label(node)} — rời khỏi tòa nhà ngay` : `Đã đến ${label(node)}`, maneuver: options.emergencyMode === 'FIRE' ? 'ARRIVE_AT_SAFE_EXIT' : 'ARRIVE' }
    if (arc.kind !== 'WALK') {
      const lower = (options.floorLevels?.[next.floorId] ?? 0) < (options.floorLevels?.[node.floorId] ?? 0); const title = arc.kind === 'ELEVATOR' ? 'thang máy' : arc.kind === 'STAIR' ? 'thang bộ' : 'thang cuốn'; const instruction = `Đi ${title} ${lower ? 'xuống' : 'lên'} ${options.floorNames?.[next.floorId] ?? 'tầng tiếp theo'}${arc.waitSeconds ? ` (chờ ~${Math.round(arc.waitSeconds)} s)` : ''}`
      instructions.push({ maneuver: arc.kind, floorId: node.floorId, fromNodeId: node.id, toNodeId: next.id, distanceMeters: 0, bearing: null, deltaBearing: null, durationSeconds: round2(arc.seconds), waitSeconds: arc.waitSeconds || undefined, targetFloorId: next.floorId, text: instruction }); incoming = null
      return { nodeId: node.id, floorId: node.floorId, x: node.x, y: node.y, bearing: null, transition: arc.kind, targetFloorId: next.floorId, instruction, maneuver: arc.kind, waitSeconds: arc.waitSeconds || undefined }
    }
    const bearing = mapBearing(node, next); const delta = incoming === null ? null : deltaBearing(incoming, bearing); const maneuver = delta === null ? (index === 0 ? 'START' : 'STRAIGHT') : classifyManeuver(delta); const instruction = `${maneuverText(maneuver)} ${round2(arc.meters)} m`; instructions.push({ maneuver, floorId: node.floorId, fromNodeId: node.id, toNodeId: next.id, distanceMeters: round2(arc.meters), bearing: round2(normalize360(bearing + (options.northOffsetDegrees?.[node.floorId] ?? 0))), deltaBearing: delta === null ? null : round2(delta), durationSeconds: round2(arc.seconds), text: instruction }); incoming = bearing
    return { nodeId: node.id, floorId: node.floorId, x: node.x, y: node.y, bearing: round2(bearing), instruction, maneuver, distanceMeters: round2(arc.meters) }
  })
  return { instructions, steps }
}

export type HazardPolicyOutcome = { route: IndoorRoute | null; effectiveMode: 'NORMAL' | 'EVACUATION'; destinationCancelled: boolean; warningCode?: 'DESTINATION_IN_HAZARD' | 'NO_SAFE_EXIT_FOUND' | 'SOURCE_IN_HAZARD' }
export function findRouteWithHazardPolicy(startNodeId: string, target: RouteTarget, nodes: PathfindingNode[], edges: PathfindingEdge[], links: VerticalLink[], options: PathfindingOptions = {}): HazardPolicyOutcome {
  if (options.blockedNodeIds?.has(startNodeId)) return { route: null, effectiveMode: options.emergencyMode === 'FIRE' ? 'EVACUATION' : 'NORMAL', destinationCancelled: false, warningCode: 'SOURCE_IN_HAZARD' }
  const destinationCancelled = typeof target === 'string' && options.blockedNodeIds?.has(target) === true; const evacuation = options.emergencyMode === 'FIRE' || destinationCancelled
  const route = findIndoorRoute(startNodeId, evacuation && typeof target === 'string' ? { findNearestExit: true } : target, nodes, edges, links, { ...options, emergencyMode: evacuation ? 'FIRE' : options.emergencyMode })
  return { route, effectiveMode: evacuation ? 'EVACUATION' : 'NORMAL', destinationCancelled, warningCode: !route && evacuation ? 'NO_SAFE_EXIT_FOUND' : destinationCancelled ? 'DESTINATION_IN_HAZARD' : undefined }
}

export function findIndoorRoute(startNodeId: string, target: RouteTarget, nodes: PathfindingNode[], edges: PathfindingEdge[], links: VerticalLink[], options: PathfindingOptions = {}): IndoorRoute | null {
  const byId = new Map(nodes.map((node) => [node.id, node])); const start = byId.get(startNodeId); if (!start || !passable(start, options)) return null
  const rawTargets = typeof target === 'string' ? [target] : 'nodeIds' in target ? target.nodeIds : getExitCandidates(nodes, options.floorLevels).map((node) => node.id); const targets = new Set(rawTargets.filter((id) => { const node = byId.get(id); return !!node && passable(node, options) })); if (!targets.size) return null
  const graph = buildGraph(byId, edges, links, options); const hazards = nodes.filter((node) => options.blockedNodeIds?.has(node.id) || node.hazard === 'FIRE' || node.hazard === 'BLOCKED'); const units = (floorId: string) => options.mapUnitsPerMeter?.[floorId] && options.mapUnitsPerMeter[floorId] > 0 ? options.mapUnitsPerMeter[floorId] : DEFAULT_MAP_UNITS_PER_METER; const risk = (node: PathfindingNode) => nodeRisk(node, hazards, options.hazardSafetyRadiusMeters ?? DEFAULT_HAZARD_SAFETY_RADIUS_METERS, units(node.floorId))
  const best = new Map<string, QueueItem>([[start.id, { id: start.id, risk: risk(start), cost: 0 }]]); const previous = new Map<string, { from: string; arc: Arc }>(); const visited = new Set<string>(); const queue = new MinHeap(); queue.push(best.get(start.id) as QueueItem); let reached: string | undefined
  while (queue.size) { const current = queue.pop(); if (!current || visited.has(current.id)) continue; visited.add(current.id); if (targets.has(current.id)) { reached = current.id; break } for (const arc of graph.get(current.id) ?? []) { const node = byId.get(arc.to); if (!node || visited.has(node.id) || !passable(node, options)) continue; const candidate = { id: node.id, risk: current.risk + risk(node), cost: current.cost + arc.cost }; const known = best.get(node.id); if (!known || compare(candidate, known) < 0) { best.set(node.id, candidate); previous.set(node.id, { from: current.id, arc }); queue.push(candidate) } } }
  if (!reached) return null
  const ids = [reached]; const arcs: Arc[] = []; for (let current = reached; current !== start.id;) { const item = previous.get(current); if (!item) return null; arcs.unshift(item.arc); ids.unshift(item.from); current = item.from }
  const path = ids.map((id) => byId.get(id) as PathfindingNode); const ridden = arcs.map((arc, index) => arc.kind === 'ELEVATOR' && arcs[index - 1]?.kind === 'ELEVATOR' ? { ...arc, seconds: arc.seconds - arc.waitSeconds, waitSeconds: 0 } : arc); const turns = buildTurnByTurn(path, ridden, options); const walking = ridden.filter((arc) => arc.kind === 'WALK').reduce((sum, arc) => sum + arc.seconds, 0); const transition = ridden.filter((arc) => arc.kind !== 'WALK').reduce((sum, arc) => sum + arc.seconds, 0)
  return { totalDistance: round2(ridden.reduce((sum, arc) => sum + arc.meters, 0)), estimatedDurationSeconds: Math.round(walking + transition), walkingDurationSeconds: Math.round(walking), transitionDurationSeconds: Math.round(transition), nodeIds: ids, ...turns }
}
