import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createStore } from 'zustand/vanilla'
import type { IndoorRoute, PublicFloor, PublicFloorMap, PublicNode, PublicSearchResult } from '../types/navigation.ts'
import { createNavigationDataSlice, type NavigationGateway } from './createNavigationDataSlice.ts'
import { createSimulationSlice } from './createSimulationSlice.ts'
import type { NavigationState } from './navigationState.ts'

const floor: PublicFloor = {
  id: 'f1', buildingId: 'b1', floorNumber: 1, name: 'T1', mapImageUrl: null, mapWidth: 1000, mapHeight: 1000,
}
const node = (id: string, x: number, type = 'NORMAL'): PublicNode => ({ id, floorId: 'f1', x, y: 0, type, accessible: true })
const link = (id: string, from: string, to: string) => ({ id, floorId: 'f1', fromNodeId: from, toNodeId: to })

/** exitL — a(DOOR, điểm xuất phát) — b — c — exitR, trên một đường thẳng; a gần exitL nhất. */
const map: PublicFloorMap = {
  floor,
  nodes: [node('exitL', 0, 'EXIT'), node('a', 100, 'DOOR'), node('b', 200), node('c', 300), node('exitR', 400, 'EXIT')],
  edges: [link('e1', 'exitL', 'a'), link('e2', 'a', 'b'), link('e3', 'b', 'c'), link('e4', 'c', 'exitR')],
  pois: [{ id: 'p1', floorId: 'f1', nodeId: 'c', name: 'WC Tầng 1', category: 'RESTROOM' }],
  stores: [],
}
const destinations: PublicSearchResult[] = [
  { type: 'STORE', id: 's-near', name: 'Shop gần', floorId: 'f1', nodeId: 'b', x: 200, y: 0 },
  { type: 'STORE', id: 's-far', name: 'Shop xa', floorId: 'f1', nodeId: 'c', x: 300, y: 0 },
]
const apiRoute: IndoorRoute = { totalDistance: 1, estimatedDurationSeconds: 1, nodeIds: ['a', 'b'], steps: [] }

function setup(overrides: Partial<NavigationGateway> = {}) {
  const gateway: NavigationGateway = {
    getFloors: async () => [floor],
    getFloorMap: async () => map,
    searchDestinations: async () => destinations,
    getVerticalLinks: async () => [],
    createRoute: async () => apiRoute,
    ...overrides,
  }
  const store = createStore<NavigationState>()((...args) => ({
    ...createNavigationDataSlice(gateway)(...args),
    ...createSimulationSlice({ rerouteDelayMs: 0 })(...args),
  }))
  return store
}

async function loaded(overrides: Partial<NavigationGateway> = {}) {
  const store = setup(overrides)
  await store.getState().load('b1')
  return store
}

describe('load', () => {
  it('nạp tầng, bản đồ và điểm đến; isLoading trở về false', async () => {
    const store = await loaded()
    const state = store.getState()
    assert.equal(state.buildingId, 'b1')
    assert.deepEqual(state.floors, [floor])
    assert.equal(state.mapsByFloorId.f1, map)
    assert.equal(state.destinations.length, 2)
    assert.equal(state.isLoading, false)
    assert.equal(state.error, undefined)
  })

  it('thiếu vertical link khai báo vẫn nạp được (getVerticalLinks lỗi)', async () => {
    const store = await loaded({ getVerticalLinks: async () => { throw new Error('404') } })
    assert.equal(store.getState().error, undefined)
    assert.deepEqual(store.getState().verticalLinks, [])
  })

  it('lỗi tải ghi error và vẫn tắt isLoading', async () => {
    const store = setup({ getFloors: async () => { throw new Error('mất mạng') } })
    await store.getState().load('b1')
    assert.equal(store.getState().error, 'mất mạng')
    assert.equal(store.getState().isLoading, false)
  })

  it('xoá trạng thái mô phỏng/tuyến của toà nhà trước', async () => {
    const store = await loaded()
    store.getState().toggleFireNode('exitL', 'a')
    assert.equal(store.getState().emergencyMode, 'FIRE')
    await store.getState().load('b1')
    assert.equal(store.getState().emergencyMode, 'NONE')
    assert.deepEqual(store.getState().activeFireNodeIds, [])
    assert.equal(store.getState().route, undefined)
  })
})

describe('findRoute', () => {
  const input = { fromNodeId: 'a', toStoreId: 's-far', wheelchairMode: false }

  it('dùng tuyến từ API và đánh dấu nguồn api', async () => {
    const store = await loaded()
    const route = await store.getState().findRoute(input)
    assert.equal(route, apiRoute)
    assert.equal(store.getState().routeSource, 'api')
    assert.equal(store.getState().isRouting, false)
  })

  it('đang cháy: gửi mode EVACUATION kèm danh sách node cháy', async () => {
    let sent: unknown
    const store = await loaded({ createRoute: async (body) => { sent = body; return apiRoute } })
    store.getState().toggleFireNode('exitL', 'a')
    await store.getState().findRoute(input)
    assert.deepEqual(sent, { ...input, mode: 'EVACUATION', hazardNodeIds: ['exitL'] })
  })

  it('API lỗi: tính offline trên graph đã nạp', async () => {
    const store = await loaded({ createRoute: async () => { throw new Error('500') } })
    const route = await store.getState().findRoute(input)
    assert.deepEqual(route?.nodeIds, ['a', 'b', 'c'])
    assert.equal(store.getState().routeSource, 'offline')
    assert.equal(store.getState().routeTargetName, 'Shop xa')
  })

  it('API lỗi và điểm đến lạ: ném lại lỗi API và ghi error', async () => {
    const store = await loaded({ createRoute: async () => { throw new Error('500') } })
    await assert.rejects(() => store.getState().findRoute({ ...input, toStoreId: 'khong-co' }), /500/)
    assert.equal(store.getState().error, '500')
    assert.equal(store.getState().isRouting, false)
  })

  it('clearRoute bỏ tuyến và cảnh báo', async () => {
    const store = await loaded()
    await store.getState().findRoute(input)
    store.getState().clearRoute()
    assert.equal(store.getState().route, undefined)
    assert.equal(store.getState().routeSource, undefined)
  })
})

