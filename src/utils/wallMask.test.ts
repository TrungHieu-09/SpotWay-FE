import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWallMask, findWallCrossingEdgeIds, segmentCrossesWall, type WallMask } from './wallMask.ts'

/** Mặt nạ 200x200: tường dọc dày 8px tại x=96..103, có cửa hở ở y=80..120; một nét mảnh 1px ngang ở y=30. */
function sampleMask(): WallMask {
  const width = 200
  const height = 200
  const dark = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    if (y >= 80 && y < 120) continue
    for (let x = 96; x < 104; x += 1) dark[y * width + x] = 1
  }
  for (let x = 0; x < width; x += 1) dark[30 * width + x] = 1
  return { width, height, dark }
}

const at = (px: number, py: number) => ({ x: (px / 199) * 100, y: (py / 199) * 100 })

describe('segmentCrossesWall', () => {
  const mask = sampleMask()

  it('đoạn đi xuyên tường dày thì bị đánh dấu', () => {
    assert.equal(segmentCrossesWall(mask, at(40, 50), at(160, 50)), true)
  })

  it('đoạn đi qua chỗ hở (cửa) thì không', () => {
    assert.equal(segmentCrossesWall(mask, at(40, 100), at(160, 100)), false)
  })

  it('nét mảnh 1px (nhãn, vạch) không coi là tường', () => {
    assert.equal(segmentCrossesWall(mask, at(40, 10), at(40, 60)), false)
  })

  it('đoạn song song với tường, không chạm, thì không', () => {
    assert.equal(segmentCrossesWall(mask, at(20, 20), at(20, 180)), false)
  })

  it('node nằm sát tường: phần quanh đầu mút được bỏ qua', () => {
    // Điểm bắt đầu ngay trên mép tường (x=96), đi ra xa
    assert.equal(segmentCrossesWall(mask, at(98, 50), at(40, 50)), false)
  })

  it('hai điểm trùng nhau không gây lỗi', () => {
    assert.equal(segmentCrossesWall(mask, at(50, 50), at(50, 50)), false)
  })
})

describe('findWallCrossingEdgeIds', () => {
  it('chỉ trả edge xuyên tường; bỏ qua edge trỏ tới node không có', () => {
    const mask = sampleMask()
    const nodes = [
      { id: 'a', ...at(40, 50) },
      { id: 'b', ...at(160, 50) },
      { id: 'c', ...at(40, 100) },
      { id: 'd', ...at(160, 100) },
    ]
    const edges = [
      { id: 'through-wall', fromNodeId: 'a', toNodeId: 'b' },
      { id: 'through-door', fromNodeId: 'c', toNodeId: 'd' },
      { id: 'ghost', fromNodeId: 'a', toNodeId: 'zzz' },
    ]
    assert.deepEqual([...findWallCrossingEdgeIds(mask, nodes, edges)], ['through-wall'])
  })
})

describe('buildWallMask', () => {
  it('điểm tối và đục thành 1; nền sáng hoặc trong suốt thành 0', () => {
    // 4 pixel: đen đục, trắng đục, đen trong suốt, xám đậm đục
    const rgba = [0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 90, 90, 90, 255]
    assert.deepEqual([...buildWallMask(rgba, 4, 1).dark], [1, 0, 0, 1])
  })
})
