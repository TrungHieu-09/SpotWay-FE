import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createStore } from 'zustand/vanilla'
import type { GraphGateway } from '../api/graphGateway.ts'
import type { GraphEdge, GraphNode, NewGraphNode } from '../types/graph.ts'
import { createGraphSlice } from './createGraphStore.ts'

const size = { width: 1000, height: 500 }
const input: NewGraphNode = { x: 10, y: 20, type: 'NORMAL', name: null, accessible: true }

const node = (id: string, floorId: string, x = 0, y = 0): GraphNode => ({
  id, floorId, x, y, name: null, type: 'NORMAL', accessible: true, hazard: 'NONE',
})
const edge = (id: string, floorId: string, fromNodeId: string, toNodeId: string): GraphEdge => ({
  id, floorId, fromNodeId, toNodeId, accessible: true, status: 'ACTIVE', hazard: 'NONE',
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function setup(overrides: Partial<GraphGateway> = {}) {
  const calls: string[] = []
  let counter = 0
  const gateway: GraphGateway = {
    fetchGraph: async () => ({ nodes: [], edges: [] }),
    createNode: async (floorId, _size, value) => {
      calls.push('createNode')
      return { ...node(`real-n${++counter}`, floorId, value.x, value.y) }
    },
    moveNode: async (id) => { calls.push(`moveNode:${id}`) },
    deleteNode: async (id) => { calls.push(`deleteNode:${id}`) },
    createEdge: async (floorId, from, to) => {
      calls.push(`createEdge:${from}>${to}`)
      return edge(`real-e${++counter}`, floorId, from, to)
    },
    deleteEdge: async (id) => { calls.push(`deleteEdge:${id}`) },
    fetchConnectors: async () => [],
    createConnector: async (buildingId, value) => ({ ...value, id: 'new-c', buildingId }),
    deleteConnector: async (id) => { calls.push(`deleteConnector:${id}`) },
    ...overrides,
  }
  const store = createStore(createGraphSlice(gateway))
  return { store, calls }
}

describe('loadFloorGraph', () => {
  it('response muộn của tầng A không ghi đè state tầng B', async () => {
    const a = deferred<{ nodes: GraphNode[]; edges: GraphEdge[] }>()
    const { store } = setup({
      fetchGraph: (floorId) => (floorId === 'A' ? a.promise : Promise.resolve({ nodes: [node('b1', 'B')], edges: [] })),
    })
    const loadA = store.getState().loadFloorGraph('A', size)
    await store.getState().loadFloorGraph('B', size)
    store.getState().clearFloor('A')
    a.resolve({ nodes: [node('a1', 'A')], edges: [] })
    await loadA

    const state = store.getState()
    assert.deepEqual(state.nodesByFloor['B']?.map((n) => n.id), ['b1'])
    assert.equal(state.nodesByFloor['A'], undefined)
    assert.equal(state.loadStatusByFloor['A'], undefined)
  })

  it('tải lại cùng tầng: request cũ bị huỷ và kết quả cũ bị bỏ', async () => {
    const first = deferred<{ nodes: GraphNode[]; edges: GraphEdge[] }>()
    let call = 0
    const { store } = setup({
      fetchGraph: () => (++call === 1 ? first.promise : Promise.resolve({ nodes: [node('new', 'A')], edges: [] })),
    })
    const stale = store.getState().loadFloorGraph('A', size)
    await store.getState().loadFloorGraph('A', size)
    first.resolve({ nodes: [node('old', 'A')], edges: [] })
    await stale
    assert.deepEqual(store.getState().nodesByFloor['A']?.map((n) => n.id), ['new'])
  })

  it('lỗi tải -> status error + thông báo', async () => {
    const { store } = setup({ fetchGraph: () => Promise.reject(new Error('mất mạng')) })
    await store.getState().loadFloorGraph('A', size)
    assert.equal(store.getState().loadStatusByFloor['A'], 'error')
    assert.match(store.getState().error ?? '', /mất mạng/)
  })
})

describe('connectors', () => {
  const lift = { id: 'c1', buildingId: 'B1', name: 'Thang máy A', kind: 'ELEVATOR' as const, accessible: true, stops: [] }

  it('nạp theo tòa nhà; response muộn của tòa đã dọn không sống lại', async () => {
    const slow = deferred<(typeof lift)[]>()
    const { store } = setup({ fetchConnectors: (id) => (id === 'B1' ? slow.promise : Promise.resolve([])) })
    const load = store.getState().loadConnectors('B1')
    store.getState().clearConnectors('B1')
    slow.resolve([lift])
    await load
    assert.equal(store.getState().connectorsByBuilding['B1'], undefined)

    const { store: other } = setup({ fetchConnectors: async () => [lift] })
    await other.getState().loadConnectors('B1')
    assert.deepEqual(other.getState().connectorsByBuilding['B1']?.map((c) => c.id), ['c1'])
  })

  it('lỗi nạp -> báo lỗi, không có dữ liệu', async () => {
    const { store } = setup({ fetchConnectors: () => Promise.reject(new Error('403')) })
    await store.getState().loadConnectors('B1')
    assert.match(store.getState().error ?? '', /Không thể tải connector: 403/)
    assert.equal(store.getState().connectorsByBuilding['B1'], undefined)
  })
})

describe('createNode', () => {
  it('hiện node ngay với id tạm, sau đó thay bằng id thật và nối edge', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorGraph('A', size)
    store.setState({ nodesByFloor: { A: [node('n0', 'A')] } })

    const tempId = store.getState().createNode('A', input, { linkFromNodeId: 'n0' })
    assert.ok(tempId?.startsWith('tmp-node-'))
    assert.equal(store.getState().nodesByFloor['A']?.length, 2)
    assert.equal(store.getState().selectedNodeId, tempId)
    assert.equal(store.getState().pendingOps, 1)

    await store.getState().flush()
    const state = store.getState()
    assert.deepEqual(state.nodesByFloor['A']?.map((n) => n.id), ['n0', 'real-n1'])
    assert.equal(state.selectedNodeId, 'real-n1')
    assert.deepEqual(state.edgesByFloor['A']?.map((e) => [e.fromNodeId, e.toNodeId]), [['n0', 'real-n1']])
    assert.ok(!state.edgesByFloor['A']?.[0].id.startsWith('tmp-'))
    assert.deepEqual(calls, ['createNode', 'createEdge:n0>real-n1'])
    assert.equal(state.pendingOps, 0)
  })

  it('đổi tầng khi đang tạo: node trả về vẫn vào đúng tầng A, không lọt sang B', async () => {
    const slow = deferred<GraphNode>()
    const { store } = setup({ createNode: () => slow.promise })
    await store.getState().loadFloorGraph('A', size)
    await store.getState().loadFloorGraph('B', size)

    store.getState().createNode('A', input)
    slow.resolve(node('real-A', 'A'))
    await store.getState().flush()

    assert.deepEqual(store.getState().nodesByFloor['A']?.map((n) => n.id), ['real-A'])
    assert.deepEqual(store.getState().nodesByFloor['B'], [])
  })

  it('lỗi server -> rollback node + edge tạm, khôi phục selection, báo lỗi', async () => {
    const { store } = setup({ createNode: () => Promise.reject(new Error('500')) })
    await store.getState().loadFloorGraph('A', size)
    store.setState({ nodesByFloor: { A: [node('n0', 'A')] }, selectedNodeId: 'n0' })

    store.getState().createNode('A', input, { linkFromNodeId: 'n0' })
    await store.getState().flush()

    const state = store.getState()
    assert.deepEqual(state.nodesByFloor['A']?.map((n) => n.id), ['n0'])
    assert.deepEqual(state.edgesByFloor['A'], [])
    assert.equal(state.selectedNodeId, 'n0')
    assert.match(state.error ?? '', /Không thể tạo node: 500/)
  })

  it('lỗi tạo edge: node giữ lại, chỉ edge bị rollback', async () => {
    const { store } = setup({ createEdge: () => Promise.reject(new Error('edge lỗi')) })
    await store.getState().loadFloorGraph('A', size)
    store.setState({ nodesByFloor: { A: [node('n0', 'A')] } })

    store.getState().createNode('A', input, { linkFromNodeId: 'n0' })
    await store.getState().flush()

    assert.equal(store.getState().nodesByFloor['A']?.length, 2)
    assert.deepEqual(store.getState().edgesByFloor['A'], [])
    assert.match(store.getState().error ?? '', /nối đường đi/)
  })

  it('chưa tải tầng -> null + báo lỗi, không đổi state', () => {
    const { store } = setup()
    assert.equal(store.getState().createNode('A', input), null)
    assert.equal(store.getState().nodesByFloor['A'], undefined)
    assert.ok(store.getState().error)
  })

  it('chuỗi nối nhanh: node thứ 2 chờ id thật của node thứ 1 trước khi tạo edge', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorGraph('A', size)
    const first = store.getState().createNode('A', input)!
    store.getState().createNode('A', input, { linkFromNodeId: first })
    await store.getState().flush()

    assert.deepEqual(calls, ['createNode', 'createNode', 'createEdge:real-n1>real-n2'])
    const state = store.getState()
    assert.deepEqual(state.edgesByFloor['A']?.map((e) => [e.fromNodeId, e.toNodeId]), [['real-n1', 'real-n2']])
  })
})

