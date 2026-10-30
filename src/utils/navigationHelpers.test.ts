import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PublicFloor, PublicFloorMap, PublicNode, PublicSearchResult } from '../types/navigation.ts'
import {
  calibrationOf,
  neighborsOf,
  nodesWithPoiExits,
  pickDefaultStart,
  pickDestination,
  sortFloors,
  upperFloorOf,
} from './navigationHelpers.ts'

const floor = (id: string, floorNumber: number, extra: Partial<PublicFloor> = {}): PublicFloor => ({
  id, buildingId: 'b', floorNumber, name: id, mapImageUrl: null, mapWidth: 1, mapHeight: 1, ...extra,
})
const node = (id: string, floorId: string, type = 'NORMAL'): PublicNode => ({ id, floorId, x: 0, y: 0, type, accessible: true })

describe('sortFloors / upperFloorOf', () => {
  const floors = [floor('f3', 3), floor('f1', 1), floor('f2', 2), floor('f4', 4)]

  it('sắp theo số tầng mà không đổi mảng gốc', () => {
    assert.deepEqual(sortFloors(floors).map((item) => item.id), ['f1', 'f2', 'f3', 'f4'])
    assert.equal(floors[0].id, 'f3')
  })

  it('tầng đích demo: tầng thứ 3 nếu có, không thì tầng cao nhất', () => {
    assert.equal(upperFloorOf(floors)?.id, 'f3')
    assert.equal(upperFloorOf([floor('f1', 1), floor('f2', 2)])?.id, 'f2')
    assert.equal(upperFloorOf([]), undefined)
  })
})

describe('calibrationOf', () => {
  it('chỉ lấy tầng có giá trị số', () => {
    const floors = [floor('f1', 1, { mapUnitsPerMeter: 12 }), floor('f2', 2, { mapUnitsPerMeter: null }), floor('f3', 3)]
    assert.deepEqual(calibrationOf(floors, 'mapUnitsPerMeter'), { f1: 12 })
  })
})

describe('pickDefaultStart', () => {
  const floors = [floor('f2', 2), floor('f1', 1)]

  it('ưu tiên DOOR ở tầng thấp nhất, rồi node đầu tiên của tầng đó', () => {
    const nodes = [node('up', 'f2', 'DOOR'), node('n', 'f1'), node('d', 'f1', 'DOOR')]
    assert.equal(pickDefaultStart(floors, nodes), 'd')
    assert.equal(pickDefaultStart(floors, [node('up', 'f2', 'DOOR'), node('n', 'f1')]), 'n')
  })

  it('tầng thấp nhất rỗng thì lấy node bất kỳ; không node thì undefined', () => {
    assert.equal(pickDefaultStart(floors, [node('up', 'f2')]), 'up')
    assert.equal(pickDefaultStart(floors, []), undefined)
  })
})

describe('pickDestination', () => {
  const item = (id: string, name: string, floorId: string): PublicSearchResult => ({
    type: 'STORE', id, name, floorId, nodeId: id, x: 0, y: 0,
  })
  const destinations = [item('a', 'Cửa hàng A', 'f1'), item('b', 'CGV Cinema', 'f1'), item('c', 'Rạp', 'f2')]

  it('ưu tiên tên khớp từ khoá (không phân biệt hoa thường), không thì điểm đầu tiên của tầng', () => {
    assert.equal(pickDestination(destinations, 'f1', ['cgv'])?.id, 'b')
    assert.equal(pickDestination(destinations, 'f1', ['xyz'])?.id, 'a')
    assert.equal(pickDestination(destinations, 'f9', ['cgv']), undefined)
  })
})

describe('nodesWithPoiExits', () => {
  const map = (nodes: PublicNode[], pois: PublicFloorMap['pois']): Record<string, PublicFloorMap> => ({
    f1: { floor: floor('f1', 1), nodes, edges: [], pois, stores: [] },
  })
  const poi = (nodeId: string, category: string) => ({ id: `p-${nodeId}`, floorId: 'f1', nodeId, name: 'x', category })

  it('node neo của POI EXIT thành EXIT; POI loại khác không đổi node', () => {
    const result = nodesWithPoiExits(map([node('a', 'f1'), node('b', 'f1')], [poi('a', 'EXIT'), poi('b', 'RESTROOM')]))
    assert.deepEqual(result.map((n) => n.type), ['EXIT', 'NORMAL'])
  })

  it('không phân biệt hoa thường và không ghi đè loại thang/lối thoát sẵn có', () => {
    const result = nodesWithPoiExits(map([node('a', 'f1'), node('lift', 'f1', 'ELEVATOR'), node('e', 'f1', 'EMERGENCY_EXIT')], [poi('a', 'exit'), poi('lift', 'EXIT'), poi('e', 'EXIT')]))
    assert.deepEqual(result.map((n) => n.type), ['EXIT', 'ELEVATOR', 'EMERGENCY_EXIT'])
  })

  it('không đổi dữ liệu gốc', () => {
    const original = node('a', 'f1')
    nodesWithPoiExits(map([original], [poi('a', 'EXIT')]))
    assert.equal(original.type, 'NORMAL')
  })
})

describe('neighborsOf', () => {
  it('lấy hàng xóm theo cả hai chiều của edge, xuyên mọi tầng', () => {
    const edge = (from: string, to: string) => ({ id: `${from}${to}`, floorId: 'f1', fromNodeId: from, toNodeId: to })
    const maps = {
      f1: { floor: floor('f1', 1), nodes: [], edges: [edge('a', 'b'), edge('c', 'a')], pois: [], stores: [] } satisfies PublicFloorMap,
    }
    assert.deepEqual(neighborsOf(maps, 'a').sort(), ['b', 'c'])
    assert.deepEqual(neighborsOf(maps, 'z'), [])
  })
})
