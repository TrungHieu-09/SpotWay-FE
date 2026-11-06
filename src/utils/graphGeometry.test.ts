import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estimateMetersPerPixel, findEdgesCrossingWalls, findIsolatedNodeIds } from './graphGeometry.ts'

test('findIsolatedNodeIds returns nodes without edges', () => {
  const isolated = findIsolatedNodeIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ fromNodeId: 'a', toNodeId: 'b' }])
  assert.deepEqual([...isolated], ['c'])
})

test('findEdgesCrossingWalls detects only real crossings', () => {
  const nodes = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 0, y: 5 }]
  const edges = [{ id: 'e1', fromNodeId: 'a', toNodeId: 'b' }, { id: 'e2', fromNodeId: 'a', toNodeId: 'c' }]
  const crossing = findEdgesCrossingWalls(edges, nodes, [{ x1: 5, y1: -2, x2: 5, y2: 2 }])
  assert.deepEqual([...crossing], ['e1'])
})

test('estimateMetersPerPixel', () => {
  assert.equal(estimateMetersPerPixel({ x: 0, y: 0 }, { x: 100, y: 0 }, 5), 0.05)
  assert.equal(estimateMetersPerPixel({ x: 1, y: 1 }, { x: 1, y: 1 }, 5), null)
})