describe('alias id tạm -> id thật', () => {
  it('UI còn giữ id tạm sau khi commit vẫn nối/di chuyển/xoá đúng node thật', async () => {
    const { store, calls } = setup()
    await store.getState().loadFloorGraph('A', size)
    const first = store.getState().createNode('A', input)!
    await store.getState().flush()

    store.getState().createNode('A', input, { linkFromNodeId: first })
    store.getState().moveNode('A', first, { x: 40, y: 40 })
    await store.getState().flush()
    assert.deepEqual(
      store.getState().edgesByFloor['A']?.map((e) => [e.fromNodeId, e.toNodeId]),
      [['real-n1', 'real-n2']],
    )
    assert.ok(calls.includes('moveNode:real-n1'))
    assert.equal(store.getState().nodesByFloor['A']?.find((n) => n.id === 'real-n1')?.x, 40)
  })
})

describe('deleteNode', () => {
  it('gỡ node + edge liên quan ngay; lỗi server -> khôi phục cả hai', async () => {
    const { store } = setup({ deleteNode: () => Promise.reject(new Error('403')) })
    await store.getState().loadFloorGraph('A', size)
    store.setState({
      nodesByFloor: { A: [node('n1', 'A'), node('n2', 'A')] },
      edgesByFloor: { A: [edge('e1', 'A', 'n1', 'n2')] },
      selectedNodeId: 'n1',
    })

    store.getState().deleteNode('A', 'n1')
    assert.deepEqual(store.getState().nodesByFloor['A']?.map((n) => n.id), ['n2'])
    assert.deepEqual(store.getState().edgesByFloor['A'], [])
    assert.equal(store.getState().selectedNodeId, null)

    await store.getState().flush()
    assert.equal(store.getState().nodesByFloor['A']?.length, 2)
    assert.deepEqual(store.getState().edgesByFloor['A']?.map((e) => e.id), ['e1'])
    assert.match(store.getState().error ?? '', /Không thể xoá node/)
  })

  it('xoá node tạm khi đang tạo: chờ id thật rồi mới gọi xoá trên server', async () => {
    const slow = deferred<GraphNode>()
    const { store, calls } = setup({ createNode: () => slow.promise })
    await store.getState().loadFloorGraph('A', size)
    const tempId = store.getState().createNode('A', input)!
    store.getState().deleteNode('A', tempId)
    slow.resolve(node('real-1', 'A'))
    await store.getState().flush()

    assert.deepEqual(calls, ['deleteNode:real-1'])
    assert.deepEqual(store.getState().nodesByFloor['A'], [])
  })

  it('xoá node tạm mà việc tạo thất bại: không gọi xoá, không hồi sinh node', async () => {
    const slow = deferred<GraphNode>()
    const { store, calls } = setup({ createNode: () => slow.promise })
    await store.getState().loadFloorGraph('A', size)
    const tempId = store.getState().createNode('A', input)!
    store.getState().deleteNode('A', tempId)
    slow.reject(new Error('500'))
    await store.getState().flush()

    assert.deepEqual(calls, [])
    assert.deepEqual(store.getState().nodesByFloor['A'], [])
  })
})

