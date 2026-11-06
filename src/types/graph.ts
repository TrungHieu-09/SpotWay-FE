import type { Point } from './geometry'

export type NodeType =
  | 'NORMAL'
  | 'DOOR'
  | 'JUNCTION'
  | 'ELEVATOR'
  | 'STAIR'
  | 'ESCALATOR'
  | 'EXIT'
  | 'EMERGENCY_EXIT'

export type HazardType = 'NONE' | 'FIRE' | 'SMOKE' | 'BLOCKED'
export type EdgeStatus = 'ACTIVE' | 'BLOCKED'

export type GraphNode = Point & {
  id: string
  floorId: string
  name: string | null
  type: NodeType
  accessible: boolean
  hazard: HazardType
}

export type GraphEdge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  accessible: boolean
  status: EdgeStatus
  hazard: HazardType
}
