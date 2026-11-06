import { apiClient } from './client'
import {
  connectorFromDto,
  draftFromDto,
  draftToApplyDto,
  edgeFromDto,
  nodeFromDto,
  nodeToCreateDto,
  poiFromDto,
  poiToCreateDto,
  poiToUpdateDto,
  positionToDto,
  type ConnectorDto,
  type GraphEdgeDto,
  type GraphNodeDto,
  type NavigationDraftDto,
  type PoiDto,
} from './graphMapper'
import type { MapSize, PercentPoint } from '../types/geometry'
import type { Connector, GraphDraft, GraphEdge, GraphNode, NewConnector, NewGraphNode } from '../types/graph'
import type { NewPoi, Poi, PoiDetailsPatch } from '../types/poi'

/** Hợp đồng store <-> mạng. Nhận/trả domain type (%); đổi pixel xảy ra trong graphMapper. */
export type GraphGateway = {
  fetchGraph(floorId: string, size: MapSize, signal?: AbortSignal): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>
  createNode(floorId: string, size: MapSize, input: NewGraphNode): Promise<GraphNode>
  moveNode(nodeId: string, size: MapSize, to: PercentPoint): Promise<void>
  deleteNode(nodeId: string): Promise<void>
  /** Một lần gọi xoá mọi node + edge của tầng (BE gỡ luôn POI và connector gắn vào). */
  clearFloorGraph(floorId: string): Promise<void>
  createEdge(floorId: string, fromNodeId: string, toNodeId: string): Promise<GraphEdge>
  deleteEdge(edgeId: string): Promise<void>
  fetchConnectors(buildingId: string, signal?: AbortSignal): Promise<Connector[]>
  createConnector(buildingId: string, input: NewConnector): Promise<Connector>
  deleteConnector(connectorId: string): Promise<void>
}

export const graphGateway: GraphGateway = {
  async fetchGraph(floorId, size, signal) {
    const [{ data: nodes }, { data: edges }] = await Promise.all([
      apiClient.get<GraphNodeDto[]>(`/floors/${floorId}/nodes`, { signal }),
      apiClient.get<GraphEdgeDto[]>(`/floors/${floorId}/edges`, { signal }),
    ])
    return {
      // Phòng thủ: BE trả lẫn tầng khác thì bỏ, không để lọt vào state của tầng này.
      nodes: nodes.filter((node) => node.floorId === floorId).map((node) => nodeFromDto(node, size)),
      edges: edges.filter((edge) => edge.floorId === floorId).map(edgeFromDto),
    }
  },
  async createNode(floorId, size, input) {
    const { data } = await apiClient.post<GraphNodeDto>(`/floors/${floorId}/nodes`, nodeToCreateDto(input, size))
    return nodeFromDto(data, size)
  },
  async moveNode(nodeId, size, to) {
    await apiClient.patch(`/nodes/${nodeId}`, positionToDto(to, size))
  },
  async deleteNode(nodeId) {
    await apiClient.delete(`/nodes/${nodeId}`)
  },
  async clearFloorGraph(floorId) {
    await apiClient.delete(`/floors/${floorId}/graph`)
  },
  async createEdge(floorId, fromNodeId, toNodeId) {
    const { data } = await apiClient.post<GraphEdgeDto>(`/floors/${floorId}/edges`, { fromNodeId, toNodeId })
    return edgeFromDto(data)
  },
  async deleteEdge(edgeId) {
    await apiClient.delete(`/edges/${edgeId}`)
  },
  async fetchConnectors(buildingId, signal) {
    const { data } = await apiClient.get<ConnectorDto[]>(`/buildings/${buildingId}/connectors`, { signal })
    return data.map(connectorFromDto)
  },
  async createConnector(buildingId, input) {
    const { data } = await apiClient.post<ConnectorDto>(`/buildings/${buildingId}/connectors`, input)
    return connectorFromDto(data)
  },
  async deleteConnector(connectorId) {
    await apiClient.delete(`/connectors/${connectorId}`)
  },
}

type NavigationDraftApplyResult = {
  nodesCreated: number
  edgesCreated: number
  replayed?: boolean
}

export async function analyzeNavigationDraft(floorId: string, size: MapSize): Promise<GraphDraft> {
  const { data } = await apiClient.post<NavigationDraftDto>(`/floors/${floorId}/navigation-analysis`, undefined, {
    timeout: 120_000,
  })
  if (data.coordinateSpace !== undefined && data.coordinateSpace !== 'PIXEL') {
    throw new Error('Phản hồi Analyze không ở hệ toạ độ pixel bản đồ.')
  }
  return draftFromDto(data, size)
}

export async function applyNavigationDraft(floorId: string, size: MapSize, draft: GraphDraft) {
  const { data } = await apiClient.post<NavigationDraftApplyResult>(`/floors/${floorId}/navigation-draft/apply`, {
    // draftId để BE bỏ qua double click / retry của cùng một lần Apply
    draftId: globalThis.crypto?.randomUUID?.(),
    ...draftToApplyDto(draft, size),
  })
  return data
}

/** Hợp đồng store <-> mạng cho POI v2. Domain là %, pixel chỉ xuất hiện trong graphMapper. */
export type PoiGateway = {
  fetchPois(floorId: string, size: MapSize, signal?: AbortSignal): Promise<Poi[]>
  /** `nodeId` bỏ trống → BE tự snap (cần tầng đã hiệu chuẩn). */
  createPoi(floorId: string, size: MapSize, input: NewPoi, nodeId: string | null): Promise<Poi>
  updatePoi(
    poiId: string,
    size: MapSize,
    patch: PoiDetailsPatch & { position?: PercentPoint; nodeId?: string | null },
  ): Promise<Poi>
  deletePoi(poiId: string): Promise<void>
  /** Một lần gọi xoá mọi POI của tầng. */
  clearFloorPois(floorId: string): Promise<void>
}

export const poiGateway: PoiGateway = {
  async fetchPois(floorId, size, signal) {
    const { data: dtos } = await apiClient.get<PoiDto[]>(`/floors/${floorId}/pois`, { signal })
    // POI tạo trước v2 chưa có x/y riêng: mượn vị trí node neo của nó (chỉ tải node khi thật sự cần).
    const needsNodes = dtos.some((dto) => dto.x == null || dto.y == null)
    const nodeById = new Map<string, GraphNode>()
    if (needsNodes) {
      const { data: nodes } = await apiClient.get<GraphNodeDto[]>(`/floors/${floorId}/nodes`, { signal })
      for (const node of nodes) nodeById.set(node.id, nodeFromDto(node, size))
    }
    return dtos
      .filter((dto) => dto.floorId === floorId)
      .flatMap((dto) => poiFromDto(dto, size, nodeById.get(dto.nodeId)) ?? [])
  },
  async createPoi(floorId, size, input, nodeId) {
    const { data } = await apiClient.post<PoiDto>(`/floors/${floorId}/pois`, poiToCreateDto(input, size, nodeId))
    return toPoi(data, size)
  },
  async updatePoi(poiId, size, patch) {
    const { data } = await apiClient.patch<PoiDto>(`/pois/${poiId}`, poiToUpdateDto(patch, size))
    return toPoi(data, size)
  },
  async clearFloorPois(floorId) {
    await apiClient.delete(`/floors/${floorId}/pois`)
  },
  async deletePoi(poiId) {
    await apiClient.delete(`/pois/${poiId}`)
  },
}

function toPoi(dto: PoiDto, size: MapSize): Poi {
  const poi = poiFromDto(dto, size)
  if (!poi) throw new Error('BE trả POI không có vị trí')
  return poi
}
