import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { suggestConnectors, suggestEdges, type SuggestionNode } from './graphSuggestions.ts'

const size = { width: 1000, height: 1000 }
const point = (id: string, x: number, y: number) => ({ id, x, y })

describe('suggestEdges', () => {
  it('nối các node rời thành một mạng, ưu tiên cặp gần nhất', () => {
    const nodes = [point('a', 0, 0), point('b', 10, 0), point('c', 20, 0), point('d', 80, 0)]
    const result = suggestEdges(nodes, [], size)
    assert.equal(result.length, 3) // n node -> n-1 edge
    const pairs = result.map((s) => [s.fromNodeId, s.toNodeId].sort().join('-')).sort()
    assert.deepEqual(pairs, ['a-b', 'b-c', 'c-d'])
  })

  it('edge đã có được tính là đã nối: không đề xuất lại, chỉ nối các mảnh còn rời', () => {
    const nodes = [point('a', 0, 0), point('b', 10, 0), point('c', 50, 0), point('d', 60, 0)]
    const result = suggestEdges(nodes, [{ fromNodeId: 'a', toNodeId: 'b' }, { fromNodeId: 'c', toNodeId: 'd' }], size)
    assert.equal(result.length, 1)
    assert.deepEqual([result[0].fromNodeId, result[0].toNodeId].sort(), ['b', 'c'])
  })

  it('mạng đã liền thì không đề xuất gì', () => {
    const nodes = [point('a', 0, 0), point('b', 10, 0)]
    assert.deepEqual(suggestEdges(nodes, [{ fromNodeId: 'b', toNodeId: 'a' }], size), [])
    assert.deepEqual(suggestEdges([], [], size), [])
  })

  it('maxDistance bỏ qua cặp quá xa (đơn vị bản đồ)', () => {
    const nodes = [point('a', 0, 0), point('b', 10, 0), point('far', 90, 90)]
    const result = suggestEdges(nodes, [], size, { maxDistance: 200 })
    assert.equal(result.length, 1)
    assert.deepEqual([result[0].fromNodeId, result[0].toNodeId].sort(), ['a', 'b'])
  })

  it('edge trỏ tới node không còn trong danh sách không làm hỏng kết quả', () => {
    const nodes = [point('a', 0, 0), point('b', 10, 0)]
    assert.equal(suggestEdges(nodes, [{ fromNodeId: 'a', toNodeId: 'ghost' }], size).length, 1)
  })
})

describe('suggestConnectors', () => {
  const node = (id: string, type: string, x: number, y: number, name: string | null = null): SuggestionNode => ({ id, type, x, y, name })
  const floors = [
    { floorId: 'f3', level: 3, nodes: [node('e3', 'ELEVATOR', 51, 50), node('s3', 'STAIR', 10, 10)] },
    { floorId: 'f1', level: 1, nodes: [node('e1', 'ELEVATOR', 50, 50, 'Thang máy A'), node('x1', 'NORMAL', 50, 50)] },
    { floorId: 'f2', level: 2, nodes: [node('e2', 'ELEVATOR', 50, 51), node('s2', 'STAIR', 11, 10)] },
  ]

  it('ghép node cùng loại và cùng vị trí xuyên tầng, theo thứ tự tầng, bỏ node khác loại', () => {
    const result = suggestConnectors(floors, new Set())
    const elevator = result.find((s) => s.kind === 'ELEVATOR')!
    assert.deepEqual(elevator.stops, [
      { floorId: 'f1', nodeId: 'e1' },
      { floorId: 'f2', nodeId: 'e2' },
      { floorId: 'f3', nodeId: 'e3' },
    ])
    assert.equal(elevator.name, 'Thang máy A') // lấy tên node ở tầng thấp nhất nếu có
    const stair = result.find((s) => s.kind === 'STAIR')!
    assert.deepEqual(stair.stops.map((stop) => stop.nodeId), ['s2', 's3'])
    assert.equal(stair.name, 'Cầu thang bộ 1')
    assert.equal(result.length, 2)
  })

  it('bỏ qua node đã thuộc connector', () => {
    const result = suggestConnectors(floors, new Set(['e1']))
    const elevator = result.find((s) => s.kind === 'ELEVATOR')!
    assert.deepEqual(elevator.stops.map((stop) => stop.nodeId), ['e2', 'e3'])
  })

  it('xa hơn ngưỡng thì không ghép; thiếu tầng thứ hai thì không đề xuất', () => {
    const far = [
      { floorId: 'a', level: 1, nodes: [node('a1', 'ELEVATOR', 10, 10)] },
      { floorId: 'b', level: 2, nodes: [node('b1', 'ELEVATOR', 60, 60)] },
    ]
    assert.deepEqual(suggestConnectors(far, new Set()), [])
    assert.deepEqual(suggestConnectors([far[0]], new Set()), [])
  })

  it('mỗi node chỉ dùng cho một connector', () => {
    const twoLifts = [
      { floorId: 'a', level: 1, nodes: [node('a1', 'ELEVATOR', 20, 20), node('a2', 'ELEVATOR', 70, 70)] },
      { floorId: 'b', level: 2, nodes: [node('b1', 'ELEVATOR', 21, 20), node('b2', 'ELEVATOR', 70, 71)] },
    ]
    const result = suggestConnectors(twoLifts, new Set())
    assert.equal(result.length, 2)
    assert.deepEqual(result.map((s) => s.stops.map((stop) => stop.nodeId)), [['a1', 'b1'], ['a2', 'b2']])
  })
})
