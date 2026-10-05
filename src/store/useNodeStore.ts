import { create } from 'zustand'
import { getNodesByFloor, updateNode } from '../api/nodes'
import type { Node } from '../types/node'

type NodeState = {
  nodesByFloorId: Record<string, Node[]>
  isLoading: boolean
  isSaving: boolean
  error: string | null
  loadNodesByFloors: (floorIds: string[]) => Promise<void>
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

  async updateNodeElevatorGroup(nodeId, elevatorGroupId) {
    set({ isSaving: true, error: null })
    try {
      const updatedNode = await updateNode(nodeId, { elevatorGroupId })
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
}))
