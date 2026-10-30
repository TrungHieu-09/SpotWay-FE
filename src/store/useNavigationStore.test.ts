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

  it('điểm đến là POI: không gọi API (BE chỉ nhận cửa hàng/lối thoát), tính trên graph tới node neo', async () => {
    let apiCalls = 0
    const poiDestination: PublicSearchResult = { type: 'POI', id: 'poi-1', name: 'WC', floorId: 'f1', nodeId: 'c', x: 300, y: 0 }
    const store = await loaded({
      searchDestinations: async () => [...destinations, poiDestination],
      createRoute: async () => { apiCalls += 1; return apiRoute },
    })
    const route = await store.getState().findRoute({ fromNodeId: 'a', toStoreId: 'poi-1', wheelchairMode: false })
    assert.equal(apiCalls, 0)
    assert.deepEqual(route?.nodeIds, ['a', 'b', 'c'])
    assert.equal(store.getState().routeSource, 'offline')
    assert.equal(store.getState().routeTargetName, 'WC')
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

describe('lối thoát khai báo bằng POI EXIT', () => {
  const noExitMap: PublicFloorMap = {
    ...map,
    nodes: map.nodes.map((n) => ({ ...n, type: n.id === 'a' ? 'DOOR' : 'NORMAL' })),
    pois: [{ id: 'poi-exit', floorId: 'f1', nodeId: 'exitR', name: 'Cửa sau', category: 'EXIT' }],
  }

  it('không có node EXIT nhưng có POI EXIT: tuyến thoát hiểm tới node neo của POI đó', async () => {
    const store = await loaded({ getFloorMap: async () => noExitMap })
    store.getState().triggerFireAlarm(undefined, 'a')
    assert.equal(store.getState().route?.nodeIds.at(-1), 'exitR')
    assert.equal(store.getState().routeWarning, undefined)
  })

  it('kịch bản F4 chạy được và chặn lần lượt lối thoát', async () => {
    const store = await loaded({ getFloorMap: async () => noExitMap })
    await store.getState().runDemoScenario('fire-exit-1')
    assert.deepEqual(store.getState().activeFireNodeIds, ['exitR'])
  })
})

describe('F2 cháy tầng giữa', () => {
  const floor2: PublicFloor = { ...floor, id: 'f2', floorNumber: 2, name: 'T2' }
  const n2 = (id: string, x: number, type = 'NORMAL'): PublicNode => ({ id, floorId: 'f2', x, y: 0, type, accessible: true })
  const upper: PublicFloorMap = {
    floor: floor2,
    nodes: [n2('lift2', 200, 'ELEVATOR'), n2('exit2', 210, 'EXIT'), n2('c2', 260), n2('stair2', 400, 'STAIR')],
    edges: [{ id: 'u1', floorId: 'f2', fromNodeId: 'lift2', toNodeId: 'exit2' }, { id: 'u2', floorId: 'f2', fromNodeId: 'exit2', toNodeId: 'c2' }, { id: 'u3', floorId: 'f2', fromNodeId: 'c2', toNodeId: 'stair2' }],
    pois: [], stores: [],
  }

  it('không chọn node lối thoát làm vị trí người dùng (tuyến 0 m vô nghĩa)', async () => {
    const store = await loaded({
      getFloors: async () => [floor, floor2],
      getFloorMap: async (id) => (id === 'f2' ? upper : map),
    })
    await store.getState().runDemoScenario('fire-middle-floor')
    assert.notEqual(store.getState().simulationStartNodeId, 'exit2')
    assert.ok(store.getState().simulationStartNodeId)
  })
})

describe('ưu tiên loại thang và xuất phát tự chọn', () => {
  const floor2: PublicFloor = { ...floor, id: 'f2', floorNumber: 2, name: 'T2' }
  const at = (id: string, floorId: string, x: number, type = 'NORMAL'): PublicNode => ({ id, floorId, x, y: 0, type, accessible: true })
  const edgeOf = (id: string, floorId: string, from: string, to: string) => ({ id, floorId, fromNodeId: from, toNodeId: to })
  // Thang bộ gần điểm xuất phát nên tự động chọn thang bộ; thang máy xa hơn.
  const lower: PublicFloorMap = {
    floor, pois: [], stores: [],
    nodes: [at('s', 'f1', 0), at('stairA', 'f1', 100, 'STAIR'), at('liftA', 'f1', 300, 'ELEVATOR')],
    edges: [edgeOf('l1', 'f1', 's', 'stairA'), edgeOf('l2', 'f1', 's', 'liftA')],
  }
  const upper: PublicFloorMap = {
    floor: floor2, pois: [], stores: [],
    nodes: [at('stairB', 'f2', 100, 'STAIR'), at('liftB', 'f2', 300, 'ELEVATOR'), at('shop', 'f2', 400)],
    edges: [edgeOf('u1', 'f2', 'stairB', 'shop'), edgeOf('u2', 'f2', 'liftB', 'shop')],
  }
  const shopPoi: PublicSearchResult = { type: 'POI', id: 'shop-poi', name: 'Cửa hàng T2', floorId: 'f2', nodeId: 'shop', x: 400, y: 0 }
  const twoFloors: Partial<NavigationGateway> = {
    getFloors: async () => [floor, floor2],
    getFloorMap: async (id) => (id === 'f2' ? upper : lower),
    searchDestinations: async () => [shopPoi],
    getVerticalLinks: async () => [
      { nodeIdFrom: 'stairA', nodeIdTo: 'stairB', kind: 'STAIR' },
      { nodeIdFrom: 'liftA', nodeIdTo: 'liftB', kind: 'ELEVATOR' },
    ],
  }
  const kinds = (route?: IndoorRoute) => route?.steps.flatMap((step) => (step.transition ? [step.transition] : []))

  it('tự động: chọn đường rẻ nhất (thang bộ vì ở gần)', async () => {
    const store = await loaded(twoFloors)
    const route = await store.getState().findRoute({ fromNodeId: 's', toStoreId: 'shop-poi', wheelchairMode: false })
    assert.deepEqual(kinds(route), ['STAIR'])
  })

  it('chọn thang máy: đi thang máy dù xa hơn', async () => {
    const store = await loaded(twoFloors)
    const route = await store.getState().findRoute({ fromNodeId: 's', toStoreId: 'shop-poi', wheelchairMode: false, transitions: ['ELEVATOR'] })
    assert.deepEqual(kinds(route), ['ELEVATOR'])
  })

  it('chọn thang cuốn khi tòa nhà không có: báo lỗi rõ ràng, không rơi sang loại khác', async () => {
    const store = await loaded(twoFloors)
    await assert.rejects(
      () => store.getState().findRoute({ fromNodeId: 's', toStoreId: 'shop-poi', wheelchairMode: false, transitions: ['ESCALATOR'] }),
      /loại thang đã chọn/,
    )
  })

  it('kịch bản demo xuất phát từ node người dùng đã chọn thay vì node mặc định', async () => {
    const store = await loaded()
    await store.getState().runDemoScenario('same-floor-shortest', 'c')
    assert.equal(store.getState().simulationStartNodeId, 'c')
    await store.getState().runDemoScenario('same-floor-shortest', 'node-khong-ton-tai')
    assert.equal(store.getState().simulationStartNodeId, 'a')
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
