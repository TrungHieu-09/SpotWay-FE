import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { RouteStep, VerticalLinkKind } from '../types/navigation.ts'
import { floorsOnRoute, splitRouteByFloor } from './routeSegments.ts'

const walk = (floorId: string, distanceMeters = 10): RouteStep => ({ nodeId: 'n', floorId, x: 0, y: 0, bearing: null, instruction: 'đi', distanceMeters })
const ride = (floorId: string, targetFloorId: string, transition: VerticalLinkKind = 'ELEVATOR', waitSeconds = 30): RouteStep => ({
  nodeId: 'n', floorId, x: 0, y: 0, bearing: null, instruction: 'thang', transition, targetFloorId, waitSeconds,
})

describe('splitRouteByFloor', () => {
  it('cùng một tầng: một đoạn đi bộ vừa là điểm đầu vừa là điểm cuối', () => {
    const segments = splitRouteByFloor([walk('f1', 5), walk('f1', 7)])
    assert.deepEqual(segments, [{ type: 'walk', floorId: 'f1', firstIndex: 0, lastIndex: 1, distanceMeters: 12, isStart: true, isEnd: true }])
  })

  it('T1 → T3 bằng thang máy qua T2: đi bộ, một lần đi thang gộp cả T2, rồi đi bộ', () => {
    const steps = [walk('f1', 30), walk('f1', 20), ride('f1', 'f2'), ride('f2', 'f3'), walk('f3', 22), walk('f3', 12)]
    const segments = splitRouteByFloor(steps)
    assert.equal(segments.length, 3)
    assert.deepEqual(segments[0], { type: 'walk', floorId: 'f1', firstIndex: 0, lastIndex: 1, distanceMeters: 50, isStart: true, isEnd: false })
    assert.deepEqual(segments[1], { type: 'ride', kind: 'ELEVATOR', fromFloorId: 'f1', toFloorId: 'f3', viaFloorIds: ['f2'], firstIndex: 2, lastIndex: 3, waitSeconds: 60 })
    assert.deepEqual(segments[2], { type: 'walk', floorId: 'f3', firstIndex: 4, lastIndex: 5, distanceMeters: 34, isStart: false, isEnd: true })
  })

  it('đổi tầng một nấc: không có tầng đi ngang', () => {
    const segments = splitRouteByFloor([walk('f1'), ride('f1', 'f2', 'STAIR'), walk('f2')])
    assert.deepEqual(segments[1], { type: 'ride', kind: 'STAIR', fromFloorId: 'f1', toFloorId: 'f2', viaFloorIds: [], firstIndex: 1, lastIndex: 1, waitSeconds: 30 })
  })

  it('xuất phát ngay tại thang: đoạn đi bộ đầu tiên không phải điểm đầu', () => {
    const segments = splitRouteByFloor([ride('f1', 'f2'), walk('f2')])
    assert.equal(segments[0].type, 'ride')
    const last = segments[1]
    assert.ok(last.type === 'walk' && last.isEnd && !last.isStart)
  })

  it('hai lần đi thang khác loại ngăn cách bởi đi bộ vẫn là hai đoạn riêng', () => {
    const segments = splitRouteByFloor([walk('f1'), ride('f1', 'f2'), walk('f2'), ride('f2', 'f3', 'STAIR'), walk('f3')])
    assert.deepEqual(segments.map((s) => s.type), ['walk', 'ride', 'walk', 'ride', 'walk'])
  })

  it('tuyến rỗng', () => {
    assert.deepEqual(splitRouteByFloor([]), [])
  })
})

describe('floorsOnRoute', () => {
  it('liệt kê cả tầng chỉ đi ngang trong thang, theo thứ tự, không lặp', () => {
    const steps = [walk('f1'), ride('f1', 'f2'), ride('f2', 'f3'), walk('f3')]
    assert.deepEqual(floorsOnRoute(steps), ['f1', 'f2', 'f3'])
    assert.deepEqual(floorsOnRoute([walk('f1'), walk('f1')]), ['f1'])
  })
})