describe('moveNode', () => {
  it('đổi vị trí ngay (kẹp 0..100); lỗi -> trả vị trí cũ', async () => {
    const { store } = setup({ moveNode: () => Promise.reject(new Error('x')) })
    await store.getState().loadFloorGraph('A', size)
    store.setState({ nodesByFloor: { A: [node('n1', 'A', 10, 10)] } })

    store.getState().moveNode('A', 'n1', { x: 150, y: 20 })
    assert.deepEqual(
      store.getState().nodesByFloor['A']?.map((n) => [n.x, n.y]),
      [[100, 20]],
    )
    await store.getState().flush()
    assert.deepEqual(
      store.getState().nodesByFloor['A']?.map((n) => [n.x, n.y]),
      [[10, 10]],
    )
  })

  it('lần kéo cũ lỗi không ghi đè lần kéo mới hơn', async () => {
    const first = deferred<void>()
    let call = 0
    const { store } = setup({ moveNode: () => (++call === 1 ? first.promise : Promise.resolve()) })
    await store.getState().loadFloorGraph('A', size)
    store.setState({ nodesByFloor: { A: [node('n1', 'A', 10, 10)] } })

    store.getState().moveNode('A', 'n1', { x: 20, y: 20 })
    store.getState().moveNode('A', 'n1', { x: 30, y: 30 })
    first.reject(new Error('x'))
    await store.getState().flush()
    assert.deepEqual(store.getState().nodesByFloor['A']?.map((n) => [n.x, n.y]), [[30, 30]])
  })
})

