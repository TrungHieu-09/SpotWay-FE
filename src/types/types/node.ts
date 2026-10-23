export type Node = {
  id: string
  floorId: string
  /** 0-100, percentage on the floor plan width. Not a pixel value. */
  x: number
  /** 0-100, percentage on the floor plan height. Not a pixel value. */
  y: number
  isElevatorLink?: boolean
  elevatorGroupId?: string | null
  poiId?: string | null
  label?: string
}

export type Edge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  accessible?: boolean
  kind?: 'walk' | 'stairs' | 'ramp'
}

export type CreateNodePayload = {
  x: number
  y: number
  isElevatorLink?: boolean
  elevatorGroupId?: string | null
  poiId?: string | null
  label?: string
}

export type CreateEdgePayload = {
  floorId: string
  fromNodeId: string
  toNodeId: string
  accessible?: boolean
  kind?: 'walk' | 'stairs' | 'ramp'
}

export type UpdateEdgePayload = Partial<Pick<Edge, 'accessible' | 'kind' | 'fromNodeId' | 'toNodeId'>>

export type NavigationGraph = {
  nodes: Node[]
  edges: Edge[]
}

export type UpdateNodePayload = Partial<{
  x: number
  y: number
  isElevatorLink: boolean
  elevatorGroupId: string | null
  poiId: string | null
  label: string
}>
