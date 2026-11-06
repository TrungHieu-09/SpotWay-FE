import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyManeuver, deltaBearing, findIndoorRoute, findRouteWithHazardPolicy, type PathfindingEdge, type PathfindingNode } from './indoorPathfinding.ts'

const node = (id: string, floorId: string, x: number, y: number, type = 'NORMAL'): PathfindingNode => ({ id, floorId, x, y, type, accessible: true })
const edge = (id: string, fromNodeId: string, toNodeId: string, floorId = 'f1', accessible = true): PathfindingEdge => ({ id, fromNodeId, toNodeId, floorId, accessible, status: 'ACTIVE' })

describe('indoorPathfinding', () => {
  it('chọn đường ngắn nhất cùng tầng', () => {
    const nodes = [node('a', 'f1', 0, 0), node('b', 'f1', 100, 0), node('c', 'f1', 200, 0), node('detour', 'f1', 0, 300)]
    const route = findIndoorRoute('a', 'c', nodes, [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ad', 'a', 'detour'), edge('dc', 'detour', 'c')], [], { mapUnitsPerMeter: { f1: 10 } })
    assert.deepEqual(route?.nodeIds, ['a', 'b', 'c'])
    assert.equal(route?.totalDistance, 20)
  })

  it('phân loại góc quay đúng tại wrap-around và boundary', () => {
    assert.equal(deltaBearing(350, 10), 20)
    assert.equal(deltaBearing(10, 350), -20)
    assert.equal(classifyManeuver(14.99), 'STRAIGHT')
    assert.equal(classifyManeuver(15), 'SLIGHT_RIGHT')
    assert.equal(classifyManeuver(45), 'TURN_RIGHT')
    assert.equal(classifyManeuver(135), 'U_TURN_RIGHT')
  })

  it('wheelchair loại stair, escalator và edge inaccessible', () => {
    const nodes = [node('s', 'f1', 0, 0), node('e1', 'f1', 0, 100, 'ELEVATOR'), node('st1', 'f1', 100, 0, 'STAIR'), node('e2', 'f2', 0, 100, 'ELEVATOR'), node('st2', 'f2', 100, 0, 'STAIR'), node('target', 'f2', 0, 200)]
    const edges = [edge('se', 's', 'e1'), edge('ss', 's', 'st1'), edge('et', 'e2', 'target', 'f2'), edge('st', 'st2', 'target', 'f2')]
    const links = [{ nodeIdFrom: 'e1', nodeIdTo: 'e2', kind: 'ELEVATOR' as const }, { nodeIdFrom: 'st1', nodeIdTo: 'st2', kind: 'STAIR' as const }]
    const route = findIndoorRoute('s', 'target', nodes, edges, links, { wheelchairMode: true, floorLevels: { f1: 1, f2: 2 } })
    assert.ok(route?.steps.some((step) => step.transition === 'ELEVATOR'))
    assert.ok(!route?.steps.some((step) => step.transition === 'STAIR'))
  })

  it('chế độ cháy cấm elevator và tự chọn exit an toàn khác', () => {
    const nodes = [node('s', 'f2', 0, 0), node('lift2', 'f2', 0, 100, 'ELEVATOR'), node('lift1', 'f1', 0, 100, 'ELEVATOR'), node('stair2', 'f2', 100, 0, 'STAIR'), node('stair1', 'f1', 100, 0, 'STAIR'), node('exit1', 'f1', 200, 0, 'EMERGENCY_EXIT'), node('exit2', 'f1', 100, 100, 'EMERGENCY_EXIT')]
    const edges = [edge('sl', 's', 'lift2', 'f2'), edge('ss', 's', 'stair2', 'f2'), edge('le', 'lift1', 'exit1'), edge('se', 'stair1', 'exit2')]
    const links = [{ nodeIdFrom: 'lift1', nodeIdTo: 'lift2', kind: 'ELEVATOR' as const }, { nodeIdFrom: 'stair1', nodeIdTo: 'stair2', kind: 'STAIR' as const }]
    const route = findIndoorRoute('s', { findNearestExit: true }, nodes, edges, links, { emergencyMode: 'FIRE', floorLevels: { f1: 1, f2: 2 } })
    assert.equal(route?.nodeIds.at(-1), 'exit2')
    assert.ok(!route?.steps.some((step) => step.transition === 'ELEVATOR'))
  })

  it('đích cháy bị hủy và đổi mode sang evacuation', () => {
    const nodes = [node('s', 'f1', 0, 0), node('burning', 'f1', 100, 0), node('exit', 'f1', 0, 100, 'EXIT')]
    const result = findRouteWithHazardPolicy('s', 'burning', nodes, [edge('sb', 's', 'burning'), edge('se', 's', 'exit')], [], { blockedNodeIds: new Set(['burning']) })
    assert.equal(result.destinationCancelled, true)
    assert.equal(result.effectiveMode, 'EVACUATION')
    assert.equal(result.warningCode, 'DESTINATION_IN_HAZARD')
    assert.equal(result.route?.nodeIds.at(-1), 'exit')
  })
})
