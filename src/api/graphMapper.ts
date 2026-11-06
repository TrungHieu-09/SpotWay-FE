import type { MapSize, PercentPoint } from '../types/geometry.ts'
import type { Connector, ConnectorKind, EdgeStatus, GraphDraft, GraphEdge, GraphNode, HazardType, NewGraphNode, NodeType } from '../types/graph.ts'
import type { NewPoi, Poi, PoiCategory, PoiDetailsPatch } from '../types/poi.ts'
import { percentToPixel, pixelToPercent } from '../utils/canvasCoordinates.ts'

/**
 * Điểm DUY NHẤT đổi pixel <-> % với backend. BE hiện lưu node theo pixel ảnh sơ đồ
 * (0..mapWidth, 0..mapHeight); nếu BE chuyển sang % thì chỉ sửa file này.
 */

export type GraphNodeDto = {
  id: string
  floorId: string
  x: number
  y: number
  name?: string | null
  type: NodeType
  accessible?: boolean
  hazard?: HazardType
}

export type GraphEdgeDto = {
  id: string
  floorId: string
  fromNodeId: string
  toNodeId: string
  accessible?: boolean
  status?: EdgeStatus
  hazard?: HazardType
  weight?: number
}

/** POI v2 của BE: x/y là pixel bản đồ, null với POI cũ chưa có vị trí riêng. */
export type PoiDto = {
  id: string
  floorId: string
  nodeId: string
  x: number | null
  y: number | null
  snapDistanceMeters?: number | null
  name: string
  category: string
  icon?: string | null
}

export type NavigationDraftDto = {
  schemaVersion?: 1
  /** Backend luôn trả pixel bản đồ; fixture dựng cục bộ có thể bỏ trống. */
  coordinateSpace?: 'PIXEL'
  image?: { width: number; height: number }
  nodes: Array<
    Omit<GraphNodeDto, 'floorId' | 'hazard'> & { confidence: number; requiresConfirmation: boolean; source?: string }
  >
  edges: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
    accessible: boolean
    confidence: number
    requiresConfirmation: boolean
    weight?: number
    source?: string
  }>
  warnings: string[]
  diagnostics?: Record<string, unknown>
}

export type ConnectorDto = {
  id: string
  buildingId: string
  kind: ConnectorKind
  name: string
  accessible: boolean
  stops: Array<{ floorId: string; nodeId: string }>
}

type NodePositionDto = { x: number; y: number }

const POI_CATEGORIES: readonly PoiCategory[] = ['restroom', 'elevator', 'exit', 'info', 'parking', 'custom']

function assertMapSize(size: MapSize) {
  if (!(size.width > 0) || !(size.height > 0)) {
    throw new Error(`Kích thước bản đồ không hợp lệ: ${size.width}x${size.height}`)
  }
}

export function positionFromDto(dto: NodePositionDto, size: MapSize): PercentPoint {
  assertMapSize(size)
  return pixelToPercent(dto.x, dto.y, size.width, size.height)
}

export function positionToDto(point: PercentPoint, size: MapSize): NodePositionDto {
  assertMapSize(size)
  const { pixelX, pixelY } = percentToPixel(point.x, point.y, size.width, size.height)
  return { x: pixelX, y: pixelY }
}

export function nodeFromDto(dto: GraphNodeDto, size: MapSize): GraphNode {
  return {
    id: dto.id,
    floorId: dto.floorId,
    ...positionFromDto(dto, size),
    name: dto.name ?? null,
    type: dto.type,
    accessible: dto.accessible ?? true,
    hazard: dto.hazard ?? 'NONE',
  }
}

export function nodeToCreateDto(input: NewGraphNode, size: MapSize) {
  return {
    ...positionToDto(input, size),
    name: input.name,
    type: input.type,
    accessible: input.accessible,
  }
}

export function edgeFromDto(dto: GraphEdgeDto): GraphEdge {
  return {
    id: dto.id,
    floorId: dto.floorId,
    fromNodeId: dto.fromNodeId,
    toNodeId: dto.toNodeId,
    accessible: dto.accessible ?? true,
    status: dto.status ?? 'ACTIVE',
    hazard: dto.hazard ?? 'NONE',
  }
}

function toPoiCategory(raw: string | undefined): PoiCategory {
  const value = raw?.toLowerCase()
  return POI_CATEGORIES.find((category) => category === value) ?? 'custom'
}

/**
 * `node` chỉ là fallback toạ độ cho POI cũ chưa có x/y riêng. Không có cả hai → null
 * (POI không định vị được; caller phải bỏ qua).
 */
export function poiFromDto(dto: PoiDto, size: MapSize, node?: GraphNode): Poi | null {
  const position =
    dto.x != null && dto.y != null
      ? positionFromDto({ x: dto.x, y: dto.y }, size)
      : node
        ? { x: node.x, y: node.y }
        : null
  if (!position) return null
  return {
    id: dto.id,
    floorId: dto.floorId,
    name: dto.name,
    category: toPoiCategory(dto.category),
    icon: dto.icon ?? null,
    ...position,
    nearestNodeId: dto.nodeId,
  }
}

/** `nodeId` bỏ trống → BE tự snap vào node gần nhất (cần tầng đã hiệu chuẩn tỉ lệ). */
export function poiToCreateDto(input: NewPoi, size: MapSize, nodeId?: string | null) {
  return {
    ...positionToDto(input, size),
    name: input.name,
    category: input.category.toUpperCase(),
    icon: input.icon ?? undefined,
    nodeId: nodeId ?? undefined,
  }
}

export function poiToUpdateDto(
  patch: PoiDetailsPatch & { position?: PercentPoint; nodeId?: string | null },
  size: MapSize,
) {
  return {
    ...(patch.position ? positionToDto(patch.position, size) : {}),
    name: patch.name,
    category: patch.category?.toUpperCase(),
    icon: patch.icon ?? undefined,
    nodeId: patch.nodeId ?? undefined,
  }
}

export function draftFromDto(dto: NavigationDraftDto, size: MapSize): GraphDraft {
  return {
    nodes: dto.nodes.map((node) => ({
      id: node.id,
      ...positionFromDto(node, size),
      name: node.name ?? null,
      type: node.type,
      accessible: node.accessible ?? true,
      confidence: node.confidence,
      requiresConfirmation: node.requiresConfirmation,
      source: node.source,
    })),
    edges: dto.edges.map(({ weight: _weight, ...edge }) => edge),
    warnings: dto.warnings,
  }
}

/** Payload áp dụng nháp: người dùng đã xem và xác nhận nên `confirmed: true`. */
export function draftToApplyDto(draft: GraphDraft, size: MapSize) {
  return {
    mode: 'APPEND' as const,
    nodes: draft.nodes.map(({ id, name, type, accessible, ...position }) => ({
      id,
      ...positionToDto(position, size),
      name,
      type,
      accessible,
      confirmed: true,
    })),
    edges: draft.edges.map(({ id, fromNodeId, toNodeId, accessible }) => ({
      id,
      fromNodeId,
      toNodeId,
      accessible,
      confirmed: true,
    })),
  }
}

export function connectorFromDto(dto: ConnectorDto): Connector {
  return {
    id: dto.id,
    buildingId: dto.buildingId,
    name: dto.name,
    kind: dto.kind,
    accessible: dto.accessible,
    stops: dto.stops.map(({ floorId, nodeId }) => ({ floorId, nodeId })),
  }
}
