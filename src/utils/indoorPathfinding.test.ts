import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyManeuver,
  deltaBearing,
  findIndoorRoute,
  findRouteWithHazardPolicy,
  inferVerticalLinks,
  mapBearing,
  type PathfindingEdge,
  type PathfindingNode,
} from './indoorPathfinding.ts'

let edgeSeq = 0
const node = (id: string, floorId: string, x: number, y: number, type = 'NORMAL'): PathfindingNode => ({ id, floorId, x, y, type })
const edge = (a: string, b: string, floorId: string, extra: Partial<PathfindingEdge> = {}): PathfindingEdge => ({
  id: `e${edgeSeq++}`,
  floorId,
  fromNodeId: a,
  toNodeId: b,
  ...extra,
})
const maneuvers = (route: ReturnType<typeof findIndoorRoute>) => route?.instructions?.map((item) => item.maneuver) ?? []
const lastNode = (route: ReturnType<typeof findIndoorRoute>) => route?.nodeIds.at(-1)

describe('bearing & maneuver', () => {
  it('wrap-around: 350° -> 10° = +20°, 10° -> 350° = -20°', () => {
    assert.equal(deltaBearing(350, 10), 20)
    assert.equal(deltaBearing(10, 350), -20)
  })
  it('bearing la bàn trên canvas y-down: lên = 0°, phải = 90°', () => {
    assert.equal(mapBearing({ x: 0, y: 0 }, { x: 0, y: -1 }), 0)
    assert.equal(mapBearing({ x: 0, y: 0 }, { x: 1, y: 0 }), 90)
    assert.equal(mapBearing({ x: 0, y: 0 }, { x: 0, y: 1 }), 180)
    assert.equal(mapBearing({ x: 0, y: 0 }, { x: -1, y: 0 }), 270)
  })
  it('boundary 15° / 45° / 135°', () => {
    assert.equal(classifyManeuver(14.99), 'STRAIGHT')
    assert.equal(classifyManeuver(15), 'SLIGHT_RIGHT')
    assert.equal(classifyManeuver(-15), 'SLIGHT_LEFT')
    assert.equal(classifyManeuver(44.99), 'SLIGHT_RIGHT')
    assert.equal(classifyManeuver(45), 'TURN_RIGHT')
    assert.equal(classifyManeuver(-45), 'TURN_LEFT')
    assert.equal(classifyManeuver(134.99), 'TURN_RIGHT')
    assert.equal(classifyManeuver(135), 'U_TURN_RIGHT')
    assert.equal(classifyManeuver(-180), 'U_TURN_LEFT')
  })
})

describe('đường ngắn nhất cùng tầng', () => {
  const nodes = [node('s', 'G', 0, 0), node('a', 'G', 100, 0), node('b', 'G', 200, -50), node('c', 'G', 200, 100), node('far', 'G', 330, 100), node('d', 'G', 100, 100)]
  const edges = [edge('s', 'a', 'G'), edge('a', 'b', 'G'), edge('b', 'c', 'G'), edge('c', 'far', 'G'), edge('a', 'd', 'G'), edge('d', 'c', 'G')]
  const options = { floorLevels: { G: 1 }, mapUnitsPerMeter: { G: 10 } }

  it('chọn đường có tổng chi phí nhỏ nhất, gom đoạn thẳng và tính mét chính xác', () => {
    const route = findIndoorRoute('s', 'far', nodes, edges, [], options)
    assert.ok(route)
    assert.deepEqual(route.nodeIds, ['s', 'a', 'd', 'c', 'far'])
    const total = route.instructions?.reduce((sum, item) => sum + item.distanceMeters, 0) ?? 0
    assert.ok(Math.abs(total - route.totalDistance) <= 0.01)
    assert.equal(route.totalDistance, 10 + 10 + 10 + 13)
    assert.deepEqual(maneuvers(route), ['START', 'TURN_RIGHT', 'TURN_LEFT', 'ARRIVE'])
  })
  it('hai tầng có tỉ lệ khác nhau vẫn quy đổi mét đúng', () => {
    const multi = [node('p', 'G', 0, 0, 'STAIR'), node('q', 'G', 100, 0), node('p2', 'F2', 0, 0, 'STAIR'), node('r', 'F2', 100, 0)]
    const links = inferVerticalLinks(multi, { G: 1, F2: 2 })
    const route = findIndoorRoute('q', 'r', multi, [edge('q', 'p', 'G'), edge('p2', 'r', 'F2')], links, {
      floorLevels: { G: 1, F2: 2 },
      mapUnitsPerMeter: { G: 10, F2: 20 },
    })
    assert.equal(route?.totalDistance, 15) // 10 m ở tầng G + 5 m ở tầng F2
  })
  it('không đường nối trả null', () => {
    assert.equal(findIndoorRoute('s', 'far', nodes, [], [], options), null)
  })
})

