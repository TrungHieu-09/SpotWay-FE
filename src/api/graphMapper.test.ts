import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  connectorFromDto,
  edgeFromDto,
  nodeFromDto,
  nodeToCreateDto,
  poiFromDto,
  poiToCreateDto,
  poiToUpdateDto,
  positionFromDto,
  positionToDto,
} from './graphMapper.ts'

const size = { width: 1200, height: 760 }

describe('positionFromDto / positionToDto', () => {
  it('pixel -> % theo kích thước bản đồ', () => {
    assert.deepEqual(positionFromDto({ x: 600, y: 190 }, size), { x: 50, y: 25 })
  })

  it('round-trip sai lệch dưới 1 pixel', () => {
    const point = positionFromDto({ x: 123.4, y: 567.8 }, size)
    const back = positionToDto(point, size)
    assert.ok(Math.abs(back.x - 123.4) < 1 && Math.abs(back.y - 567.8) < 1)
  })

  it('ném lỗi khi kích thước bản đồ không hợp lệ thay vì sinh NaN', () => {
    assert.throws(() => positionFromDto({ x: 1, y: 1 }, { width: 0, height: 10 }))
    assert.throws(() => positionToDto({ x: 1, y: 1 }, { width: 10, height: Number.NaN }))
  })
})

describe('node/edge mapper', () => {
  it('điền mặc định cho trường BE có thể thiếu', () => {
    const node = nodeFromDto({ id: 'n1', floorId: 'f1', x: 300, y: 380, type: 'DOOR' }, size)
    assert.deepEqual(node, {
      id: 'n1', floorId: 'f1', x: 25, y: 50, name: null, type: 'DOOR', accessible: true, hazard: 'NONE',
    })
    const edge = edgeFromDto({ id: 'e1', floorId: 'f1', fromNodeId: 'n1', toNodeId: 'n2', weight: 9 })
    assert.deepEqual(edge, {
      id: 'e1', floorId: 'f1', fromNodeId: 'n1', toNodeId: 'n2', accessible: true, status: 'ACTIVE', hazard: 'NONE',
    })
    assert.equal('weight' in edge, false)
  })

  it('payload tạo node gửi pixel, không gửi %', () => {
    const dto = nodeToCreateDto({ x: 50, y: 50, type: 'NORMAL', name: null, accessible: true }, size)
    assert.deepEqual(dto, { x: 600, y: 380, type: 'NORMAL', name: null, accessible: true })
  })
})

describe('poi mapper', () => {
  it('dùng x/y riêng của POI (pixel -> %) và nodeId làm nearestNodeId', () => {
    const poi = poiFromDto(
      { id: 'p1', floorId: 'f1', name: 'WC', category: 'RESTROOM', x: 120, y: 76, nodeId: 'n1', icon: 'wc' },
      size,
    )
    assert.deepEqual(poi, {
      id: 'p1', floorId: 'f1', name: 'WC', category: 'restroom', icon: 'wc', x: 10, y: 10, nearestNodeId: 'n1',
    })
  })

  it('POI cũ x/y null -> lấy toạ độ node; không có node -> null', () => {
    const node = nodeFromDto({ id: 'n1', floorId: 'f1', x: 600, y: 380, type: 'NORMAL' }, size)
    const legacy = { id: 'p1', floorId: 'f1', name: 'Shop', category: 'CUSTOM', nodeId: 'n1', x: null, y: null }
    assert.equal(poiFromDto(legacy, size, node)?.x, 50)
    assert.equal(poiFromDto(legacy, size), null)
  })

  it('category lạ -> custom', () => {
    const dto = { id: 'p', floorId: 'f', name: 'x', category: 'weird', x: 0, y: 0, nodeId: 'n' }
    assert.equal(poiFromDto(dto, size)?.category, 'custom')
  })

  it('payload tạo gửi pixel + category enum BE; nodeId chỉ gửi khi có', () => {
    const input = { x: 50, y: 50, name: 'ATM', category: 'info' as const, icon: null }
    assert.deepEqual(poiToCreateDto(input, size, 'n9'), {
      x: 600, y: 380, name: 'ATM', category: 'INFO', icon: undefined, nodeId: 'n9',
    })
    assert.equal(poiToCreateDto(input, size).nodeId, undefined)
  })

  it('payload sửa: chỉ có x/y khi đổi vị trí', () => {
    assert.deepEqual(poiToUpdateDto({ name: 'B' }, size), {
      name: 'B', category: undefined, icon: undefined, nodeId: undefined,
    })
    const moved = poiToUpdateDto({ position: { x: 10, y: 10 }, nodeId: 'n2' }, size)
    assert.deepEqual([moved.x, moved.y, moved.nodeId], [120, 76, 'n2'])
  })
})

describe('connectorFromDto', () => {
  it('giữ stops theo tầng, bỏ trường audit', () => {
    const connector = connectorFromDto({
      id: 'c1', buildingId: 'b1', kind: 'STAIR', name: 'Cầu thang A', accessible: false,
      stops: [{ floorId: 'f1', nodeId: 'n1' }, { floorId: 'f2', nodeId: 'n2' }],
      createdAt: 'x',
    } as Parameters<typeof connectorFromDto>[0])
    assert.deepEqual(connector.stops.map((s) => s.floorId), ['f1', 'f2'])
    assert.equal('createdAt' in connector, false)
  })
})
