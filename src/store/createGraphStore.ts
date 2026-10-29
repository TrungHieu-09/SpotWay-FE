import type { StateCreator } from 'zustand/vanilla'
import type { GraphGateway } from '../api/graphGateway.ts'
import type { MapSize, PercentPoint } from '../types/geometry.ts'
import type { Connector, GraphEdge, GraphNode, NewConnector, NewGraphNode } from '../types/graph.ts'
import { clampPercent } from '../utils/canvasCoordinates.ts'
import { createOptimisticKit } from './optimisticKit.ts'

type GraphLoadStatus = 'loading' | 'ready' | 'error'

export type GraphState = {
  nodesByFloor: Record<string, GraphNode[]>
  edgesByFloor: Record<string, GraphEdge[]>
  mapSizeByFloor: Record<string, MapSize>
  loadStatusByFloor: Record<string, GraphLoadStatus>
  connectorsByBuilding: Record<string, Connector[]>
  selectedNodeId: string | null
  selectedEdgeId: string | null
  /** Số thao tác ghi đang bay; chỉ để hiện chỉ báo "Đang lưu…", không chặn UI. */
  pendingOps: number
  error: string | null
  loadFloorGraph: (floorId: string, size: MapSize) => Promise<void>
  clearFloor: (floorId: string) => void
  /** Trả id tạm (hiện ngay trên canvas) hoặc null nếu không tạo được. */
  createNode: (floorId: string, input: NewGraphNode, options?: { linkFromNodeId?: string }) => string | null
  moveNode: (floorId: string, nodeId: string, to: PercentPoint) => void
  deleteNode: (floorId: string, nodeId: string) => void
  /**
   * Xoá mọi node (kèm edge) của tầng, lần lượt từng node: mỗi lần xoá BE khoá dòng tầng để tăng graphVersion,
   * gửi song song vài chục lần sẽ quá hạn giao dịch và trả 500. Node bị BE từ chối tự hoàn tác, vòng lặp vẫn đi tiếp.
   */
  deleteAllNodes: (floorId: string) => Promise<void>
  createEdge: (floorId: string, fromNodeId: string, toNodeId: string) => string | null
  deleteEdge: (floorId: string, edgeId: string) => void
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  loadConnectors: (buildingId: string) => Promise<void>
  clearConnectors: (buildingId: string) => void
  /** Không optimistic (cần id từ BE). Trả true khi tạo xong. */
  createConnector: (buildingId: string, input: NewConnector) => Promise<boolean>
  deleteConnector: (buildingId: string, connectorId: string) => void
  clearError: () => void
  /** Chờ mọi thao tác ghi đang bay hoàn tất (thành công hoặc đã rollback). */
  flush: () => Promise<void>
}

const errorText = (reason: unknown) => (reason instanceof Error ? reason.message : 'Lỗi không xác định')

/**
 * Bất biến cốt lõi: mọi mutation/response chỉ ghi vào `...ByFloor[floorId]` của chính nó,
 * và bị bỏ qua nếu tầng đã bị `clearFloor`. Response muộn của tầng A không thể lọt sang tầng B.
 */