describe('chế độ xe lăn', () => {
  const nodes = [
    node('start', 'G', 0, 0), node('lobby', 'G', 100, 0), node('stairG', 'G', 100, 100, 'STAIR'), node('escG', 'G', 200, 100, 'ESCALATOR'), node('elevG', 'G', 300, 100, 'ELEVATOR'),
    node('stairF2', 'F2', 100, 100, 'STAIR'), node('escF2', 'F2', 200, 100, 'ESCALATOR'), node('elevF2', 'F2', 300, 100, 'ELEVATOR'), node('shop', 'F2', 300, 200),
  ]
  const edges = [
    edge('start', 'lobby', 'G'), edge('lobby', 'stairG', 'G'), edge('lobby', 'escG', 'G'), edge('lobby', 'elevG', 'G'),
    edge('stairF2', 'shop', 'F2'), edge('escF2', 'shop', 'F2'), edge('elevF2', 'shop', 'F2'),
  ]
  const links = inferVerticalLinks(nodes, { G: 1, F2: 2 })
  const options = { floorLevels: { G: 1, F2: 2 }, mapUnitsPerMeter: { G: 10, F2: 10 } }

  it('loại thang bộ và thang cuốn, chỉ đi thang máy', () => {
    const route = findIndoorRoute('start', 'shop', nodes, edges, links, { ...options, wheelchairMode: true })
    const kinds = maneuvers(route)
    assert.ok(kinds.includes('ELEVATOR'))
    assert.ok(!kinds.includes('STAIR') && !kinds.includes('ESCALATOR'))
  })
  it('thang bộ và thang cuốn bị loại riêng lẻ khi xe lăn', () => {
    for (const kind of ['STAIR', 'ESCALATOR'] as const) {
      const only = links.filter((link) => link.kind === kind)
      assert.equal(findIndoorRoute('start', 'shop', nodes, edges, only, { ...options, wheelchairMode: true }), null)
      assert.ok(findIndoorRoute('start', 'shop', nodes, edges, only, options))
    }
  })
  it('loại cạnh accessible=false và vertical link accessible=false', () => {
    const blockedEdges = edges.map((item) => (item.toNodeId === 'elevG' ? { ...item, accessible: false } : item))
    assert.equal(findIndoorRoute('start', 'shop', nodes, blockedEdges, links, { ...options, wheelchairMode: true }), null)
    const inaccessibleLinks = links.map((link) => (link.kind === 'ELEVATOR' ? { ...link, accessible: false } : link))
    assert.equal(findIndoorRoute('start', 'shop', nodes, edges, inaccessibleLinks, { ...options, wheelchairMode: true }), null)
  })
})

describe('chế độ hỏa hoạn', () => {
  const nodes = [
    node('src', 'G', 100, 100), node('fireTarget', 'G', 160, 100), node('nearFire', 'G', 150, 140), node('safeAway', 'G', 40, 100),
    node('exit1', 'G', 200, 200, 'EMERGENCY_EXIT'), node('exit2', 'G', 0, 250, 'EMERGENCY_EXIT'), node('exit3', 'G', -150, 0, 'EXIT'),
    node('lift', 'G', 100, 300, 'ELEVATOR'), node('liftF2', 'F2', 100, 300, 'ELEVATOR'), node('stair', 'G', -50, 100, 'STAIR'),
    node('stairF2', 'F2', -50, 100, 'STAIR'), node('srcF2', 'F2', 100, 320),
  ]
  const edges = [
    edge('src', 'fireTarget', 'G'), edge('src', 'nearFire', 'G'), edge('nearFire', 'exit1', 'G'), edge('fireTarget', 'exit1', 'G'),
    edge('src', 'safeAway', 'G'), edge('safeAway', 'exit2', 'G'), edge('safeAway', 'exit3', 'G'), edge('safeAway', 'stair', 'G'),
    edge('lift', 'exit1', 'G'), edge('srcF2', 'liftF2', 'F2'), edge('srcF2', 'stairF2', 'F2'),
  ]
  const links = inferVerticalLinks(nodes, { G: 1, F2: 2 })
  const base = { floorLevels: { G: 1, F2: 2 }, mapUnitsPerMeter: { G: 10, F2: 10 } }
  const evacuate = (blocked: string[], from = 'src') =>
    findIndoorRoute(from, { findNearestExit: true }, nodes, edges, links, { ...base, emergencyMode: 'FIRE', blockedNodeIds: new Set(blocked) })

  it('không hazard: chọn cửa thoát gần nhất', () => {
    assert.equal(lastNode(evacuate([])), 'exit1')
  })
  it('cấm thang máy dù là đường ngắn nhất; thường ngày vẫn dùng thang máy', () => {
    const route = evacuate([], 'srcF2')
    assert.ok(!maneuvers(route).includes('ELEVATOR'))
    assert.ok(maneuvers(route).includes('STAIR'))
    const normal = findIndoorRoute('srcF2', 'exit1', nodes, edges, links, base)
    assert.ok(maneuvers(normal).includes('ELEVATOR'))
  })
  it('né điểm hazard và chuyển hướng sang safe exit khác', () => {
    assert.equal(lastNode(evacuate(['exit1'])), 'exit2')
    assert.equal(lastNode(evacuate(['exit1', 'exit2'])), 'exit3')
    assert.equal(evacuate(['exit1', 'exit2', 'exit3']), null)
    const route = evacuate(['nearFire'])
    assert.ok(route && !route.nodeIds.includes('nearFire'))
  })
  it('ưu tiên an toàn: bước đầu đi ra xa vùng cháy thay vì đường ngắn hơn gần lửa', () => {
    const route = evacuate(['fireTarget'])
    assert.equal(route?.nodeIds[1], 'safeAway')
    assert.equal(route?.instructions?.at(-1)?.maneuver, 'ARRIVE_AT_SAFE_EXIT')
  })
  it('click node trên tuyến hiện tại: tuyến mới không chứa node đó', () => {
    const clicked = evacuate([])?.nodeIds[1] as string
    assert.ok(!evacuate([clicked])?.nodeIds.includes(clicked))
  })
})

