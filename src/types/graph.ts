import type { PercentPoint } from './geometry'

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

export type GraphNode = PercentPoint & {
  id: string
  floorId: string
  name: string | null
  type: NodeType
  accessible: boolean
  hazard: HazardType
}

export type NewGraphNode = Pick<GraphNode, 'x' | 'y' | 'type' | 'name' | 'accessible'>

export type GraphEdge = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  accessible: boolean
  status: EdgeStatus
  hazard: HazardType
}

export type ConnectorKind = 'ELEVATOR' | 'STAIR' | 'ESCALATOR'

type ConnectorStop = { floorId: string; nodeId: string }

/** Liên kết xuyên tầng: nhóm các node của cùng một thang máy/cầu thang/thang cuốn (ConnectorResponse của BE). */
export type Connector = {
  id: string
  buildingId: string
  name: string
  kind: ConnectorKind
  accessible: boolean
  stops: ConnectorStop[]
}

/** Dữ liệu tạo connector; `buildingId` lấy từ đường dẫn, `id` do BE cấp. */
export type NewConnector = Omit<Connector, 'id' | 'buildingId'>

/** Bản nháp node/edge do AI (hoặc mẫu) sinh ra, chờ người dùng xác nhận trước khi áp dụng. */
export type DraftNode = PercentPoint & {
  id: string
  name: string | null
  type: NodeType
  accessible: boolean
  confidence: number
  requiresConfirmation: boolean
  source?: string
}

export type DraftEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  accessible: boolean
  confidence: number
  requiresConfirmation: boolean
  source?: string
}

export type GraphDraft = {
  nodes: DraftNode[]
  edges: DraftEdge[]
  warnings: string[]
}
