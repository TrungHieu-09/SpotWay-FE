import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createStore } from 'zustand/vanilla'
import type { PoiGateway } from '../api/graphGateway.ts'
import type { GraphNode } from '../types/graph.ts'
import type { NewPoi, Poi } from '../types/poi.ts'
import { createPoiSlice } from './createPoiStore.ts'

const size = { width: 1000, height: 500 }
const input: NewPoi = { x: 10, y: 10, name: 'WC', category: 'restroom', icon: null }

const node = (id: string, x: number, y: number): GraphNode => ({
  id, floorId: 'A', x, y, name: null, type: 'NORMAL', accessible: true, hazard: 'NONE',
})
const poi = (id: string, floorId = 'A', x = 10, y = 10, nearestNodeId: string | null = 'n1'): Poi => ({
  id, floorId, x, y, name: id, category: 'custom', icon: null, nearestNodeId,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function setup(overrides: Partial<PoiGateway> = {}, nodes: GraphNode[] = [node('n1', 10, 10), node('n2', 90, 90)]) {
  const calls: Array<{ op: string; nodeId?: string | null; id?: string }> = []
  let counter = 0
  const gateway: PoiGateway = {
    fetchPois: async () => [],
    createPoi: async (floorId, _size, value, nodeId) => {
      calls.push({ op: 'create', nodeId })
      return { ...poi(`real-${++counter}`, floorId, value.x, value.y, nodeId ?? 'server-node'), name: value.name }
    },
    updatePoi: async (id, _size, patch) => {
      calls.push({ op: 'update', id, nodeId: patch.nodeId })
      return poi(id, 'A', patch.position?.x, patch.position?.y, patch.nodeId ?? 'server-node')
    },
    deletePoi: async (id) => { calls.push({ op: 'delete', id }) },
    ...overrides,
  }
  const store = createStore(createPoiSlice(gateway, () => nodes))
  return { store, calls }
}

describe('loadFloorPois', () => {
  it('response muộn của tầng đã dọn không sống lại', async () => {
    const slow = deferred<Poi[]>()
    const { store } = setup({ fetchPois: () => slow.promise })
    const load = store.getState().loadFloorPois('A', size)
    store.getState().clearFloor('A')
    slow.resolve([poi('p1')])
    await load
    assert.equal(store.getState().poisByFloor['A'], undefined)
  })

  it('lỗi tải -> status error + thông báo', async () => {
    const { store } = setup({ fetchPois: () => Promise.reject(new Error('mất mạng')) })
    await store.getState().loadFloorPois('A', size)
    assert.equal(store.getState().loadStatusByFloor['A'], 'error')
    assert.match(store.getState().error ?? '', /mất mạng/)
  })
})

describe('createPoi', () => {
  it('hiện ngay, tự snap node gần nhất, gửi nodeId tường minh, thay bằng POI server', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorPois('A', size)

    const tempId = store.getState().createPoi('A', { ...input, x: 85, y: 88 })!
    const optimistic = store.getState().poisByFloor['A']![0]
    assert.equal(optimistic.id, tempId)
    assert.equal(optimistic.nearestNodeId, 'n2')
    assert.equal(store.getState().pendingOps, 1)

    await store.getState().flush()
    assert.deepEqual(calls, [{ op: 'create', nodeId: 'n2' }])
    assert.deepEqual(store.getState().poisByFloor['A']?.map((p) => p.id), ['real-1'])
    assert.equal(store.getState().pendingOps, 0)
  })

  it('tầng không có node: không gửi nodeId để BE tự quyết / báo lỗi', async () => {
    const { store, calls } = setup({}, [])
    await store.getState().loadFloorPois('A', size)
    store.getState().createPoi('A', input)
    await store.getState().flush()
    assert.deepEqual(calls, [{ op: 'create', nodeId: null }])
  })

  it('lỗi server (ví dụ snap ngoài phạm vi) -> rollback + báo lỗi', async () => {
    const { store } = setup({ createPoi: () => Promise.reject(new Error('quá xa node')) })
    await store.getState().loadFloorPois('A', size)
    store.getState().createPoi('A', input)
    await store.getState().flush()
    assert.deepEqual(store.getState().poisByFloor['A'], [])
    assert.match(store.getState().error ?? '', /Không thể tạo POI: quá xa node/)
  })

  it('đổi tầng khi đang tạo: POI vẫn vào đúng tầng A', async () => {
    const slow = deferred<Poi>()
    const { store } = setup({ createPoi: () => slow.promise })
    await store.getState().loadFloorPois('A', size)
    await store.getState().loadFloorPois('B', size)
    store.getState().createPoi('A', input)
    slow.resolve(poi('real-A', 'A'))
    await store.getState().flush()
    assert.deepEqual(store.getState().poisByFloor['A']?.map((p) => p.id), ['real-A'])
    assert.deepEqual(store.getState().poisByFloor['B'], [])
  })

  it('chưa tải tầng -> null + báo lỗi', () => {
    const { store } = setup()
    assert.equal(store.getState().createPoi('A', input), null)
    assert.ok(store.getState().error)
  })
})

describe('movePoi', () => {
  it('đổi vị trí + re-snap ngay; BE trả node neo thì cập nhật theo BE', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorPois('A', size)
    store.setState({ poisByFloor: { A: [poi('p1')] } })

    store.getState().movePoi('A', 'p1', { x: 88, y: 92 })
    const moved = store.getState().poisByFloor['A']![0]
    assert.deepEqual([moved.x, moved.y, moved.nearestNodeId], [88, 92, 'n2'])

    await store.getState().flush()
    assert.deepEqual(calls, [{ op: 'update', id: 'p1', nodeId: 'n2' }])
    assert.equal(store.getState().poisByFloor['A']![0].nearestNodeId, 'n2')
  })

  it('lỗi -> trả lại vị trí và node neo cũ', async () => {
    const { store } = setup({ updatePoi: () => Promise.reject(new Error('x')) })
    await store.getState().loadFloorPois('A', size)
    store.setState({ poisByFloor: { A: [poi('p1', 'A', 10, 10, 'n1')] } })
    store.getState().movePoi('A', 'p1', { x: 88, y: 92 })
    await store.getState().flush()
    const restored = store.getState().poisByFloor['A']![0]
    assert.deepEqual([restored.x, restored.y, restored.nearestNodeId], [10, 10, 'n1'])
  })

  it('lần kéo cũ lỗi không ghi đè lần kéo mới hơn', async () => {
    const first = deferred<Poi>()
    let call = 0
    const { store } = setup({ updatePoi: (id) => (++call === 1 ? first.promise : Promise.resolve(poi(id))) })
    await store.getState().loadFloorPois('A', size)
    store.setState({ poisByFloor: { A: [poi('p1')] } })
    store.getState().movePoi('A', 'p1', { x: 20, y: 20 })
    store.getState().movePoi('A', 'p1', { x: 30, y: 30 })
    first.reject(new Error('x'))
    await store.getState().flush()
    assert.deepEqual([store.getState().poisByFloor['A']![0].x, store.getState().poisByFloor['A']![0].y], [30, 30])
  })

  it('POI còn id tạm sau khi commit vẫn di chuyển đúng POI thật', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorPois('A', size)
    const tempId = store.getState().createPoi('A', input)!
    await store.getState().flush()
    store.getState().movePoi('A', tempId, { x: 50, y: 50 })
    await store.getState().flush()
    assert.ok(calls.some((c) => c.op === 'update' && c.id === 'real-1'))
  })
})