export function createGraphSlice(gateway: GraphGateway): StateCreator<GraphState> {
  return (set, get) => {
    const loads = new Map<string, AbortController>()
    const connectorLoads = new Map<string, AbortController>()
    const kit = createOptimisticKit((delta) =>
      set((state) => ({ pendingOps: Math.max(0, state.pendingOps + delta) })),
    )
    const { tempId, canon, resolveId, register, track } = kit

    const fail = (prefix: string, reason: unknown) => set({ error: `${prefix}: ${errorText(reason)}` })

    const updateNodes = (floorId: string, fn: (nodes: GraphNode[]) => GraphNode[]) =>
      set((state) =>
        state.nodesByFloor[floorId]
          ? { nodesByFloor: { ...state.nodesByFloor, [floorId]: fn(state.nodesByFloor[floorId]) } }
          : state,
      )

    const updateEdges = (floorId: string, fn: (edges: GraphEdge[]) => GraphEdge[]) =>
      set((state) =>
        state.edgesByFloor[floorId]
          ? { edgesByFloor: { ...state.edgesByFloor, [floorId]: fn(state.edgesByFloor[floorId]) } }
          : state,
      )

    const swapSelection = (from: string, to: string | null) =>
      set((state) => ({
        selectedNodeId: state.selectedNodeId === from ? to : state.selectedNodeId,
        selectedEdgeId: state.selectedEdgeId === from ? to : state.selectedEdgeId,
      }))

    return {
      nodesByFloor: {},
      edgesByFloor: {},
      mapSizeByFloor: {},
      loadStatusByFloor: {},
      connectorsByBuilding: {},
      selectedNodeId: null,
      selectedEdgeId: null,
      pendingOps: 0,
      error: null,

      async loadFloorGraph(floorId, size) {
        loads.get(floorId)?.abort()
        const controller = new AbortController()
        loads.set(floorId, controller)
        set((state) => ({
          mapSizeByFloor: { ...state.mapSizeByFloor, [floorId]: size },
          loadStatusByFloor: { ...state.loadStatusByFloor, [floorId]: 'loading' },
          nodesByFloor: { ...state.nodesByFloor, [floorId]: state.nodesByFloor[floorId] ?? [] },
          edgesByFloor: { ...state.edgesByFloor, [floorId]: state.edgesByFloor[floorId] ?? [] },
        }))
        try {
          const graph = await gateway.fetchGraph(floorId, size, controller.signal)
          if (controller.signal.aborted) return
          set((state) => ({
            loadStatusByFloor: { ...state.loadStatusByFloor, [floorId]: 'ready' },
            nodesByFloor: { ...state.nodesByFloor, [floorId]: graph.nodes },
            edgesByFloor: { ...state.edgesByFloor, [floorId]: graph.edges },
          }))
        } catch (reason) {
          if (controller.signal.aborted) return
          set((state) => ({
            loadStatusByFloor: { ...state.loadStatusByFloor, [floorId]: 'error' },
            error: `Không thể tải graph: ${errorText(reason)}`,
          }))
        } finally {
          if (loads.get(floorId) === controller) loads.delete(floorId)
        }
      },

      clearFloor(floorId) {
        loads.get(floorId)?.abort()
        loads.delete(floorId)
        set((state) => {
          const { [floorId]: removedNodes = [], ...nodesByFloor } = state.nodesByFloor
          const { [floorId]: removedEdges = [], ...edgesByFloor } = state.edgesByFloor
          const { [floorId]: _size, ...mapSizeByFloor } = state.mapSizeByFloor
          const { [floorId]: _status, ...loadStatusByFloor } = state.loadStatusByFloor
          return {
            nodesByFloor,
            edgesByFloor,
            mapSizeByFloor,
            loadStatusByFloor,
            selectedNodeId: removedNodes.some((node) => node.id === state.selectedNodeId) ? null : state.selectedNodeId,
            selectedEdgeId: removedEdges.some((edge) => edge.id === state.selectedEdgeId) ? null : state.selectedEdgeId,
          }
        })
      },

      createNode(floorId, input, options) {
        const size = get().mapSizeByFloor[floorId]
        if (!size) {
          fail('Không thể tạo node', new Error('Graph của tầng chưa được tải'))
          return null
        }
        const nodeTempId = tempId('node')
        const linkFrom = options?.linkFromNodeId ? canon(options.linkFromNodeId) : undefined
        const edgeTempId = linkFrom ? tempId('edge') : null
        const previousSelected = get().selectedNodeId
        const nodeSlot = register(nodeTempId)
        const edgeSlot = edgeTempId ? register(edgeTempId) : null

        const tempNode: GraphNode = { ...input, id: nodeTempId, floorId, hazard: 'NONE' }
        set({ error: null })
        updateNodes(floorId, (nodes) => [...nodes, tempNode])
        if (linkFrom && edgeTempId) {
          updateEdges(floorId, (edges) => [
            ...edges,
            { id: edgeTempId, floorId, fromNodeId: linkFrom, toNodeId: nodeTempId, accessible: true, status: 'ACTIVE', hazard: 'NONE' },
          ])
        }
        set({ selectedNodeId: nodeTempId, selectedEdgeId: null })

        track(
          (async () => {
            let node: GraphNode
            try {
              node = await gateway.createNode(floorId, size, input)
            } catch (reason) {
              nodeSlot.reject(reason)
              edgeSlot?.reject(reason)
              updateNodes(floorId, (nodes) => nodes.filter((item) => item.id !== nodeTempId))
              updateEdges(floorId, (edges) =>
                edges.filter((edge) => edge.fromNodeId !== nodeTempId && edge.toNodeId !== nodeTempId),
              )
              const stillExists = get().nodesByFloor[floorId]?.some((item) => item.id === previousSelected)
              swapSelection(nodeTempId, stillExists ? previousSelected : null)
              fail('Không thể tạo node', reason)
              return
            }

            const remap = (id: string) => (id === nodeTempId ? node.id : id)
            updateNodes(floorId, (nodes) => nodes.map((item) => (item.id === nodeTempId ? node : item)))
            updateEdges(floorId, (edges) =>
              edges.map((edge) => ({ ...edge, fromNodeId: remap(edge.fromNodeId), toNodeId: remap(edge.toNodeId) })),
            )
            swapSelection(nodeTempId, node.id)
            nodeSlot.resolve(node.id)

            if (!linkFrom || !edgeTempId || !edgeSlot) return
            // Người dùng đã xoá node/edge tạm trong lúc chờ: không tạo edge mồ côi trên server.
            if (!get().edgesByFloor[floorId]?.some((edge) => edge.id === edgeTempId)) {
              edgeSlot.reject(new Error('Edge đã bị xoá trước khi lưu'))
              return
            }
            try {
              const edge = await gateway.createEdge(floorId, await resolveId(linkFrom), node.id)
              updateEdges(floorId, (edges) => edges.map((item) => (item.id === edgeTempId ? edge : item)))
              swapSelection(edgeTempId, edge.id)
              edgeSlot.resolve(edge.id)
            } catch (reason) {
              edgeSlot.reject(reason)
              updateEdges(floorId, (edges) => edges.filter((item) => item.id !== edgeTempId))
              fail('Không thể nối đường đi', reason)
            }
          })(),
        )
        return nodeTempId
      },

      moveNode(floorId, rawNodeId, to) {
        const nodeId = canon(rawNodeId)
        const size = get().mapSizeByFloor[floorId]
        const node = get().nodesByFloor[floorId]?.find((item) => item.id === nodeId)
        if (!size || !node) return
        const previous = { x: node.x, y: node.y }
        const next = { x: clampPercent(to.x), y: clampPercent(to.y) }
        updateNodes(floorId, (nodes) => nodes.map((item) => (item.id === nodeId ? { ...item, ...next } : item)))

        track(
          (async () => {
            try {
              await gateway.moveNode(await resolveId(nodeId), size, next)
            } catch (reason) {
              // Chỉ hoàn tác nếu chưa có lần kéo mới hơn ghi đè.
              updateNodes(floorId, (nodes) =>
                nodes.map((item) =>
                  item.id === nodeId && item.x === next.x && item.y === next.y ? { ...item, ...previous } : item,
                ),
              )
              fail('Không thể di chuyển node', reason)
            }
          })(),
        )
      },

      deleteNode(floorId, rawNodeId) {
        const nodeId = canon(rawNodeId)
        const node = get().nodesByFloor[floorId]?.find((item) => item.id === nodeId)
        if (!node) return
        const removedEdges = (get().edgesByFloor[floorId] ?? []).filter(
          (edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId,
        )
        updateNodes(floorId, (nodes) => nodes.filter((item) => item.id !== nodeId))
        updateEdges(floorId, (edges) => edges.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId))
        set((state) => ({
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          selectedEdgeId: removedEdges.some((edge) => edge.id === state.selectedEdgeId) ? null : state.selectedEdgeId,
        }))

        track(
          (async () => {
            let realId: string
            try {
              realId = await resolveId(nodeId)
            } catch {
              return // node tạm chưa từng được tạo trên server (đã rollback): không còn gì để xoá
            }
            try {
              await gateway.deleteNode(realId)
            } catch (reason) {
              updateNodes(floorId, (nodes) => (nodes.some((item) => item.id === nodeId) ? nodes : [...nodes, node]))
              updateEdges(floorId, (edges) => [...edges, ...removedEdges.filter((r) => !edges.some((e) => e.id === r.id))])
              fail('Không thể xoá node', reason)
            }
          })(),
        )
      },

      async deleteAllNodes(floorId) {
        for (const node of [...(get().nodesByFloor[floorId] ?? [])]) {
          get().deleteNode(floorId, node.id)
          await kit.flush()
        }
      },

      createEdge(floorId, rawFromId, rawToId) {
        const fromNodeId = canon(rawFromId)
        const toNodeId = canon(rawToId)
        const edges = get().edgesByFloor[floorId]
        if (!edges || fromNodeId === toNodeId) return null
        const duplicate = edges.some(
          (edge) =>
            (edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId) ||
            (edge.fromNodeId === toNodeId && edge.toNodeId === fromNodeId),
        )
        if (duplicate) return null

        const edgeTempId = tempId('edge')
        const slot = register(edgeTempId)
        set({ error: null })
        updateEdges(floorId, (current) => [
          ...current,
          { id: edgeTempId, floorId, fromNodeId, toNodeId, accessible: true, status: 'ACTIVE', hazard: 'NONE' },
        ])

        track(
          (async () => {
            try {
              const [from, to] = await Promise.all([resolveId(fromNodeId), resolveId(toNodeId)])
              const edge = await gateway.createEdge(floorId, from, to)
              updateEdges(floorId, (current) => current.map((item) => (item.id === edgeTempId ? edge : item)))
              swapSelection(edgeTempId, edge.id)
              slot.resolve(edge.id)
            } catch (reason) {
              slot.reject(reason)
              updateEdges(floorId, (current) => current.filter((item) => item.id !== edgeTempId))
              fail('Không thể tạo edge', reason)
            }
          })(),
        )
        return edgeTempId
      },

      deleteEdge(floorId, rawEdgeId) {
        const edgeId = canon(rawEdgeId)
        const edge = get().edgesByFloor[floorId]?.find((item) => item.id === edgeId)
        if (!edge) return
        updateEdges(floorId, (edges) => edges.filter((item) => item.id !== edgeId))
        set((state) => ({ selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId }))

        track(
          (async () => {
            let realId: string
            try {
              realId = await resolveId(edgeId)
            } catch {
              return
            }
            try {
              await gateway.deleteEdge(realId)
            } catch (reason) {
              updateEdges(floorId, (edges) => (edges.some((item) => item.id === edgeId) ? edges : [...edges, edge]))
              fail('Không thể xoá edge', reason)
            }
          })(),
        )
      },

      selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
      selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),
      async loadConnectors(buildingId) {
        connectorLoads.get(buildingId)?.abort()
        const controller = new AbortController()
        connectorLoads.set(buildingId, controller)
        try {
          const connectors = await gateway.fetchConnectors(buildingId, controller.signal)
          if (controller.signal.aborted) return
          set((state) => ({ connectorsByBuilding: { ...state.connectorsByBuilding, [buildingId]: connectors } }))
        } catch (reason) {
          if (controller.signal.aborted) return
          fail('Không thể tải connector', reason)
        } finally {
          if (connectorLoads.get(buildingId) === controller) connectorLoads.delete(buildingId)
        }
      },

      clearConnectors(buildingId) {
        connectorLoads.get(buildingId)?.abort()
        connectorLoads.delete(buildingId)
        set((state) => {
          const { [buildingId]: _removed, ...connectorsByBuilding } = state.connectorsByBuilding
          return { connectorsByBuilding }
        })
      },
      createConnector(buildingId, input) {
        set({ error: null })
        const task = (async () => {
          try {
            const connector = await gateway.createConnector(buildingId, input)
            set((state) => ({
              connectorsByBuilding: {
                ...state.connectorsByBuilding,
                [buildingId]: [...(state.connectorsByBuilding[buildingId] ?? []), connector],
              },
            }))
            return true
          } catch (reason) {
            fail('Không thể tạo connector', reason)
            return false
          }
        })()
        track(task)
        return task
      },

      deleteConnector(buildingId, connectorId) {
        const connector = get().connectorsByBuilding[buildingId]?.find((item) => item.id === connectorId)
        if (!connector) return
        const setList = (fn: (list: Connector[]) => Connector[]) =>
          set((state) =>
            state.connectorsByBuilding[buildingId]
              ? { connectorsByBuilding: { ...state.connectorsByBuilding, [buildingId]: fn(state.connectorsByBuilding[buildingId]) } }
              : state,
          )
        setList((list) => list.filter((item) => item.id !== connectorId))
        track(
          (async () => {
            try {
              await gateway.deleteConnector(connectorId)
            } catch (reason) {
              setList((list) => (list.some((item) => item.id === connectorId) ? list : [...list, connector]))
              fail('Không thể xoá connector', reason)
            }
          })(),
        )
      },

      clearError: () => set({ error: null }),

      flush: kit.flush,
    }
  }
}
