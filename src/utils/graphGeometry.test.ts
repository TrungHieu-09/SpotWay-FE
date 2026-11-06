import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { distanceInMapUnits, estimateMetersPerPixel, findIsolatedNodeIds, findNearestNode } from './graphGeometry.ts'

const size = { width: 1000, height: 500 }

describe('findIsolatedNodeIds', () => {
  it('chỉ trả node không thuộc edge nào, bất kể là đầu from hay to', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const edges = [{ fromNodeId: 'a', toNodeId: 'b' }, { fromNodeId: 'c', toNodeId: 'a' }]
    assert.deepEqual([...findIsolatedNodeIds(nodes, edges)], ['d'])
    assert.equal(findIsolatedNodeIds(nodes, []).size, 4)
    assert.equal(findIsolatedNodeIds([], edges).size, 0)
  })
})

describe('estimateMetersPerPixel', () => {
  it('chia khoảng cách thật cho khoảng cách pixel (tính cả ảnh không vuông)', () => {
    // 10% ngang = 100px; 5 m / 100 px = 0.05 m/px
    assert.equal(estimateMetersPerPixel({ x: 0, y: 0 }, { x: 10, y: 0 }, size, 5), 0.05)
    // 10% dọc = 50px
    assert.equal(estimateMetersPerPixel({ x: 0, y: 0 }, { x: 0, y: 10 }, size, 5), 0.1)
  })

  it('trả null khi hai điểm trùng nhau hoặc khoảng cách thật <= 0', () => {
    assert.equal(estimateMetersPerPixel({ x: 5, y: 5 }, { x: 5, y: 5 }, size, 5), null)
    assert.equal(estimateMetersPerPixel({ x: 0, y: 0 }, { x: 10, y: 0 }, size, 0), null)
  })
})

describe('distanceInMapUnits', () => {
  it('quy % về đơn vị bản đồ theo từng chiều (ảnh không vuông)', () => {
    assert.equal(distanceInMapUnits({ x: 0, y: 0 }, { x: 10, y: 0 }, size), 100)
    assert.equal(distanceInMapUnits({ x: 0, y: 0 }, { x: 0, y: 10 }, size), 50)
  })
})

describe('findNearestNode', () => {
  const nodes = [
    { id: 'a', x: 10, y: 10 },
    { id: 'b', x: 50, y: 10 },
    { id: 'c', x: 12, y: 40 },
  ]

  it('chọn node gần nhất theo khoảng cách thật, không theo % thô', () => {
    // Cách (12,12): a ~ 2%x/2%y; c cách 28%y = 140 đơn vị; a gần nhất.
    assert.equal(findNearestNode({ x: 12, y: 12 }, nodes, size)?.id, 'a')
    // Lệch 30% theo x (300) xa hơn lệch 30% theo y (150) nên c thắng b.
    assert.equal(findNearestNode({ x: 12, y: 30 }, [nodes[1], nodes[2]], size)?.id, 'c')
  })

  it('trả null khi không có node hoặc ngoài bán kính snap', () => {
    assert.equal(findNearestNode({ x: 0, y: 0 }, [], size), null)
    assert.equal(findNearestNode({ x: 90, y: 90 }, nodes, size, 50), null)
  })

  it('bao gồm node nằm đúng biên bán kính', () => {
    assert.equal(findNearestNode({ x: 0, y: 10 }, nodes, size, 100)?.id, 'a')
  })
})