describe('deleteAllPois', () => {
  it('xoá mọi POI của đúng tầng đó và gọi BE cho từng POI', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorPois('A', size)
    await store.getState().loadFloorPois('B', size)
    store.setState({ poisByFloor: { A: [poi('p1'), poi('p2')], B: [poi('p3', 'B')] } })

    store.getState().deleteAllPois('A')
    assert.deepEqual(store.getState().poisByFloor['A'], [])
    assert.deepEqual(store.getState().poisByFloor['B']?.map((p) => p.id), ['p3'])

    await store.getState().flush()
    assert.deepEqual(calls.map((c) => c.id).sort(), ['p1', 'p2'])
  })

  it('BE từ chối một POI: chỉ POI đó quay lại', async () => {
    const { store } = setup({ deletePoi: async (id) => { if (id === 'p2') throw new Error('403') } })
    await store.getState().loadFloorPois('A', size)
    store.setState({ poisByFloor: { A: [poi('p1'), poi('p2')] } })

    store.getState().deleteAllPois('A')
    await store.getState().flush()
    assert.deepEqual(store.getState().poisByFloor['A']?.map((p) => p.id), ['p2'])
    assert.match(store.getState().error ?? '', /Không thể xoá POI/)
  })

  it('POI tạm đang tạo cũng bị gỡ, không để sót trên server', async () => {
    const slow = deferred<Poi>()
    const { store, calls } = setup({ createPoi: () => slow.promise })
    await store.getState().loadFloorPois('A', size)
    store.getState().createPoi('A', input)
    store.getState().deleteAllPois('A')
    slow.resolve(poi('real-1'))
    await store.getState().flush()
    assert.deepEqual(calls, [{ op: 'delete', id: 'real-1' }])
    assert.deepEqual(store.getState().poisByFloor['A'], [])
  })
})

