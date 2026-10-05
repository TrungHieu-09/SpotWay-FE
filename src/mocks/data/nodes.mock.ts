import type { Node } from '../../types/node'
import { clampPercent } from '../../utils/canvasCoordinates'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'

type StoredNode = Omit<Node, 'x' | 'y' | 'elevatorGroupId'> &
  Partial<Pick<Node, 'x' | 'y' | 'elevatorGroupId'>> & {
    xPercent?: number
    yPercent?: number
  }

export const initialNodesSeed: Node[] = [
  {
    id: 'node-12',
    floorId: 'floor-1',
    x: 68,
    y: 43,
    isElevatorLink: true,
    elevatorGroupId: 'elevator-group-a',
  },
  {
    id: 'node-45',
    floorId: 'floor-2',
    x: 68,
    y: 43,
    isElevatorLink: true,
    elevatorGroupId: 'elevator-group-a',
  },
  {
    id: 'node-78',
    floorId: 'floor-3',
    x: 68,
    y: 43,
    isElevatorLink: true,
    elevatorGroupId: 'elevator-group-a',
  },
  {
    id: 'node-21',
    floorId: 'floor-1',
    x: 41,
    y: 54,
    isElevatorLink: true,
    elevatorGroupId: null,
  },
  {
    id: 'node-52',
    floorId: 'floor-2',
    x: 41,
    y: 54,
    isElevatorLink: true,
    elevatorGroupId: null,
  },
  {
    id: 'node-90',
    floorId: 'floor-4',
    x: 46,
    y: 47,
    isElevatorLink: true,
    elevatorGroupId: 'elevator-group-office',
  },
  {
    id: 'node-91',
    floorId: 'floor-5',
    x: 46,
    y: 47,
    isElevatorLink: true,
    elevatorGroupId: 'elevator-group-office',
  },
  {
    id: 'node-30',
    floorId: 'floor-1',
    x: 24,
    y: 35,
    isElevatorLink: false,
    elevatorGroupId: null,
  },
]

function normalizeNode(node: StoredNode): Node {
  const isElevatorLink = Boolean(node.isElevatorLink)

  return {
    ...node,
    x: clampPercent(node.x ?? node.xPercent ?? 0),
    y: clampPercent(node.y ?? node.yPercent ?? 0),
    isElevatorLink,
    elevatorGroupId: isElevatorLink ? (node.elevatorGroupId ?? null) : null,
  }
}

export const nodes = loadFromStorage<StoredNode[]>(
  MOCK_STORAGE_KEYS.nodes,
  initialNodesSeed,
).map(normalizeNode)