describe('edges', () => {
  it('từ chối self-loop và edge trùng (cả hai chiều)', async () => {
    const { store } = setup()
    await store.getState().loadFloorGraph('A', size)
    store.setState({
      nodesByFloor: { A: [node('n1', 'A'), node('n2', 'A')] },
      edgesByFloor: { A: [edge('e1', 'A', 'n1', 'n2')] },
    })
    assert.equal(store.getState().createEdge('A', 'n1', 'n1'), null)
    assert.equal(store.getState().createEdge('A', 'n2', 'n1'), null)
    assert.equal(store.getState().edgesByFloor['A']?.length, 1)
  })

  it('tạo edge lỗi -> rollback; xoá edge lỗi -> khôi phục', async () => {
    const { store } = setup({
      createEdge: () => Promise.reject(new Error('a')),
      deleteEdge: () => Promise.reject(new Error('b')),
    })
    await store.getState().loadFloorGraph('A', size)
    store.setState({ edgesByFloor: { A: [edge('e1', 'A', 'n1', 'n2')] } })

    store.getState().createEdge('A', 'n2', 'n3')
    await store.getState().flush()
    assert.deepEqual(store.getState().edgesByFloor['A']?.map((e) => e.id), ['e1'])

    store.getState().deleteEdge('A', 'e1')
    assert.deepEqual(store.getState().edgesByFloor['A'], [])
    await store.getState().flush()
    assert.deepEqual(store.getState().edgesByFloor['A']?.map((e) => e.id), ['e1'])
  })
})

describe('connector CRUD', () => {
  const lift = { id: 'c1', buildingId: 'B1', name: 'Thang máy A', kind: 'ELEVATOR' as const, accessible: true, stops: [] }

  it('tạo: thêm vào danh sách khi BE trả về; lỗi thì báo và không thêm', async () => {
    const { store } = setup()
    const input = { name: 'Thang B', kind: 'STAIR' as const, accessible: false, stops: [] }
    assert.equal(await store.getState().createConnector('B1', input), true)
    assert.deepEqual(store.getState().connectorsByBuilding['B1']?.map((c) => c.id), ['new-c'])

    const { store: failing } = setup({ createConnector: () => Promise.reject(new Error('409')) })
    assert.equal(await failing.getState().createConnector('B1', input), false)
    assert.match(failing.getState().error ?? '', /Không thể tạo connector: 409/)
    assert.equal(failing.getState().connectorsByBuilding['B1'], undefined)
  })

  it('xoá: gỡ ngay, lỗi thì khôi phục và báo', async () => {
    const { store, calls } = setup({ fetchConnectors: async () => [lift] })
    await store.getState().loadConnectors('B1')
    store.getState().deleteConnector('B1', 'c1')
    assert.deepEqual(store.getState().connectorsByBuilding['B1'], [])
    await store.getState().flush()
    assert.ok(calls.includes('deleteConnector:c1'))

    const { store: failing } = setup({
      fetchConnectors: async () => [lift],
      deleteConnector: () => Promise.reject(new Error('409')),
    })
    await failing.getState().loadConnectors('B1')
    failing.getState().deleteConnector('B1', 'c1')
    await failing.getState().flush()
    assert.deepEqual(failing.getState().connectorsByBuilding['B1']?.map((c) => c.id), ['c1'])
    assert.match(failing.getState().error ?? '', /Không thể xoá connector: 409/)
  })
})