describe('mô phỏng cháy', () => {
  it('đặt lửa lên lối ra gần nhất thì tuyến chuyển sang lối ra còn lại; dập lửa thì quay lại', async () => {
    const store = await loaded()
    store.getState().toggleFireNode('exitL', 'a')
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitR')
    assert.deepEqual(store.getState().activeFireNodeIds, ['exitL'])

    store.getState().toggleFireNode('exitL', 'a')
    assert.deepEqual(store.getState().activeFireNodeIds, [])
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitL')
  })

  it('không cho đặt lửa ngay tại chỗ đang đứng', async () => {
    const store = await loaded()
    store.getState().toggleFireNode('a', 'a')
    assert.deepEqual(store.getState().activeFireNodeIds, [])
    assert.match(store.getState().simulationMessage ?? '', /đang đứng/)
  })

  it('cháy cả hai lối ra: cảnh báo NO_SAFE_EXIT_FOUND, không có tuyến', async () => {
    const store = await loaded()
    store.getState().toggleFireNode('exitL', 'a')
    store.getState().toggleFireNode('exitR', 'a')
    assert.equal(store.getState().route, undefined)
    assert.equal(store.getState().routeWarning?.code, 'NO_SAFE_EXIT_FOUND')
  })

  it('xuất phát nằm trong vùng cháy: cảnh báo SOURCE_IN_HAZARD', async () => {
    const store = await loaded()
    store.getState().triggerFireAlarm('b', 'b')
    assert.equal(store.getState().routeWarning?.code, 'SOURCE_IN_HAZARD')
  })

  it('blockExitWithFire chặn lối ra và tái định tuyến từ điểm xuất phát đã nhớ', async () => {
    const store = await loaded()
    store.getState().triggerFireAlarm(undefined, 'a')
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitL')
    store.getState().blockExitWithFire('exitL')
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitR')
  })

  it('extinguishAllFires dập hết lửa và tính lại tuyến', async () => {
    const store = await loaded()
    store.getState().toggleFireNode('exitL', 'a')
    store.getState().extinguishAllFires()
    assert.deepEqual(store.getState().activeFireNodeIds, [])
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitL')
  })

  it('setInteractiveFireMode bật chế độ cháy và tính tuyến thoát hiểm từ vị trí đã cho', async () => {
    const store = await loaded()
    store.getState().setInteractiveFireMode(true, 'b')
    assert.equal(store.getState().interactiveFireMode, true)
    assert.equal(store.getState().emergencyMode, 'FIRE')
    assert.ok(store.getState().route)
  })
})

describe('runDemoScenario', () => {
  it('chưa có node: báo lỗi và không chạy', async () => {
    const store = setup()
    await store.getState().runDemoScenario('stairs')
    assert.match(store.getState().error ?? '', /chưa có node/)
  })

  it('H1 same-floor-shortest: tới điểm đến gần nhất theo graph, cùng tên điểm đến', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('same-floor-shortest')
    const state = store.getState()
    assert.deepEqual(state.route?.nodeIds, ['a', 'b'])
    assert.equal(state.routeTargetName, 'Shop gần')
    assert.equal(state.isDemoRunning, false)
  })

  it('nearest-restroom: chọn POI khớp danh mục', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('nearest-restroom')
    assert.equal(store.getState().route?.nodeIds.at(-1), 'c')
    assert.equal(store.getState().routeTargetName, 'WC Tầng 1')
  })

  it('nearest-atm: không có POI ATM thì báo lỗi', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('nearest-atm')
    assert.match(store.getState().error ?? '', /chưa có POI ATM/)
  })

  it('chuyển tầng khi toà nhà chỉ có 1 tầng: vẫn dựng tuyến tới node tầng trên cùng, không ném lỗi', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('stairs')
    assert.equal(store.getState().isDemoRunning, false)
  })

  it('F4 fire-exit-1: lửa chặn lối ra gần nhất, tuyến cuối cùng sang lối ra còn lại', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('fire-exit-1')
    const state = store.getState()
    assert.deepEqual(state.activeFireNodeIds, ['exitL'])
    assert.equal(state.route?.nodeIds.at(-1), 'exitR')
    assert.equal(state.emergencyMode, 'FIRE')
    assert.equal(state.isDemoRunning, false)
  })

  it('F5 fire-exits-1-2: hết lối ra thì không còn tuyến an toàn', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('fire-exits-1-2')
    assert.deepEqual([...store.getState().activeFireNodeIds].sort(), ['exitL', 'exitR'])
    assert.equal(store.getState().route, undefined)
  })

  it('F6 interactive-fire: bật chế độ đặt lửa và có tuyến thoát hiểm', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('interactive-fire')
    assert.equal(store.getState().interactiveFireMode, true)
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitL')
  })

  it('reset đưa mô phỏng và tuyến về ban đầu', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('fire-exit-1')
    await store.getState().runDemoScenario('reset')
    const state = store.getState()
    assert.equal(state.emergencyMode, 'NONE')
    assert.deepEqual(state.activeFireNodeIds, [])
    assert.equal(state.route, undefined)
    assert.equal(state.activeScenarioId, undefined)
  })
})
