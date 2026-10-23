import { create } from 'zustand'
import {
  createEdge as createEdgeRequest,
  deleteEdge as deleteEdgeRequest,
  deleteNode as deleteNodeRequest,
  createNode as createNodeRequest,
  generateNavigationGraph as generateNavigationGraphRequest,
  getEdgesByFloor,
  getNodesByFloor,
  updateNode as updateNodeRequest,
  updateEdge as updateEdgeRequest,
} from '../api/nodes'
import type {
  CreateEdgePayload,
  CreateNodePayload,
  Edge,
  Node,
  UpdateNodePayload,
} from '../types/node'

type NodeState = {
  nodesByFloorId: Record<string, Node[]>
  edgesByFloorId: Record<string, Edge[]>
  isLoading: boolean
  isSaving: boolean
  error: string | null
  loadNodesByFloors: (floorIds: string[]) => Promise<void>
  loadGraphByFloors: (floorIds: string[]) => Promise<void>
  generateNavigationGraph: (floorId: string) => Promise<void>
  createNode: (floorId: string, payload: CreateNodePayload) => Promise<Node>
  updateNode: (nodeId: string, payload: UpdateNodePayload) => Promise<Node>
  createEdge: (payload: CreateEdgePayload) => Promise<Edge>
  updateEdge: (edgeId: string, payload: import('../types/node').UpdateEdgePayload) => Promise<Edge>
  deleteNode: (nodeId: string) => Promise<void>
  deleteEdge: (edgeId: string) => Promise<void>
  updateNodeElevatorGroup: (
    nodeId: string,
    elevatorGroupId: string | null,
  ) => Promise<Node>
}

function syncNode(nodesByFloorId: Record<string, Node[]>, updatedNode: Node) {
  const floorNodes = nodesByFloorId[updatedNode.floorId] ?? []

  return {
    ...nodesByFloorId,
    [updatedNode.floorId]: floorNodes.map((node) =>
      node.id === updatedNode.id ? updatedNode : node,
    ),
  }
}

export const useNodeStore = create<NodeState>((set) => ({
  nodesByFloorId: {},
  edgesByFloorId: {},
  isLoading: false,
  isSaving: false,
  error: null,

  async loadNodesByFloors(floorIds) {
    set({ isLoading: true, error: null })
    try {
      const nodeEntries = await Promise.all(
        floorIds.map(async (floorId) => [floorId, await getNodesByFloor(floorId)] as const),
      )

      set((state) => ({
        nodesByFloorId: {
          ...state.nodesByFloorId,
          ...Object.fromEntries(nodeEntries),
        },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async loadGraphByFloors(floorIds) {
    set({ isLoading: true, error: null })
    try {
      const graphEntries = await Promise.all(
        floorIds.map(async (floorId) => {
          const [nodes, edges] = await Promise.all([
            getNodesByFloor(floorId),
            getEdgesByFloor(floorId),
          ])
          return [floorId, { nodes, edges }] as const
        }),
      )

      set((state) => ({
        nodesByFloorId: {
          ...state.nodesByFloorId,
          ...Object.fromEntries(
            graphEntries.map(([floorId, graph]) => [floorId, graph.nodes]),
          ),
        },
        edgesByFloorId: {
          ...state.edgesByFloorId,
          ...Object.fromEntries(
            graphEntries.map(([floorId, graph]) => [floorId, graph.edges]),
          ),
        },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async createNode(floorId, payload) {
    set({ isSaving: true, error: null })
    try {
      const node = await createNodeRequest(floorId, payload)
      set((state) => ({
        nodesByFloorId: {
          ...state.nodesByFloorId,
          [floorId]: [...(state.nodesByFloorId[floorId] ?? []), node],
        },
      }))
      return node
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  async generateNavigationGraph(floorId) {
    set({ isSaving: true, error: null })
    try {
      const graph = await generateNavigationGraphRequest(floorId)
      set((state) => ({
        nodesByFloorId: {
          ...state.nodesByFloorId,
          [floorId]: graph.nodes,
        },
        edgesByFloorId: {
          ...state.edgesByFloorId,
          [floorId]: graph.edges,
        },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  async updateNode(nodeId, payload) {
    set({ isSaving: true, error: null })
    try {
      const updatedNode = await updateNodeRequest(nodeId, payload)
      set((state) => ({
        nodesByFloorId: syncNode(state.nodesByFloorId, updatedNode),
      }))
      return updatedNode
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  async createEdge(payload) {
    set({ isSaving: true, error: null })
    try {
      const edge = await createEdgeRequest(payload)
      set((state) => ({
        edgesByFloorId: {
          ...state.edgesByFloorId,
          [edge.floorId]: [...(state.edgesByFloorId[edge.floorId] ?? []), edge],
        },
      }))
      return edge
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  async updateNodeElevatorGroup(nodeId, elevatorGroupId) {
    set({ isSaving: true, error: null })
    try {
      const updatedNode = await updateNodeRequest(nodeId, { elevatorGroupId })
      set((state) => ({
        nodesByFloorId: syncNode(state.nodesByFloorId, updatedNode),
      }))
      return updatedNode
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ isSaving: false })
    }
  },

  async updateEdge(edgeId, payload) {
    set({ isSaving: true, error: null })
    try {
      const updatedEdge = await updateEdgeRequest(edgeId, payload)
      set((state) => ({ edgesByFloorId: { ...state.edgesByFloorId, [updatedEdge.floorId]: (state.edgesByFloorId[updatedEdge.floorId] ?? []).map((edge) => edge.id === edgeId ? updatedEdge : edge) } }))
      return updatedEdge
    } catch (error) { set({ error: (error as Error).message }); throw error } finally { set({ isSaving: false }) }
  },

  async deleteNode(nodeId) {
    set({ isSaving: true, error: null })
    try {
      await deleteNodeRequest(nodeId)
      set((state) => ({
        nodesByFloorId: Object.fromEntries(Object.entries(state.nodesByFloorId).map(([floorId, nodes]) => [floorId, nodes.filter((node) => node.id !== nodeId)])),
        edgesByFloorId: Object.fromEntries(Object.entries(state.edgesByFloorId).map(([floorId, edges]) => [floorId, edges.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId)])),
      }))
    } catch (error) { set({ error: (error as Error).message }); throw error } finally { set({ isSaving: false }) }
  },

  async deleteEdge(edgeId) {
    set({ isSaving: true, error: null })
    try { await deleteEdgeRequest(edgeId); set((state) => ({ edgesByFloorId: Object.fromEntries(Object.entries(state.edgesByFloorId).map(([floorId, edges]) => [floorId, edges.filter((edge) => edge.id !== edgeId)])) })) }
    catch (error) { set({ error: (error as Error).message }); throw error } finally { set({ isSaving: false }) }
  },
}))