describe('điểm đến rơi vào vùng cháy', () => {
  const nodes = [
    node('src', 'G', 0, 0), node('shop', 'G', 100, 0), node('exitA', 'G', -100, 0, 'EMERGENCY_EXIT'), node('exitB', 'G', 0, 100, 'EXIT'),
  ]
  const edges = [edge('src', 'shop', 'G'), edge('src', 'exitA', 'G'), edge('src', 'exitB', 'G')]
  const options = { floorLevels: { G: 1 }, mapUnitsPerMeter: { G: 10 } }

  it('tự huỷ điểm đến, đổi sang EVACUATION và cảnh báo DESTINATION_IN_HAZARD', () => {
    const outcome = findRouteWithHazardPolicy('src', 'shop', nodes, edges, [], { ...options, blockedNodeIds: new Set(['shop']) })
    assert.equal(outcome.effectiveMode, 'EVACUATION')
    assert.equal(outcome.destinationCancelled, true)
    assert.equal(outcome.warningCode, 'DESTINATION_IN_HAZARD')
    assert.ok(outcome.route && !outcome.route.nodeIds.includes('shop'))
    assert.ok(['exitA', 'exitB'].includes(outcome.route.nodeIds.at(-1) as string))
  })
  it('không còn lối thoát: NO_SAFE_EXIT_FOUND, không quay lại điểm cháy', () => {
    const outcome = findRouteWithHazardPolicy('src', 'shop', nodes, edges, [], { ...options, blockedNodeIds: new Set(['shop', 'exitA', 'exitB']) })
    assert.equal(outcome.route, null)
    assert.equal(outcome.warningCode, 'NO_SAFE_EXIT_FOUND')
    assert.equal(outcome.destinationCancelled, true)
  })
  it('nguồn nằm trong vùng cháy: SOURCE_IN_HAZARD', () => {
    const outcome = findRouteWithHazardPolicy('src', 'shop', nodes, edges, [], { ...options, blockedNodeIds: new Set(['src']) })
    assert.equal(outcome.route, null)
    assert.equal(outcome.warningCode, 'SOURCE_IN_HAZARD')
  })
  it('không cháy: giữ chế độ NORMAL, tới đúng điểm đến', () => {
    const outcome = findRouteWithHazardPolicy('src', 'shop', nodes, edges, [], options)
    assert.equal(outcome.effectiveMode, 'NORMAL')
    assert.equal(outcome.destinationCancelled, false)
    assert.equal(outcome.warningCode, undefined)
    assert.equal(outcome.route?.nodeIds.at(-1), 'shop')
  })
  it('đang báo cháy: điểm đến thường cũng chuyển sang lối thoát', () => {
    const outcome = findRouteWithHazardPolicy('src', 'shop', nodes, edges, [], { ...options, emergencyMode: 'FIRE' })
    assert.equal(outcome.effectiveMode, 'EVACUATION')
    assert.equal(outcome.destinationCancelled, false)
    assert.notEqual(outcome.route?.nodeIds.at(-1), 'shop')
  })
})
