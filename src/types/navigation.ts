export type PublicFloor = {
  id: string
  buildingId: string
  floorNumber: number
  name: string
  mapImageUrl: string | null
  mapWidth: number | null
  mapHeight: number | null
}

export type NodeHazardType = 'NONE' | 'FIRE' | 'SMOKE' | 'BLOCKED'

export type VerticalLinkKind = 'ELEVATOR' | 'STAIR' | 'ESCALATOR'

export type VerticalLink = {
  id?: string
  nodeIdFrom: string
  nodeIdTo: string
  kind: VerticalLinkKind
}

export type PublicNode = {
  id: string
  floorId: string
  x: number
  y: number
  type: string
  accessible: boolean
  name?: string | null
  hazard?: NodeHazardType
}

export type PublicStore = {
  id: string
  floorId: string
  nodeId: string | null
  name: string
  status: string
}

export type PublicPoi = {
  id: string
  floorId: string
  nodeId: string
  name: string
  category: string
}

export type PublicFloorMap = {
  floor: PublicFloor
  nodes: PublicNode[]
  edges: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
    floorId: string
    accessible?: boolean
    status?: 'ACTIVE' | 'BLOCKED'
    hazard?: NodeHazardType
  }>
  pois: PublicPoi[]
  stores: PublicStore[]
}

export type PublicSearchResult = {
  type: 'STORE' | 'POI'
  id: string
  name: string
  floorId: string
  nodeId: string
  x: number
  y: number
}

export type RouteStep = {
  nodeId: string
  floorId: string
  x: number
  y: number
  bearing: number | null
  transition?: VerticalLinkKind
  targetFloorId?: string
  instruction: string
}

export type IndoorRoute = {
  totalDistance: number
  estimatedDurationSeconds: number
  nodeIds: string[]
  steps: RouteStep[]
}