describe('updatePoiDetails / deletePoi', () => {
  it('sửa tên ngay; lỗi -> khôi phục tên cũ', async () => {
    const { store } = setup({ updatePoi: () => Promise.reject(new Error('x')) })
    await store.getState().loadFloorPois('A', size)
    store.setState({ poisByFloor: { A: [poi('p1')] } })
    store.getState().updatePoiDetails('A', 'p1', { name: 'Mới' })
    assert.equal(store.getState().poisByFloor['A']![0].name, 'Mới')
    await store.getState().flush()
    assert.equal(store.getState().poisByFloor['A']![0].name, 'p1')
  })

  it('xoá lỗi -> khôi phục POI', async () => {
    const { store } = setup({ deletePoi: () => Promise.reject(new Error('403')) })
    await store.getState().loadFloorPois('A', size)
    store.setState({ poisByFloor: { A: [poi('p1')] } })
    store.getState().deletePoi('A', 'p1')
    assert.deepEqual(store.getState().poisByFloor['A'], [])
    await store.getState().flush()
    assert.deepEqual(store.getState().poisByFloor['A']?.map((p) => p.id), ['p1'])
    assert.match(store.getState().error ?? '', /Không thể xoá POI/)
  })

  it('xoá POI tạm khi đang tạo: chờ id thật rồi mới xoá trên server', async () => {
    const slow = deferred<Poi>()
    const { store, calls } = setup({ createPoi: () => slow.promise })
    await store.getState().loadFloorPois('A', size)
    const tempId = store.getState().createPoi('A', input)!
    store.getState().deletePoi('A', tempId)
    slow.resolve(poi('real-1'))
    await store.getState().flush()
    assert.deepEqual(calls, [{ op: 'delete', id: 'real-1' }])
    assert.deepEqual(store.getState().poisByFloor['A'], [])
  })

  it('xoá POI tạm mà việc tạo thất bại: không gọi xoá, không hồi sinh', async () => {
    const slow = deferred<Poi>()
    const { store, calls } = setup({ createPoi: () => slow.promise })
    await store.getState().loadFloorPois('A', size)
    const tempId = store.getState().createPoi('A', input)!
    store.getState().deletePoi('A', tempId)
    slow.reject(new Error('500'))
    await store.getState().flush()
    assert.deepEqual(calls, [])
    assert.deepEqual(store.getState().poisByFloor['A'], [])
  })
})
