import { delay, http, HttpResponse } from 'msw'
import { buildings } from './data/buildings.mock'
import { edges } from './data/edges.mock'
import { fallbackMap, floors, getFloorPois } from './data/floors.mock'
import { floorGeometry } from './data/geometry.mock'
import { nodes } from './data/nodes.mock'
import { stores } from './data/stores.mock'
import { promotions } from './data/promotions.mock'
import { maintenanceZones } from './data/maintenance.mock'
import { qrCodes } from './data/qr.mock'
import {
  invoices,
  plans,
  tenants,
  users,
} from './data/auth.mock'
import { areas } from './data/areas.mock'
import { MOCK_STORAGE_KEYS, saveToStorage } from './persist'
import { buildRoute, getDestinations } from './routeEngine'
import type { Building, CreateBuildingFloorPayload } from '../types/building'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import type {
  CreateEdgePayload,
  CreateNodePayload,
  Edge,
  Node,
  UpdateNodePayload,
  UpdateEdgePayload,
} from '../types/node'
import type { Poi } from '../types/poi'
import type {
  CreateStorePayload,
  Store,
  UpdateStorePayload,
} from '../types/store'
import type { FloorGeometry, Point, Room } from '../types/geometry'
import type { Role, User } from '../types/auth'
import type { Area } from '../types/area'
import type { MaintenanceZone } from '../types/maintenance'
import type { Promotion, PromotionPayload } from '../types/promotion'
import type { QrCode } from '../types/qr'
import { PERMISSIONS } from '../auth/permissions'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const resetTokens = new Map<string, string>()

function endpoint(path: string) {
  return `${API_BASE}${path}`
}

type AuthContext = {
  user: (typeof users)[number]
  tenant: (typeof tenants)[number] | null
}

type AccessResult =
  | { auth: AuthContext }
  | { response: Response }

function apiError(code: string, message: string, status: number) {
  return HttpResponse.json({ code, message }, { status })
}

function getAuth(request: Request): AuthContext | null {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return null
  }

  try {
    const payload = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/'))) as {
      userId?: string
      exp?: number
    }
    if (!payload.userId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    const user = users.find((item) => item.id === payload.userId)
    if (!user) {
      return null
    }
    return {
      user,
      tenant: user.tenantId ? tenants.find((item) => item.id === user.tenantId) ?? null : null,
    }
  } catch {
    return null
  }
}

function publicUser(user: (typeof users)[number]) {
  const { password: _password, ...safeUser } = user as User & { password?: string }
  return safeUser
}

function isValidPassword(password: string | undefined) {
  return typeof password === 'string' && /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)
}

function authUser(auth: AuthContext) {
  return { ...publicUser(auth.user), tenant: auth.tenant, areas: areas.filter((area) => auth.user.areaIds?.includes(area.id)) }
}

function makeToken(userId: string, role: Role, tenantId: string | null, areaIds: string[] = []) {
  return btoa(JSON.stringify({
    userId,
    role,
    tenantId,
    areaIds,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function requireAccess(request: Request, roles: Role[]): AccessResult {
  const auth = getAuth(request)
  if (!auth) {
    return { response: apiError('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục.', 401) }
  }
  if (!roles.includes(auth.user.role)) {
    return { response: apiError('FORBIDDEN', 'Vai trò hiện tại không được phép thực hiện thao tác này.', 403) }
  }
  return { auth }
}

function isTenantActive(tenant: AuthContext['tenant']) {
  return Boolean(
    tenant?.status === 'active' && new Date(tenant.planExpiresAt).getTime() > Date.now(),
  )
}

function tenantWriteAccess(auth: AuthContext) {
  return isTenantActive(auth.tenant)
    ? null
    : apiError('TENANT_INACTIVE', 'Doanh nghiệp đang tạm khóa hoặc gói dịch vụ đã hết hạn.', 403)
}

function canReadBuilding(request: Request, building: Building) {
  const auth = getAuth(request)
  const tenant = tenants.find((item) => item.id === building.tenantId) ?? null
  if (!auth) {
    return building.status === 'active' && isTenantActive(tenant)
      ? null
      : apiError('FORBIDDEN', 'Tòa nhà chưa được công khai.', 403)
  }
  if (auth.user.role === 'admin') {
    return apiError('FORBIDDEN', 'Quản trị viên không truy cập dữ liệu bản đồ tenant.', 403)
  }
  if (auth.user.role === 'store_owner') {
    return stores.some((store) => store.ownerUserId === auth.user.id && store.buildingId === building.id)
      ? null
      : apiError('FORBIDDEN', 'Bạn chỉ được xem dữ liệu tòa nhà có gian hàng của mình.', 403)
  }
  if (!['building_owner', 'building_manager'].includes(auth.user.role) || auth.user.tenantId !== building.tenantId) {
    return apiError('FORBIDDEN', 'Bạn không thuộc doanh nghiệp của tòa nhà này.', 403)
  }
  return null
}

function canReadFloor(request: Request, floor: Floor) {
  const building = buildings.find((item) => item.id === floor.buildingId)
  return building ? canReadBuilding(request, building) : apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
}

function canReadPublishedFloor(request: Request, floor: Floor) {
  const forbidden = canReadFloor(request, floor)
  if (forbidden) {
    return forbidden
  }
  if (!getAuth(request) && floor.publishStatus !== 'published') {
    return apiError('FORBIDDEN', 'Tầng này chưa được xuất bản.', 403)
  }
  return null
}

function canManageTenantResource(request: Request, tenantId: string, roles: Role[]) {
  const access = requireAccess(request, roles)
  if ('response' in access) {
    return access
  }
  if (access.auth.user.tenantId !== tenantId) {
    return { response: apiError('FORBIDDEN', 'Bạn không có quyền trên doanh nghiệp này.', 403) }
  }
  const inactiveResponse = tenantWriteAccess(access.auth)
  return inactiveResponse ? { response: inactiveResponse } : access
}

function canManageFloor(request: Request, floor: Floor) {
  const building = buildings.find((item) => item.id === floor.buildingId)
  if (!building) return { response: apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404) }
  const access = canManageTenantResource(request, building.tenantId, ['building_owner', 'building_manager'])
  if ('response' in access) return access
  if (access.auth.user.role === 'building_manager' && (!floor.areaId || !access.auth.user.areaIds?.includes(floor.areaId))) {
    return { response: apiError('FORBIDDEN', 'Bạn chỉ được chỉnh sửa tầng thuộc khu vực được gán.', 403) }
  }
  return access
}

function tenantOverview(tenantId: string) {
  const tenant = tenants.find((item) => item.id === tenantId)
  const plan = tenant ? plans.find((item) => item.id === tenant.planId) : undefined
  const tenantBuildings = buildings.filter((item) => item.tenantId === tenantId)
  const tenantFloors = floors.filter((item) => tenantBuildings.some((building) => building.id === item.buildingId))
  return {
    tenant,
    plan,
    usage: {
      buildings: tenantBuildings.length,
      areas: areas.filter((area) => area.tenantId === tenantId).length,
      managers: users.filter((user) => user.tenantId === tenantId && user.role === 'building_manager').length,
      storeOwners: users.filter((user) => user.tenantId === tenantId && user.role === 'store_owner').length,
      floors: tenantFloors.length,
      publishedFloors: tenantFloors.filter((floor) => floor.publishStatus === 'published').length,
      stores: stores.filter((store) => tenantBuildings.some((building) => building.id === store.buildingId)).length,
      activePromotions: 0,
    },
  }
}

function safeUsersForTenant(tenantId: string) {
  return users.filter((user) => user.tenantId === tenantId).map(publicUser)
}

function tenantScope(auth: AuthContext) {
  return auth.user.tenantId
}

function makeFloor(payload: CreateFloorPayload): Floor {
  const mapImageUrl =
    payload.mapImageUrl !== undefined
      ? payload.mapImageUrl
      : payload.planImageUrl !== undefined
        ? payload.planImageUrl
        : fallbackMap()

  return {
    id: `floor-${crypto.randomUUID()}`,
    buildingId: payload.buildingId,
    areaId: payload.areaId ?? null,
    name: payload.name,
    level: payload.level,
    publishStatus: payload.publishStatus ?? 'draft',
    mapImageUrl,
    mapWidth: payload.mapWidth ?? 1200,
    mapHeight: payload.mapHeight ?? 760,
    nextPoiNumber: payload.nextPoiNumber ?? 1,
    pois: [],
  }
}

function getNextPoiNumber(pois: Poi[]) {
  const maxPoiNumber = pois.reduce((max, poi) => {
    const match = /^POI\s+(\d+)$/.exec(poi.name.trim())
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  return maxPoiNumber + 1
}

async function fileToDataUrl(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return `data:${file.type};base64,${btoa(binary)}`
}

function parseStringArray(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return []
  }

  try {
    const parsedValue: unknown = JSON.parse(value)
    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function normalizeStoreStatus(value: FormDataEntryValue | null) {
  return value === 'active' || value === 'inactive' ? value : undefined
}

function formString(formData: FormData | null, key: string, fallback = '') {
  const value = formData?.get(key)
  return typeof value === 'string' ? value : fallback
}

function parseCreateBuildingFloors(formData: FormData) {
  const rawFloors = formData.get('floors')
  if (typeof rawFloors === 'string') {
    try {
      const parsedValue: unknown = JSON.parse(rawFloors)
      if (Array.isArray(parsedValue)) {
        return parsedValue
          .map((item, index): CreateBuildingFloorPayload | null => {
            if (!item || typeof item !== 'object') {
              return null
            }

            const floor = item as Partial<CreateBuildingFloorPayload>
            return {
              name:
                typeof floor.name === 'string' && floor.name.trim()
                  ? floor.name
                  : `Tầng ${index + 1}`,
              level:
                typeof floor.level === 'number' && Number.isFinite(floor.level)
                  ? floor.level
                  : index + 1,
              mapImageUrl:
                typeof floor.mapImageUrl === 'string'
                  ? floor.mapImageUrl
                  : null,
              mapWidth:
                typeof floor.mapWidth === 'number' ? floor.mapWidth : undefined,
              mapHeight:
                typeof floor.mapHeight === 'number'
                  ? floor.mapHeight
                  : undefined,
            }
          })
          .filter((floor): floor is CreateBuildingFloorPayload => floor !== null)
      }
    } catch {
      return []
    }
  }

  const legacyPlanImage = formData.get('planImage')
  return [
    {
      name: 'Tầng 1',
      level: 1,
      mapImageUrl: legacyPlanImage instanceof File ? null : fallbackMap(),
    },
  ]
}

function updateStoreWithPayload(store: Store, payload: UpdateStorePayload) {
  store.name = payload.name ?? store.name
  store.category = payload.category ?? store.category
  store.description = payload.description ?? store.description
  store.status = payload.status ?? store.status
  store.openingHours = payload.openingHours ?? store.openingHours
  store.roomId = payload.roomId !== undefined ? payload.roomId : store.roomId
  store.nodeId = payload.nodeId !== undefined ? payload.nodeId : store.nodeId
  if (payload.ownerUserId !== undefined) {
    store.ownerUserId = payload.ownerUserId
  }
  store.logoUrl = payload.logoUrl !== undefined ? payload.logoUrl : store.logoUrl
  store.galleryImageUrls =
    payload.galleryImageUrls?.slice(0, 5) ?? store.galleryImageUrls
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))))
}

function cloneGeometry(geometry: FloorGeometry): FloorGeometry {
  return {
    ...geometry,
    rooms: geometry.rooms.map((room) => ({
      ...room,
      polygon: room.polygon.map((point) => ({ ...point })),
    })),
  }
}

function offsetPoint(point: Point, roomIndex: number, pointIndex: number) {
  const direction = pointIndex % 2 === 0 ? 1 : -1
  const offset = 1 + ((roomIndex + pointIndex) % 3)
  return {
    x: clampPercent(point.x + direction * offset),
    y: clampPercent(point.y + (pointIndex % 3 === 0 ? offset : -offset)),
  }
}

function makeRoom(
  floorId: string,
  index: number,
  name: string,
  polygon: Point[],
): Room {
  return {
    id: `room-${floorId}-${index}-${crypto.randomUUID()}`,
    floorId,
    name,
    type: index === 1 ? 'corridor' : 'store',
    storeId: null,
    polygon,
  }
}

function generateRecognizedGeometry(floorId: string): FloorGeometry {
  const floor = floors.find((item) => item.id === floorId)
  const realWidthM = floor ? Math.max(20, Math.round(floor.mapWidth / 20)) : 60
  const realHeightM = floor ? Math.max(16, Math.round(floor.mapHeight / 20)) : 38
  const rooms: Room[] = [
    makeRoom(floorId, 1, 'Hành lang trung tâm', [
      { x: 8, y: 42 },
      { x: 92, y: 42 },
      { x: 92, y: 58 },
      { x: 8, y: 58 },
    ]),
    makeRoom(floorId, 2, 'Gian hàng A', [
      { x: 8, y: 10 },
      { x: 38, y: 10 },
      { x: 38, y: 34 },
      { x: 8, y: 34 },
    ]),
    makeRoom(floorId, 3, 'Gian hàng B', [
      { x: 62, y: 10 },
      { x: 92, y: 10 },
      { x: 92, y: 34 },
      { x: 62, y: 34 },
    ]),
    makeRoom(floorId, 4, 'Dịch vụ', [
      { x: 62, y: 66 },
      { x: 92, y: 66 },
      { x: 92, y: 88 },
      { x: 62, y: 88 },
    ]),
  ]

  return {
    floorId,
    rooms,
    wallHeight: 3.2,
    status: 'draft',
    updatedAt: new Date().toISOString(),
    realWidthM,
    realHeightM,
  }
}

function makeRecognitionDraft(floorId: string) {
  const existingGeometry = floorGeometry.find((item) => item.floorId === floorId)
  if (!existingGeometry) {
    return generateRecognizedGeometry(floorId)
  }

  const draft = cloneGeometry(existingGeometry)
  draft.rooms = draft.rooms
    .slice(0, Math.max(1, draft.rooms.length - 1))
    .map((room, roomIndex) => ({
      ...room,
      id: `rec-${room.id}`,
      polygon: room.polygon.map((point, pointIndex) =>
        offsetPoint(point, roomIndex, pointIndex),
      ),
    }))
  draft.status = 'draft'
  draft.updatedAt = new Date().toISOString()
  return draft
}

function upsertGeometry(geometry: FloorGeometry) {
  const geometryIndex = floorGeometry.findIndex(
    (item) => item.floorId === geometry.floorId,
  )

  if (geometryIndex >= 0) {
    floorGeometry[geometryIndex] = geometry
  } else {
    floorGeometry.push(geometry)
  }

  saveToStorage(MOCK_STORAGE_KEYS.geometry, floorGeometry)
}

type GraphPoint = {
  x: number
  y: number
  label?: string
  isElevatorLink?: boolean
}

function roomBounds(room: Room) {
  const xs = room.polygon.map((point) => point.x)
  const ys = room.polygon.map((point) => point.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

function roomCenter(room: Room): Point {
  const bounds = roomBounds(room)
  return {
    x: Number(((bounds.minX + bounds.maxX) / 2).toFixed(2)),
    y: Number(((bounds.minY + bounds.maxY) / 2).toFixed(2)),
  }
}

function compactStops(values: number[]) {
  return values
    .map((value) => clampPercent(value))
    .sort((left, right) => left - right)
    .reduce<number[]>((stops, value) => {
      const previous = stops.at(-1)
      if (previous === undefined || Math.abs(previous - value) >= 5) {
        stops.push(value)
      }
      return stops
    }, [])
}

function pointDistanceSquared(left: Point, right: Point) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2
}

function generateFallbackGraph(floorId: string) {
  const generatedNodes: Node[] = []
  const generatedEdges: Edge[] = []
  const rows = [24, 50, 76]
  const columns = [24, 50, 76]

  rows.forEach((y, rowIndex) => {
    columns.forEach((x) => {
      generatedNodes.push({
        id: `node-${crypto.randomUUID()}`,
        floorId,
        x,
        y,
        isElevatorLink: false,
        elevatorGroupId: null,
        poiId: null,
        label:
          rowIndex === 0 || rowIndex === rows.length - 1
            ? `Điểm ${generatedNodes.length + 1}`
            : undefined,
      })
    })
  })

  function connect(leftIndex: number, rightIndex: number) {
    generatedEdges.push({
      id: `edge-${crypto.randomUUID()}`,
      floorId,
      fromNodeId: generatedNodes[leftIndex].id,
      toNodeId: generatedNodes[rightIndex].id,
      accessible: true,
    })
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    connect(rowIndex * columns.length, rowIndex * columns.length + 1)
    connect(rowIndex * columns.length + 1, rowIndex * columns.length + 2)
  }

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    connect(columnIndex, columnIndex + columns.length)
    connect(columnIndex + columns.length, columnIndex + columns.length * 2)
  }

  return { nodes: generatedNodes, edges: generatedEdges }
}

function generateNavigationGraphFromGeometry(
  floorId: string,
  geometry?: FloorGeometry,
) {
  if (!geometry || geometry.rooms.length === 0) {
    return generateFallbackGraph(floorId)
  }

  const roomCenters = geometry.rooms.map((room) => ({
    room,
    center: roomCenter(room),
  }))
  const allBounds = geometry.rooms.reduce(
    (bounds, room) => {
      const nextBounds = roomBounds(room)
      return {
        minX: Math.min(bounds.minX, nextBounds.minX),
        maxX: Math.max(bounds.maxX, nextBounds.maxX),
        minY: Math.min(bounds.minY, nextBounds.minY),
        maxY: Math.max(bounds.maxY, nextBounds.maxY),
      }
    },
    { minX: 100, maxX: 0, minY: 100, maxY: 0 },
  )
  const corridorRooms = roomCenters.filter(
    ({ room }) => room.type === 'corridor' || room.type === 'atrium',
  )
  const centralX = Number(
    (
      (corridorRooms.reduce((sum, item) => sum + item.center.x, 0) /
        Math.max(1, corridorRooms.length)) ||
      (allBounds.minX + allBounds.maxX) / 2
    ).toFixed(2),
  )
  const centralY = Number(
    (
      (corridorRooms.reduce((sum, item) => sum + item.center.y, 0) /
        Math.max(1, corridorRooms.length)) ||
      (allBounds.minY + allBounds.maxY) / 2
    ).toFixed(2),
  )
  const xStops = compactStops([
    allBounds.minX + 4,
    centralX,
    allBounds.maxX - 4,
    ...roomCenters.map(({ center }) => center.x),
  ])
  const yStops = compactStops([
    allBounds.minY + 4,
    centralY,
    allBounds.maxY - 4,
    ...roomCenters.map(({ center }) => center.y),
  ])
  const graphPoints: GraphPoint[] = [
    ...xStops.map((x) => ({ x, y: centralY })),
    ...yStops.map((y) => ({ x: centralX, y })),
    ...roomCenters.map(({ room, center }) => ({
      x: center.x,
      y: center.y,
      label: room.type === 'corridor' || room.type === 'atrium'
        ? undefined
        : room.name,
    })),
  ]
  const generatedNodes: Node[] = []
  const generatedEdges: Edge[] = []

  function addNode(point: GraphPoint) {
    const existingNode = generatedNodes.find(
      (node) => Math.abs(node.x - point.x) < 0.4 && Math.abs(node.y - point.y) < 0.4,
    )

    if (existingNode) {
      existingNode.label = existingNode.label ?? point.label
      return existingNode
    }

    const node: Node = {
      id: `node-${crypto.randomUUID()}`,
      floorId,
      x: clampPercent(point.x),
      y: clampPercent(point.y),
      isElevatorLink: point.isElevatorLink ?? false,
      elevatorGroupId: point.isElevatorLink ? `elevator-${floorId}` : null,
      poiId: null,
      label: point.label,
    }
    generatedNodes.push(node)
    return node
  }

  function addEdge(fromNode: Node, toNode: Node) {
    if (fromNode.id === toNode.id) {
      return
    }

    const hasSameEdge = generatedEdges.some(
      (edge) =>
        (edge.fromNodeId === fromNode.id && edge.toNodeId === toNode.id) ||
        (edge.fromNodeId === toNode.id && edge.toNodeId === fromNode.id),
    )
    if (hasSameEdge) {
      return
    }

    generatedEdges.push({
      id: `edge-${crypto.randomUUID()}`,
      floorId,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      accessible: true,
    })
  }

  const horizontalNodes = xStops.map((x) => addNode({ x, y: centralY }))
  const verticalNodes = yStops.map((y) => addNode({ x: centralX, y }))
  horizontalNodes.forEach((node, index) => {
    const nextNode = horizontalNodes[index + 1]
    if (nextNode) {
      addEdge(node, nextNode)
    }
  })
  verticalNodes.forEach((node, index) => {
    const nextNode = verticalNodes[index + 1]
    if (nextNode) {
      addEdge(node, nextNode)
    }
  })

  const roomNodes = graphPoints
    .filter((point) => Boolean(point.label))
    .map((point) => addNode(point))
  const spineNodes = [...horizontalNodes, ...verticalNodes]
  roomNodes.forEach((roomNode) => {
    const nearestSpineNode = spineNodes.reduce((nearestNode, spineNode) =>
      pointDistanceSquared(roomNode, spineNode) <
      pointDistanceSquared(roomNode, nearestNode)
        ? spineNode
        : nearestNode,
    )
    addEdge(roomNode, nearestSpineNode)
  })

  if (generatedNodes.filter((node) => node.label).length < 2) {
    generatedNodes.slice(0, 2).forEach((node, index) => {
      node.label = `Điểm ${index + 1}`
    })
  }

  return { nodes: generatedNodes, edges: generatedEdges }
}

export const handlers = [
  http.post(endpoint('/auth/login'), async ({ request }) => {
    await delay(180)
    const payload = (await request.json()) as { email?: string; password?: string }
    const user = users.find((item) => item.email.toLowerCase() === payload.email?.trim().toLowerCase())
    if (!user || user.password !== payload.password) {
      return apiError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.', 401)
    }
    if (user.status === 'locked') {
      return apiError('ACCOUNT_LOCKED', 'Tài khoản đang bị khóa.', 403)
    }
    return HttpResponse.json({
      token: makeToken(user.id, user.role, user.tenantId, user.areaIds ?? []),
      user: authUser({
        user,
        tenant: user.tenantId ? tenants.find((item) => item.id === user.tenantId) ?? null : null,
      }),
    })
  }),

  http.get(endpoint('/auth/me'), async ({ request }) => {
    await delay(100)
    const access = requireAccess(request, ['admin', 'building_owner', 'building_manager', 'store_owner'])
    if ('response' in access) {
      return access.response
    }
    return HttpResponse.json(authUser(access.auth))
  }),

  http.post(endpoint('/auth/logout'), async () => {
    await delay(50)
    return HttpResponse.json({ ok: true })
  }),

  http.post(endpoint('/auth/change-password'), async ({ request }) => {
    const access = requireAccess(request, ['admin', 'building_owner', 'building_manager', 'store_owner'])
    if ('response' in access) return access.response
    const payload = (await request.json()) as { currentPassword?: string; newPassword?: string }
    const newPassword = payload.newPassword ?? ''
    if (!isValidPassword(newPassword)) return apiError('INVALID_PASSWORD', 'Mật khẩu mới phải có tối thiểu 8 ký tự, gồm chữ và số.', 400)
    if (!access.auth.user.mustChangePassword && payload.currentPassword !== access.auth.user.password) return apiError('INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng.', 401)
    access.auth.user.password = newPassword
    access.auth.user.mustChangePassword = false
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json(authUser(access.auth))
  }),

  http.post(endpoint('/auth/forgot-password'), async ({ request }) => {
    const payload = (await request.json()) as { email?: string }
    const user = users.find((item) => item.email.toLowerCase() === payload.email?.trim().toLowerCase())
    if (!user) return HttpResponse.json({ message: 'Nếu email tồn tại, mã đặt lại đã được tạo.' })
    const token = `reset-${crypto.randomUUID()}`
    resetTokens.set(token, user.id)
    return HttpResponse.json({ message: 'Mã đặt lại đã được tạo trong chế độ demo.', resetToken: token })
  }),

  http.post(endpoint('/auth/reset-password'), async ({ request }) => {
    const payload = (await request.json()) as { token?: string; newPassword?: string }
    const userId = payload.token ? resetTokens.get(payload.token) : undefined
    const user = users.find((item) => item.id === userId)
    if (!user) return apiError('INVALID_RESET_TOKEN', 'Mã đặt lại không hợp lệ hoặc đã hết hạn.', 400)
    const newPassword = payload.newPassword ?? ''
    if (!isValidPassword(newPassword)) return apiError('INVALID_PASSWORD', 'Mật khẩu mới phải có tối thiểu 8 ký tự, gồm chữ và số.', 400)
    user.password = newPassword
    user.mustChangePassword = false
    resetTokens.delete(payload.token ?? '')
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ message: 'Đặt lại mật khẩu thành công.' })
  }),

  http.get(endpoint('/admin/overview'), async ({ request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    return HttpResponse.json({
      tenants: { total: tenants.length, active: tenants.filter((tenant) => tenant.status === 'active').length, suspended: tenants.filter((tenant) => tenant.status === 'suspended').length },
      buildings: buildings.length,
      users: users.length,
      plans: plans.map((plan) => ({ planId: plan.id, planName: plan.name, count: tenants.filter((tenant) => tenant.planId === plan.id).length })),
    })
  }),

  http.get(endpoint('/admin/tenants'), async ({ request }) => {
    const access = requireAccess(request, ['admin'])
    return 'response' in access ? access.response : HttpResponse.json(tenants)
  }),

  http.get(endpoint('/admin/tenants/:tenantId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const tenant = tenants.find((item) => item.id === params.tenantId)
    if (!tenant) return apiError('NOT_FOUND', 'Không tìm thấy doanh nghiệp.', 404)
    return HttpResponse.json({ ...tenant, plan: plans.find((plan) => plan.id === tenant.planId), buildings: buildings.filter((building) => building.tenantId === tenant.id), users: safeUsersForTenant(tenant.id) })
  }),

  http.post(endpoint('/admin/tenants/:tenantId/buildings'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const tenant = tenants.find((item) => item.id === params.tenantId)
    if (!tenant) return apiError('NOT_FOUND', 'Không tìm thấy doanh nghiệp.', 404)
    const overview = tenantOverview(tenant.id)
    if (overview.plan && overview.usage.buildings >= overview.plan.maxBuildings) return apiError('PLAN_LIMIT_BUILDINGS', 'Gói hiện tại đã đạt giới hạn tòa nhà.', 403)
    const payload = (await request.json()) as { name?: string; address?: string }
    if (!payload.name?.trim() || !payload.address?.trim()) return apiError('VALIDATION_ERROR', 'Tên và địa chỉ tòa nhà là bắt buộc.', 400)
    const building: Building = { id: `bldg-${crypto.randomUUID()}`, tenantId: tenant.id, name: payload.name.trim(), address: payload.address.trim(), status: 'draft', floorCount: 0, planImageUrl: null, createdAt: new Date().toISOString() }
    buildings.push(building)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    return HttpResponse.json(building, { status: 201 })
  }),

  http.post(endpoint('/admin/tenants/:tenantId/owners'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const tenant = tenants.find((item) => item.id === params.tenantId)
    if (!tenant) return apiError('NOT_FOUND', 'Không tìm thấy doanh nghiệp.', 404)
    const payload = (await request.json()) as { name?: string; email?: string }
    if (!payload.name?.trim() || !payload.email?.trim()) return apiError('VALIDATION_ERROR', 'Tên và email chủ tòa nhà là bắt buộc.', 400)
    const email = payload.email.trim().toLowerCase()
    if (users.some((user) => user.email.toLowerCase() === email)) return apiError('EMAIL_EXISTS', 'Email tài khoản đã tồn tại.', 409)
    const owner = {
      id: `user-${crypto.randomUUID()}`,
      tenantId: tenant.id,
      role: 'building_owner' as const,
      name: payload.name.trim(),
      email,
      password: 'Demo@123',
      areaIds: [],
      createdByUserId: access.auth.user.id,
      mustChangePassword: true,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    }
    users.push(owner)
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(owner), tenantName: tenant.name, temporaryPassword: 'Demo@123' }, { status: 201 })
  }),

  http.patch(endpoint('/admin/buildings/:buildingId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    Object.assign(building, (await request.json()) as Partial<Building>)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    return HttpResponse.json(building)
  }),

  http.delete(endpoint('/admin/buildings/:buildingId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const index = buildings.findIndex((item) => item.id === params.buildingId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const floorIds = new Set(floors.filter((floor) => floor.buildingId === params.buildingId).map((floor) => floor.id))
    const storeIds = new Set(stores.filter((store) => store.buildingId === params.buildingId).map((store) => store.id))
    buildings.splice(index, 1)
    for (let item = floors.length - 1; item >= 0; item -= 1) if (floorIds.has(floors[item].id)) floors.splice(item, 1)
    for (let item = floorGeometry.length - 1; item >= 0; item -= 1) if (floorIds.has(floorGeometry[item].floorId)) floorGeometry.splice(item, 1)
    for (let item = areas.length - 1; item >= 0; item -= 1) if (areas[item].buildingId === params.buildingId) areas.splice(item, 1)
    for (let item = nodes.length - 1; item >= 0; item -= 1) if (floorIds.has(nodes[item].floorId)) nodes.splice(item, 1)
    for (let item = edges.length - 1; item >= 0; item -= 1) if (floorIds.has(edges[item].floorId)) edges.splice(item, 1)
    for (let item = stores.length - 1; item >= 0; item -= 1) if (storeIds.has(stores[item].id)) stores.splice(item, 1)
    for (let item = promotions.length - 1; item >= 0; item -= 1) if (storeIds.has(promotions[item].storeId)) promotions.splice(item, 1)
    for (let item = maintenanceZones.length - 1; item >= 0; item -= 1) if (floorIds.has(maintenanceZones[item].floorId)) maintenanceZones.splice(item, 1)
    for (let item = qrCodes.length - 1; item >= 0; item -= 1) if (qrCodes[item].buildingId === params.buildingId) qrCodes.splice(item, 1)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.geometry, floorGeometry)
    saveToStorage(MOCK_STORAGE_KEYS.areas, areas)
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)
    saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)
    saveToStorage(MOCK_STORAGE_KEYS.promotions, promotions)
    saveToStorage(MOCK_STORAGE_KEYS.maintenanceZones, maintenanceZones)
    saveToStorage(MOCK_STORAGE_KEYS.qrCodes, qrCodes)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(endpoint('/admin/tenants'), async ({ request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const payload = (await request.json()) as { name: string; subdomain: string; planId: string; planExpiresAt: string; ownerName: string; ownerEmail: string }
    const subdomain = payload.subdomain.trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(subdomain) || tenants.some((tenant) => tenant.subdomain === subdomain)) return apiError('INVALID_SUBDOMAIN', 'Subdomain không hợp lệ hoặc đã tồn tại.', 409)
    if (!plans.some((plan) => plan.id === payload.planId)) return apiError('NOT_FOUND', 'Không tìm thấy gói dịch vụ.', 404)
    if (users.some((user) => user.email.toLowerCase() === payload.ownerEmail.trim().toLowerCase())) return apiError('EMAIL_EXISTS', 'Email tài khoản đã tồn tại.', 409)
    const tenant = { id: `tenant-${crypto.randomUUID()}`, name: payload.name.trim(), subdomain, planId: payload.planId, status: 'active' as const, planExpiresAt: payload.planExpiresAt, createdAt: new Date().toISOString() }
    const owner = { id: `user-${crypto.randomUUID()}`, tenantId: tenant.id, role: 'building_owner' as const, name: payload.ownerName.trim(), email: payload.ownerEmail.trim().toLowerCase(), password: 'Demo@123', areaIds: [], createdByUserId: access.auth.user.id, mustChangePassword: true, status: 'active' as const, createdAt: new Date().toISOString() }
    tenants.push(tenant)
    users.push(owner)
    saveToStorage(MOCK_STORAGE_KEYS.tenants, tenants)
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...tenant, plan: plans.find((plan) => plan.id === tenant.planId), buildings: [], users: [publicUser(owner)], temporaryPassword: 'Demo@123' }, { status: 201 })
  }),

  http.patch(endpoint('/admin/tenants/:tenantId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const tenant = tenants.find((item) => item.id === params.tenantId)
    if (!tenant) return apiError('NOT_FOUND', 'Không tìm thấy doanh nghiệp.', 404)
    const payload = (await request.json()) as Partial<{ planId: string; planExpiresAt: string; status: 'active' | 'suspended' }>
    if (payload.planId && !plans.some((plan) => plan.id === payload.planId)) return apiError('NOT_FOUND', 'Không tìm thấy gói dịch vụ.', 404)
    Object.assign(tenant, payload)
    saveToStorage(MOCK_STORAGE_KEYS.tenants, tenants)
    return HttpResponse.json({ ...tenant, plan: plans.find((plan) => plan.id === tenant.planId), buildings: buildings.filter((building) => building.tenantId === tenant.id), users: safeUsersForTenant(tenant.id) })
  }),

  http.get(endpoint('/admin/plans'), async ({ request }) => {
    const access = requireAccess(request, ['admin'])
    return 'response' in access ? access.response : HttpResponse.json(plans)
  }),

  http.post(endpoint('/admin/plans'), async ({ request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const payload = (await request.json()) as Omit<(typeof plans)[number], 'id'>
    const plan = { ...payload, id: `plan-${crypto.randomUUID()}` }
    plans.push(plan)
    saveToStorage(MOCK_STORAGE_KEYS.plans, plans)
    return HttpResponse.json(plan, { status: 201 })
  }),

  http.patch(endpoint('/admin/plans/:planId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const plan = plans.find((item) => item.id === params.planId)
    if (!plan) return apiError('NOT_FOUND', 'Không tìm thấy gói dịch vụ.', 404)
    Object.assign(plan, (await request.json()) as Partial<typeof plan>)
    saveToStorage(MOCK_STORAGE_KEYS.plans, plans)
    return HttpResponse.json(plan)
  }),

  http.get(endpoint('/admin/users'), async ({ request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    return HttpResponse.json(users.map((user) => ({ ...publicUser(user), tenantName: tenants.find((tenant) => tenant.id === user.tenantId)?.name ?? null })))
  }),

  http.patch(endpoint('/admin/users/:userId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const user = users.find((item) => item.id === params.userId)
    if (!user) return apiError('NOT_FOUND', 'Không tìm thấy tài khoản.', 404)
    const payload = (await request.json()) as { status?: 'active' | 'locked'; resetPassword?: boolean; areaIds?: string[] }
    if (payload.status) user.status = payload.status
    if (user.role === 'building_manager' && payload.areaIds !== undefined) {
      user.areaIds = payload.areaIds.filter((areaId) => areas.some((area) => area.id === areaId && area.tenantId === user.tenantId))
    }
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), tenantName: tenants.find((tenant) => tenant.id === user.tenantId)?.name ?? null, ...(payload.resetPassword ? { temporaryPassword: 'Demo@123' } : {}) })
  }),

  http.delete(endpoint('/admin/users/:userId'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const index = users.findIndex((item) => item.id === params.userId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy tài khoản.', 404)
    users.splice(index, 1)
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(endpoint('/admin/users/:userId/reset-password'), async ({ params, request }) => {
    const access = requireAccess(request, ['admin'])
    if ('response' in access) return access.response
    const user = users.find((item) => item.id === params.userId)
    if (!user) return apiError('NOT_FOUND', 'Không tìm thấy tài khoản.', 404)
    user.password = 'Demo@123'
    user.mustChangePassword = true
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), temporaryPassword: 'Demo@123' })
  }),

  http.get(endpoint('/tenant/overview'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(tenantOverview(access.auth.user.tenantId ?? ''))
  }),

  http.get(endpoint('/tenant'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(tenantOverview(access.auth.user.tenantId ?? ''))
  }),

  http.get(endpoint('/tenant/users'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(safeUsersForTenant(access.auth.user.tenantId ?? '').filter((user) => user.role !== 'building_owner'))
  }),

  http.get(endpoint('/tenant/areas'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(areas.filter((area) => area.tenantId === access.auth.user.tenantId))
  }),

  http.get(endpoint('/store-owners'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    return HttpResponse.json(users.filter((user) => user.tenantId === access.auth.user.tenantId && user.role === 'store_owner').map((user) => ({ ...publicUser(user), storeCount: stores.filter((store) => store.ownerUserId === user.id).length })))
  }),

  http.post(endpoint('/store-owners'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const tenantId = access.auth.user.tenantId ?? ''
    const overview = tenantOverview(tenantId)
    if (overview.plan && overview.usage.storeOwners >= overview.plan.maxStoreOwners) return apiError('PLAN_LIMIT_STORE_OWNERS', 'Gói hiện tại đã đạt giới hạn chủ gian hàng.', 403)
    const payload = (await request.json()) as { name?: string; email?: string }
    if (!payload.name?.trim() || !payload.email?.trim()) return apiError('VALIDATION_ERROR', 'Họ tên và email là bắt buộc.', 400)
    if (users.some((user) => user.email.toLowerCase() === payload.email?.trim().toLowerCase())) return apiError('EMAIL_EXISTS', 'Email tài khoản đã tồn tại.', 409)
    const user = { id: `user-${crypto.randomUUID()}`, tenantId, role: 'store_owner' as const, name: payload.name.trim(), email: payload.email.trim().toLowerCase(), password: 'Demo@123', areaIds: [], createdByUserId: access.auth.user.id, mustChangePassword: true, status: 'active' as const, createdAt: new Date().toISOString() }
    users.push(user)
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), temporaryPassword: 'Demo@123', storeCount: 0 }, { status: 201 })
  }),

  http.patch(endpoint('/store-owners/:userId'), async ({ params, request }) => {
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const user = users.find((item) => item.id === params.userId && item.tenantId === access.auth.user.tenantId && item.role === 'store_owner')
    if (!user) return apiError('NOT_FOUND', 'Không tìm thấy chủ gian hàng.', 404)
    if (access.auth.user.role === 'building_manager' && user.createdByUserId !== access.auth.user.id) return apiError('FORBIDDEN', 'Bạn chỉ được quản lý tài khoản do mình tạo.', 403)
    const payload = (await request.json()) as { status?: 'active' | 'locked' }
    if (payload.status) user.status = payload.status
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), storeCount: stores.filter((store) => store.ownerUserId === user.id).length })
  }),

  http.post(endpoint('/store-owners/:userId/reset-password'), async ({ params, request }) => {
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const user = users.find((item) => item.id === params.userId && item.tenantId === access.auth.user.tenantId && item.role === 'store_owner')
    if (!user) return apiError('NOT_FOUND', 'Không tìm thấy chủ gian hàng.', 404)
    if (access.auth.user.role === 'building_manager' && user.createdByUserId !== access.auth.user.id) return apiError('FORBIDDEN', 'Bạn chỉ được quản lý tài khoản do mình tạo.', 403)
    user.password = 'Demo@123'; user.mustChangePassword = true
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), temporaryPassword: 'Demo@123' })
  }),

  http.delete(endpoint('/store-owners/:userId'), async ({ params, request }) => {
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const userIndex = users.findIndex((item) => item.id === params.userId && item.tenantId === access.auth.user.tenantId && item.role === 'store_owner')
    if (userIndex < 0) return apiError('NOT_FOUND', 'Không tìm thấy chủ gian hàng.', 404)
    const user = users[userIndex]
    if (access.auth.user.role === 'building_manager' && user.createdByUserId !== access.auth.user.id) return apiError('FORBIDDEN', 'Bạn chỉ được quản lý tài khoản do mình tạo.', 403)
    if (stores.some((store) => store.ownerUserId === user.id)) return apiError('STORE_OWNER_ASSIGNED', 'Không thể xóa tài khoản đang được gán gian hàng.', 409)
    users.splice(userIndex, 1); saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(endpoint('/tenant/users'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    const tenantId = access.auth.user.tenantId ?? ''
    const overview = tenantOverview(tenantId)
    const payload = (await request.json()) as { name: string; email: string; role: 'building_manager' | 'store_owner'; areaIds?: string[] }
    const existingCount = users.filter((user) => user.tenantId === tenantId && user.role === payload.role).length
    const limit = payload.role === 'building_manager' ? overview.plan?.maxManagers : overview.plan?.maxStoreOwners
    if (limit !== undefined && existingCount >= limit) return apiError(payload.role === 'building_manager' ? 'PLAN_LIMIT_MANAGERS' : 'PLAN_LIMIT_STORE_OWNERS', 'Gói hiện tại đã đạt giới hạn tài khoản.', 403)
    if (users.some((user) => user.email.toLowerCase() === payload.email.trim().toLowerCase())) return apiError('EMAIL_EXISTS', 'Email tài khoản đã tồn tại.', 409)
    const validAreaIds = payload.role === 'building_manager' ? (payload.areaIds ?? []).filter((areaId) => areas.some((area) => area.id === areaId && area.tenantId === tenantId)) : []
    const user = { id: `user-${crypto.randomUUID()}`, tenantId, role: payload.role, name: payload.name.trim(), email: payload.email.trim().toLowerCase(), password: 'Demo@123', areaIds: validAreaIds, createdByUserId: access.auth.user.id, mustChangePassword: true, status: 'active' as const, createdAt: new Date().toISOString() }
    users.push(user)
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), temporaryPassword: 'Demo@123' }, { status: 201 })
  }),

  http.patch(endpoint('/tenant/users/:userId'), async ({ params, request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    const user = users.find((item) => item.id === params.userId && item.tenantId === access.auth.user.tenantId)
    if (!user || user.role === 'building_owner') return apiError('NOT_FOUND', 'Không tìm thấy tài khoản nhân viên.', 404)
    const payload = (await request.json()) as { status?: 'active' | 'locked'; resetPassword?: boolean }
    if (payload.status) user.status = payload.status
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return HttpResponse.json({ ...publicUser(user), ...(payload.resetPassword ? { temporaryPassword: 'Demo@123' } : {}) })
  }),

  http.delete(endpoint('/tenant/users/:userId'), async ({ params, request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    const index = users.findIndex((user) => user.id === params.userId && user.tenantId === access.auth.user.tenantId && user.role !== 'building_owner')
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy tài khoản nhân viên.', 404)
    users.splice(index, 1)
    saveToStorage(MOCK_STORAGE_KEYS.users, users)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(endpoint('/tenant/subscription/renew'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    const tenant = tenants.find((item) => item.id === access.auth.user.tenantId)
    if (!tenant) return apiError('NOT_FOUND', 'Không tìm thấy doanh nghiệp.', 404)
    const payload = (await request.json()) as { planId: string; months: number }
    const plan = plans.find((item) => item.id === payload.planId)
    if (!plan) return apiError('NOT_FOUND', 'Không tìm thấy gói dịch vụ.', 404)
    const months = Math.max(1, Math.floor(payload.months))
    const currentExpiry = new Date(tenant.planExpiresAt).getTime() > Date.now() ? new Date(tenant.planExpiresAt) : new Date()
    currentExpiry.setMonth(currentExpiry.getMonth() + months)
    tenant.planId = plan.id
    tenant.status = 'active'
    tenant.planExpiresAt = currentExpiry.toISOString()
    invoices.push({ id: `invoice-${crypto.randomUUID()}`, tenantId: tenant.id, planId: plan.id, amountVnd: plan.priceVnd * months, months, paidAt: new Date().toISOString(), status: 'paid' })
    saveToStorage(MOCK_STORAGE_KEYS.tenants, tenants)
    saveToStorage(MOCK_STORAGE_KEYS.invoices, invoices)
    return HttpResponse.json(tenantOverview(tenant.id))
  }),

  http.get(endpoint('/tenant/invoices'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(invoices.filter((invoice) => invoice.tenantId === access.auth.user.tenantId))
  }),

  http.get(endpoint('/tenant/plans'), async ({ request }) => {
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(plans)
  }),

  http.get(endpoint('/buildings'), async ({ request }) => {
    await delay(250)
    const auth = getAuth(request)
    if (auth?.user.role === 'admin') {
      return apiError('FORBIDDEN', 'Vai trò hiện tại không truy cập danh sách tòa nhà.', 403)
    }
    const visibleBuildings = auth?.user.role === 'store_owner'
      ? buildings.filter((building) => stores.some((store) => store.ownerUserId === auth.user.id && store.buildingId === building.id))
      : auth
      ? buildings.filter((building) => building.tenantId === tenantScope(auth))
      : buildings.filter((building) => {
          const tenant = tenants.find((item) => item.id === building.tenantId)
          return building.status === 'active' && isTenantActive(tenant ?? null)
        })
    return HttpResponse.json(visibleBuildings)
  }),

  http.post(endpoint('/buildings'), async ({ request }) => {
    await delay(350)
    const access = requireAccess(request, ['building_owner'])
    if ('response' in access) {
      return access.response
    }
    if (!PERMISSIONS.ownerCanCreateBuilding) return apiError('FORBIDDEN', 'Chủ tòa nhà hiện chưa được phép tạo tòa nhà.', 403)
    const inactiveResponse = tenantWriteAccess(access.auth)
    if (inactiveResponse) {
      return inactiveResponse
    }
    const plan = plans.find((item) => item.id === access.auth.tenant?.planId)
    const currentBuildingCount = buildings.filter((item) => item.tenantId === access.auth.user.tenantId).length
    if (plan && currentBuildingCount >= plan.maxBuildings) {
      return apiError('PLAN_LIMIT_BUILDINGS', 'Gói hiện tại đã đạt giới hạn số tòa nhà.', 403)
    }
    const formData = await request.formData()
    const legacyPlanFile = formData.get('planImage')
    const legacyPlanImageUrl =
      legacyPlanFile instanceof File ? await fileToDataUrl(legacyPlanFile) : null
    const requestedFloors = parseCreateBuildingFloors(formData)
    const buildingFloors =
      requestedFloors.length > 0
        ? requestedFloors
        : [
            {
              name: 'Tầng 1',
              level: 1,
              mapImageUrl: legacyPlanImageUrl,
            },
          ]
    const buildingPlanImageUrl =
      buildingFloors.find((floor) => floor.mapImageUrl)?.mapImageUrl ??
      legacyPlanImageUrl ??
      null
    const building: Building = {
      id: `bldg-${crypto.randomUUID()}`,
      tenantId: access.auth.user.tenantId ?? 'tenant-1',
      name: String(formData.get('name') ?? 'Untitled building'),
      address: String(formData.get('address') ?? ''),
      status: 'draft',
      floorCount: buildingFloors.length,
      createdAt: new Date().toISOString(),
      planImageUrl: buildingPlanImageUrl,
    }

    buildings.unshift(building)
    const createdFloorIds: string[] = []
    buildingFloors.forEach((floor) => {
      const createdFloor = makeFloor({
        buildingId: building.id,
        name: floor.name,
        level: floor.level,
        mapImageUrl: floor.mapImageUrl,
        mapWidth: floor.mapWidth,
        mapHeight: floor.mapHeight,
      })
      floors.push(createdFloor)
      createdFloorIds.push(createdFloor.id)
    })
    const didPersistBuildings = saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    const didPersistFloors = saveToStorage(MOCK_STORAGE_KEYS.floors, floors)

    if (!didPersistBuildings || !didPersistFloors) {
      buildings.splice(buildings.findIndex((item) => item.id === building.id), 1)
      for (let index = floors.length - 1; index >= 0; index -= 1) {
        if (createdFloorIds.includes(floors[index].id)) {
          floors.splice(index, 1)
        }
      }

      return HttpResponse.json(
        {
          message:
            'Không thể lưu ảnh sơ đồ vào localStorage. Hãy dùng ảnh nhỏ hơn hoặc giảm số tầng có ảnh.',
        },
        { status: 413 },
      )
    }

    return HttpResponse.json(building, { status: 201 })
  }),

  http.get(endpoint('/buildings/:buildingId'), async ({ params, request }) => {
    await delay(120)
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) {
      return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    }
    const forbidden = canReadBuilding(request, building)
    return forbidden ?? HttpResponse.json(building)
  }),

  http.patch(endpoint('/buildings/:buildingId'), async ({ params, request }) => {
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const access = canManageTenantResource(request, building.tenantId, ['building_owner'])
    if ('response' in access) return access.response
    const payload = (await request.json()) as Partial<Pick<Building, 'name' | 'address' | 'status'>>
    Object.assign(building, payload)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    return HttpResponse.json(building)
  }),

  http.delete(endpoint('/buildings/:buildingId'), async ({ params, request }) => {
    const buildingIndex = buildings.findIndex((item) => item.id === params.buildingId)
    if (buildingIndex < 0) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const building = buildings[buildingIndex]
    const access = canManageTenantResource(request, building.tenantId, ['building_owner'])
    if ('response' in access) return access.response
    const floorIds = new Set(floors.filter((floor) => floor.buildingId === building.id).map((floor) => floor.id))
    buildings.splice(buildingIndex, 1)
    for (let index = floors.length - 1; index >= 0; index -= 1) if (floorIds.has(floors[index].id)) floors.splice(index, 1)
    for (let index = stores.length - 1; index >= 0; index -= 1) if (floorIds.has(stores[index].floorId)) stores.splice(index, 1)
    for (let index = nodes.length - 1; index >= 0; index -= 1) if (floorIds.has(nodes[index].floorId)) nodes.splice(index, 1)
    for (let index = edges.length - 1; index >= 0; index -= 1) if (floorIds.has(edges[index].floorId)) edges.splice(index, 1)
    for (let index = floorGeometry.length - 1; index >= 0; index -= 1) if (floorIds.has(floorGeometry[index].floorId)) floorGeometry.splice(index, 1)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)
    saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    saveToStorage(MOCK_STORAGE_KEYS.geometry, floorGeometry)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/buildings/:buildingId/floors'), async ({ params, request }) => {
    await delay(220)
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) {
      return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    }
    const forbidden = canReadBuilding(request, building)
    if (forbidden) {
      return forbidden
    }
    const buildingFloors = floors.filter(
      (floor) => floor.buildingId === params.buildingId,
    ).filter((floor) => getAuth(request) || floor.publishStatus === 'published')
    return HttpResponse.json(buildingFloors)
  }),

  http.get(endpoint('/buildings/:buildingId/areas'), async ({ params, request }) => {
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const forbidden = canReadBuilding(request, building)
    return forbidden ?? HttpResponse.json(areas.filter((area) => area.buildingId === building.id))
  }),

  http.post(endpoint('/buildings/:buildingId/areas'), async ({ params, request }) => {
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const access = canManageTenantResource(request, building.tenantId, ['building_owner'])
    if ('response' in access) return access.response
    const payload = (await request.json()) as Pick<Area, 'name' | 'description' | 'color'>
    const area: Area = { id: `area-${crypto.randomUUID()}`, tenantId: building.tenantId, buildingId: building.id, name: payload.name.trim(), description: payload.description, color: payload.color, createdAt: new Date().toISOString() }
    areas.push(area)
    saveToStorage(MOCK_STORAGE_KEYS.areas, areas)
    return HttpResponse.json(area, { status: 201 })
  }),

  http.patch(endpoint('/areas/:areaId'), async ({ params, request }) => {
    const area = areas.find((item) => item.id === params.areaId)
    if (!area) return apiError('NOT_FOUND', 'Không tìm thấy khu vực.', 404)
    const access = canManageTenantResource(request, area.tenantId, ['building_owner'])
    if ('response' in access) return access.response
    Object.assign(area, (await request.json()) as Partial<Pick<Area, 'name' | 'description' | 'color'>>)
    saveToStorage(MOCK_STORAGE_KEYS.areas, areas)
    return HttpResponse.json(area)
  }),

  http.delete(endpoint('/areas/:areaId'), async ({ params, request }) => {
    const areaIndex = areas.findIndex((item) => item.id === params.areaId)
    if (areaIndex < 0) return apiError('NOT_FOUND', 'Không tìm thấy khu vực.', 404)
    const area = areas[areaIndex]
    const access = canManageTenantResource(request, area.tenantId, ['building_owner'])
    if ('response' in access) return access.response
    if (users.some((user) => user.areaIds?.includes(area.id))) return apiError('AREA_IN_USE', 'Không thể xóa khu vực đang có quản lý phụ trách.', 409)
    areas.splice(areaIndex, 1)
    floors.filter((floor) => floor.areaId === area.id).forEach((floor) => { floor.areaId = null })
    saveToStorage(MOCK_STORAGE_KEYS.areas, areas)
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/buildings/:buildingId/destinations'), async ({ params, request }) => {
    await delay(160)
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) {
      return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    }
    const forbidden = canReadBuilding(request, building)
    if (forbidden) {
      return forbidden
    }
    const visibleFloorIds = new Set(
      floors
        .filter((floor) => floor.buildingId === building.id)
        .filter((floor) => getAuth(request) || floor.publishStatus === 'published')
        .map((floor) => floor.id),
    )
    return HttpResponse.json(
      getDestinations(
        { floors, geometries: floorGeometry, nodes, edges },
        String(params.buildingId),
      ).filter((destination) => visibleFloorIds.has(destination.floorId)),
    )
  }),

  http.get(endpoint('/routes'), async ({ request }) => {
    await delay(220)
    const url = new URL(request.url)
    const buildingId = url.searchParams.get('buildingId')
    const fromNodeId = url.searchParams.get('fromNodeId')
    const toNodeId = url.searchParams.get('toNodeId')

    if (!buildingId || !fromNodeId || !toNodeId) {
      return HttpResponse.json(
        { message: 'Thiếu điểm bắt đầu hoặc điểm đến' },
        { status: 400 },
      )
    }

    const building = buildings.find((item) => item.id === buildingId)
    if (!building) {
      return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    }
    const forbidden = canReadBuilding(request, building)
    if (forbidden) {
      return forbidden
    }

    const route = buildRoute(
      { floors, geometries: floorGeometry, nodes, edges, maintenanceZones, accessibleOnly: url.searchParams.get('accessible') === 'true' },
      buildingId,
      fromNodeId,
      toNodeId,
    )

    if (!route) {
      return HttpResponse.json(
        { code: 'NO_ROUTE', message: 'Không tìm thấy đường đi. Có thể điểm đã nằm trong vùng bảo trì hoặc đồ thị chưa nối thông.' },
        { status: 404 },
      )
    }

    return HttpResponse.json(route)
  }),

  http.get(endpoint('/floors/:floorId/geometry'), async ({ params, request }) => {
    await delay(140)
    const geometry = floorGeometry.find((item) => item.floorId === params.floorId)
    const floor = floors.find((item) => item.id === params.floorId)
    if (floor) {
      const forbidden = canReadPublishedFloor(request, floor)
      if (forbidden) {
        return forbidden
      }
    }

    if (!geometry) {
      return HttpResponse.json(
        { message: 'Floor geometry not found' },
        { status: 404 },
      )
    }

    return HttpResponse.json(geometry)
  }),

  http.post(endpoint('/floors/:floorId/recognize'), async ({ params, request }) => {
    await delay(1500 + Math.round(Math.random() * 500))
    const floorId = String(params.floorId)
    const floor = floors.find((item) => item.id === floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }
    const building = buildings.find((item) => item.id === floor.buildingId)
    const access = building
      ? canManageFloor(request, floor)
      : { response: apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404) }
    if ('response' in access) {
      return access.response
    }

    const draftGeometry = makeRecognitionDraft(floorId)
    upsertGeometry(draftGeometry)
    return HttpResponse.json(draftGeometry)
  }),

  http.put(endpoint('/floors/:floorId/geometry'), async ({ params, request }) => {
    await delay(180)
    const floorId = String(params.floorId)
    const floor = floors.find((item) => item.id === floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }
    const building = buildings.find((item) => item.id === floor.buildingId)
    const access = building
      ? canManageFloor(request, floor)
      : { response: apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404) }
    if ('response' in access) {
      return access.response
    }

    const payload = (await request.json()) as FloorGeometry
    const geometry: FloorGeometry = {
      ...payload,
      floorId,
      rooms: payload.rooms.map((room) => ({
        ...room,
        floorId,
        polygon: room.polygon.map((point) => ({
          x: clampPercent(point.x),
          y: clampPercent(point.y),
        })),
      })),
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    }

    upsertGeometry(geometry)
    return HttpResponse.json(geometry)
  }),

  http.get(endpoint('/floors/:floorId/stores'), async ({ params, request }) => {
    await delay(160)
    const floor = floors.find((item) => item.id === params.floorId)
    if (!floor) {
      return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    }
    const forbidden = canReadPublishedFloor(request, floor)
    if (forbidden) {
      return forbidden
    }
    const floorStores = stores.filter((store) => store.floorId === params.floorId)
    return HttpResponse.json(floorStores)
  }),

  http.get(endpoint('/buildings/:buildingId/stores'), async ({ params, request }) => {
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const forbidden = canReadBuilding(request, building)
    if (forbidden) return forbidden
    return HttpResponse.json(stores.filter((store) => store.buildingId === building.id))
  }),

  http.get(endpoint('/floors/:floorId/pois'), async ({ params, request }) => {
    const floor = floors.find((item) => item.id === params.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const forbidden = canReadPublishedFloor(request, floor)
    if (forbidden) return forbidden
    return HttpResponse.json(getFloorPois(floor.id))
  }),

  http.get(endpoint('/owners/:ownerId/stores'), async ({ params, request }) => {
    await delay(160)
    const access = requireAccess(request, ['store_owner', 'building_owner', 'building_manager'])
    if ('response' in access) {
      return access.response
    }
    if (access.auth.user.role === 'store_owner' && access.auth.user.id !== params.ownerId) {
      return apiError('FORBIDDEN', 'Bạn chỉ được xem gian hàng của mình.', 403)
    }
    const ownerStores = stores.filter((store) => store.ownerUserId === params.ownerId)
    return HttpResponse.json(ownerStores)
  }),

  http.get(endpoint('/stores/mine'), async ({ request }) => {
    const access = requireAccess(request, ['store_owner'])
    if ('response' in access) return access.response
    return HttpResponse.json(stores.filter((store) => store.ownerUserId === access.auth.user.id))
  }),

  http.post(endpoint('/stores'), async ({ request }) => {
    await delay(220)
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) {
      return access.response
    }
    const inactiveResponse = tenantWriteAccess(access.auth)
    if (inactiveResponse) {
      return inactiveResponse
    }
    const contentType = request.headers.get('content-type') ?? ''
    const payload =
      contentType.includes('multipart/form-data')
        ? null
        : ((await request.json()) as CreateStorePayload)
    const formData = payload ? null : await request.formData()
    const ownerUserId = (payload?.ownerUserId ?? formString(formData, 'ownerUserId')) || null
    const buildingId =
      payload?.buildingId ?? formString(formData, 'buildingId')
    const floorId = payload?.floorId ?? formString(formData, 'floorId')
    const roomId = (payload?.roomId ?? formString(formData, 'roomId')) || null
    const nodeId = (payload?.nodeId ?? formString(formData, 'nodeId')) || null
    const floor = floors.find((item) => item.id === floorId)

    if (!floor) {
      return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    }

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (!building || building.tenantId !== access.auth.user.tenantId) {
      return apiError('FORBIDDEN', 'Tầng không thuộc doanh nghiệp của bạn.', 403)
    }

    if (floor.buildingId !== buildingId) {
      return HttpResponse.json(
        { message: 'Floor does not belong to selected building' },
        { status: 400 },
      )
    }
    const floorAccess = canManageFloor(request, floor)
    if ('response' in floorAccess) return floorAccess.response
    if (ownerUserId) {
      const owner = users.find((user) => user.id === ownerUserId)
      if (!owner || owner.role !== 'store_owner' || owner.tenantId !== access.auth.user.tenantId) return apiError('FORBIDDEN', 'Chủ gian hàng phải thuộc cùng doanh nghiệp.', 403)
    }

    const status = payload?.status ?? normalizeStoreStatus(formData?.get('status') ?? null)
    const logoFile = formData?.get('logo')
    const galleryFiles =
      formData
        ?.getAll('galleryImages')
        .filter((item): item is File => item instanceof File) ?? []
    const uploadedGalleryUrls = await Promise.all(
      galleryFiles.map((file) => fileToDataUrl(file)),
    )

    const store: Store = {
      id: `store-${crypto.randomUUID()}`,
      ownerUserId,
      createdByUserId: access.auth.user.id,
      buildingId,
      floorId,
      roomId,
      nodeId,
      name: payload?.name ?? formString(formData, 'name', 'Untitled store'),
      logoUrl: logoFile instanceof File ? await fileToDataUrl(logoFile) : null,
      galleryImageUrls: uploadedGalleryUrls.slice(0, 5),
      description: payload?.description ?? formString(formData, 'description'),
      category: payload?.category ?? formString(formData, 'category', 'Dịch vụ'),
      openingHours: payload?.openingHours ?? formString(formData, 'openingHours'),
      status: status ?? 'inactive',
    }

    stores.push(store)
    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)

    return HttpResponse.json(store, { status: 201 })
  }),

  http.get(endpoint('/floors/:floorId/nodes'), async ({ params, request }) => {
    await delay(160)
    const floor = floors.find((item) => item.id === params.floorId)
    if (!floor) {
      return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    }
    const forbidden = canReadPublishedFloor(request, floor)
    if (forbidden) {
      return forbidden
    }
    const floorNodes = nodes.filter((node) => node.floorId === params.floorId)
    return HttpResponse.json(floorNodes)
  }),

  http.get(endpoint('/floors/:floorId/edges'), async ({ params, request }) => {
    await delay(160)
    const floor = floors.find((item) => item.id === params.floorId)
    if (!floor) {
      return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    }
    const forbidden = canReadPublishedFloor(request, floor)
    if (forbidden) {
      return forbidden
    }
    const floorEdges = edges.filter((edge) => edge.floorId === params.floorId)
    return HttpResponse.json(floorEdges)
  }),

  http.post(endpoint('/floors/:floorId/navigation-graph'), async ({ params, request }) => {
    await delay(260)
    const floorId = String(params.floorId)
    const floor = floors.find((item) => item.id === floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }
    const access = canManageFloor(request, floor)
    if ('response' in access) {
      return access.response
    }

    const geometry = floorGeometry.find((item) => item.floorId === floorId)
    const generatedGraph = generateNavigationGraphFromGeometry(
      floorId,
      geometry,
    )

    for (let index = edges.length - 1; index >= 0; index -= 1) {
      if (edges[index].floorId === floorId) {
        edges.splice(index, 1)
      }
    }

    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      if (nodes[index].floorId === floorId) {
        nodes.splice(index, 1)
      }
    }

    nodes.push(...generatedGraph.nodes)
    edges.push(
      ...generatedGraph.edges.map((edge) => ({
        ...edge,
        accessible: edge.accessible ?? true,
      })),
    )
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)
    saveToStorage(MOCK_STORAGE_KEYS.edges, edges)

    return HttpResponse.json(generatedGraph, { status: 201 })
  }),

  http.post(endpoint('/floors/:floorId/nodes'), async ({ params, request }) => {
    await delay(140)
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }
    const access = canManageFloor(request, floor)
    if ('response' in access) {
      return access.response
    }

    const payload = (await request.json()) as CreateNodePayload
    const node = {
      id: `node-${crypto.randomUUID()}`,
      floorId: floor.id,
      x: clampPercent(payload.x),
      y: clampPercent(payload.y),
      isElevatorLink: payload.isElevatorLink ?? false,
      elevatorGroupId: payload.isElevatorLink
        ? payload.elevatorGroupId ?? null
        : null,
      poiId: payload.poiId ?? null,
      label: payload.label?.trim() || `Điểm ${nodes.length + 1}`,
    }

    nodes.push(node)
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)
    return HttpResponse.json(node, { status: 201 })
  }),

  http.patch(endpoint('/nodes/:nodeId'), async ({ params, request }) => {
    await delay(140)
    const node = nodes.find((item) => item.id === params.nodeId)

    if (!node) {
      return HttpResponse.json({ message: 'Node not found' }, { status: 404 })
    }
    const floor = floors.find((item) => item.id === node.floorId)
    if (!floor) {
      return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    }
    const access = canManageFloor(request, floor)
    if ('response' in access) {
      return access.response
    }

    const payload = (await request.json()) as UpdateNodePayload

    if (payload.x !== undefined) {
      node.x = payload.x
    }

    if (payload.y !== undefined) {
      node.y = payload.y
    }

    if (payload.isElevatorLink !== undefined) {
      node.isElevatorLink = payload.isElevatorLink
      if (!payload.isElevatorLink) {
        node.elevatorGroupId = null
      }
    }

    if (payload.elevatorGroupId !== undefined) {
      if (!node.isElevatorLink && payload.elevatorGroupId) {
        return HttpResponse.json(
          { message: 'Only elevator link nodes can have elevatorGroupId' },
          { status: 400 },
        )
      }

      node.elevatorGroupId = payload.elevatorGroupId
    }

    if (payload.poiId !== undefined) {
      node.poiId = payload.poiId
    }

    if (payload.label !== undefined) {
      node.label = payload.label
    }

    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)
    return HttpResponse.json(node)
  }),

  http.delete(endpoint('/nodes/:nodeId'), async ({ params, request }) => {
    const index = nodes.findIndex((item) => item.id === params.nodeId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy node.', 404)
    const floor = floors.find((item) => item.id === nodes[index].floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const access = canManageFloor(request, floor)
    if ('response' in access) return access.response
    nodes.splice(index, 1)
    for (let edgeIndex = edges.length - 1; edgeIndex >= 0; edgeIndex -= 1) if (edges[edgeIndex].fromNodeId === params.nodeId || edges[edgeIndex].toNodeId === params.nodeId) edges.splice(edgeIndex, 1)
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes); saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(endpoint('/edges'), async ({ request }) => {
    await delay(140)
    const payload = (await request.json()) as CreateEdgePayload
    const fromNode = nodes.find((node) => node.id === payload.fromNodeId)
    const toNode = nodes.find((node) => node.id === payload.toNodeId)

    if (!fromNode || !toNode) {
      return HttpResponse.json({ message: 'Node not found' }, { status: 404 })
    }
    const floor = floors.find((item) => item.id === payload.floorId)
    if (!floor) {
      return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    }
    const access = canManageFloor(request, floor)
    if ('response' in access) {
      return access.response
    }

    if (
      fromNode.floorId !== payload.floorId ||
      toNode.floorId !== payload.floorId
    ) {
      return HttpResponse.json(
        { message: 'Edge nodes must belong to selected floor' },
        { status: 400 },
      )
    }

    const hasSameEdge = edges.some(
      (edge) =>
        edge.floorId === payload.floorId &&
        ((edge.fromNodeId === payload.fromNodeId &&
          edge.toNodeId === payload.toNodeId) ||
          (edge.fromNodeId === payload.toNodeId &&
            edge.toNodeId === payload.fromNodeId)),
    )

    if (hasSameEdge) {
      return HttpResponse.json(
        { message: 'Edge already exists' },
        { status: 409 },
      )
    }

    const edge = {
      id: `edge-${crypto.randomUUID()}`,
      floorId: payload.floorId,
      fromNodeId: payload.fromNodeId,
      toNodeId: payload.toNodeId,
      accessible: payload.kind === 'stairs' ? false : payload.accessible ?? true,
      kind: payload.kind ?? 'walk',
    }

    edges.push(edge)
    saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    return HttpResponse.json(edge, { status: 201 })
  }),

  http.patch(endpoint('/edges/:edgeId'), async ({ params, request }) => {
    const edge = edges.find((item) => item.id === params.edgeId)
    if (!edge) return apiError('NOT_FOUND', 'Không tìm thấy cạnh.', 404)
    const floor = floors.find((item) => item.id === edge.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const access = canManageFloor(request, floor)
    if ('response' in access) return access.response
    const payload = (await request.json()) as UpdateEdgePayload
    Object.assign(edge, payload)
    if (edge.kind === 'stairs') edge.accessible = false
    saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    return HttpResponse.json(edge)
  }),

  http.delete(endpoint('/edges/:edgeId'), async ({ params, request }) => {
    const index = edges.findIndex((item) => item.id === params.edgeId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy cạnh.', 404)
    const floor = floors.find((item) => item.id === edges[index].floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const access = canManageFloor(request, floor)
    if ('response' in access) return access.response
    edges.splice(index, 1); saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/stores/:storeId'), async ({ params, request }) => {
    await delay(160)
    const store = stores.find((item) => item.id === params.storeId)

    if (!store) {
      return HttpResponse.json({ message: 'Store not found' }, { status: 404 })
    }
    const access = getAuth(request)
    if (!access) {
      const floor = floors.find((item) => item.id === store.floorId)
      if (!floor) {
        return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
      }
      const forbidden = canReadPublishedFloor(request, floor)
      if (forbidden) {
        return forbidden
      }
    } else if (access.user.role === 'store_owner' && store.ownerUserId !== access.user.id) {
      return apiError('FORBIDDEN', 'Bạn chỉ được xem gian hàng được gán cho mình.', 403)
    } else if (access.user.role === 'admin') {
      return apiError('FORBIDDEN', 'Quản trị viên không truy cập dữ liệu gian hàng tenant.', 403)
    }

    return HttpResponse.json(store)
  }),

  http.patch(endpoint('/stores/:storeId'), async ({ params, request }) => {
    await delay(240)
    const store = stores.find((item) => item.id === params.storeId)

    if (!store) {
      return HttpResponse.json({ message: 'Store not found' }, { status: 404 })
    }
    const access = requireAccess(request, ['store_owner', 'building_owner', 'building_manager'])
    if ('response' in access) {
      return access.response
    }
    if (access.auth.user.role === 'store_owner' && store.ownerUserId !== access.auth.user.id) {
      return apiError('FORBIDDEN', 'Bạn chỉ được chỉnh sửa gian hàng được gán cho mình.', 403)
    }
    if (access.auth.user.role !== 'store_owner') {
      const building = buildings.find((item) => item.id === store.buildingId)
      if (!building || building.tenantId !== access.auth.user.tenantId) {
        return apiError('FORBIDDEN', 'Gian hàng không thuộc doanh nghiệp của bạn.', 403)
      }
      const floor = floors.find((item) => item.id === store.floorId)
      const floorAccess = floor ? canManageFloor(request, floor) : { response: apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404) }
      if ('response' in floorAccess) return floorAccess.response
    }
    const inactiveResponse = tenantWriteAccess(access.auth)
    if (inactiveResponse) {
      return inactiveResponse
    }

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      if (access.auth.user.role === 'store_owner' && ['name', 'category', 'ownerUserId', 'buildingId', 'floorId', 'roomId', 'nodeId'].some((key) => formData.has(key))) {
        return apiError('FORBIDDEN', 'Chủ gian hàng chỉ được cập nhật mô tả, ảnh, giờ mở cửa và trạng thái.', 403)
      }
      const logoFile = formData.get('logo')
      const logoUrl = formData.get('logoUrl')
      const retainedGalleryUrls = parseStringArray(
        formData.get('galleryImageUrls'),
      )
      const galleryFiles = formData
        .getAll('galleryImages')
        .filter((item): item is File => item instanceof File)

      if (typeof formData.get('name') === 'string') {
        store.name = String(formData.get('name'))
      }

      if (typeof formData.get('category') === 'string') {
        store.category = String(formData.get('category'))
      }

      if (typeof formData.get('description') === 'string') {
        store.description = String(formData.get('description'))
      }
      if (typeof formData.get('openingHours') === 'string') store.openingHours = String(formData.get('openingHours'))
      if (typeof formData.get('roomId') === 'string') store.roomId = String(formData.get('roomId')) || null
      if (typeof formData.get('nodeId') === 'string') store.nodeId = String(formData.get('nodeId')) || null

      const status = normalizeStoreStatus(formData.get('status'))
      if (status) {
        store.status = status
      }

      if (logoFile instanceof File) {
        store.logoUrl = await fileToDataUrl(logoFile)
      } else if (typeof logoUrl === 'string') {
        store.logoUrl = logoUrl.trim() ? logoUrl : null
      }

      const uploadedGalleryUrls = await Promise.all(
        galleryFiles.map((file) => fileToDataUrl(file)),
      )
      store.galleryImageUrls = [
        ...retainedGalleryUrls,
        ...uploadedGalleryUrls,
      ].slice(0, 5)
    } else {
      const payload = (await request.json()) as UpdateStorePayload
      if (access.auth.user.role === 'store_owner' && Object.keys(payload).some((key) => ['name', 'category', 'ownerUserId', 'buildingId', 'floorId', 'roomId', 'nodeId'].includes(key))) {
        return apiError('FORBIDDEN', 'Chủ gian hàng chỉ được cập nhật mô tả, ảnh, giờ mở cửa và trạng thái.', 403)
      }
      updateStoreWithPayload(store, payload)
    }

    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)
    return HttpResponse.json(store)
  }),

  http.delete(endpoint('/stores/:storeId'), async ({ params, request }) => {
    const storeIndex = stores.findIndex((item) => item.id === params.storeId)
    if (storeIndex < 0) return apiError('NOT_FOUND', 'Không tìm thấy gian hàng.', 404)
    const access = requireAccess(request, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const store = stores[storeIndex]
    const floor = floors.find((item) => item.id === store.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng của gian hàng.', 404)
    const floorAccess = canManageFloor(request, floor)
    if ('response' in floorAccess) return floorAccess.response
    stores.splice(storeIndex, 1)
    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/stores/:storeId/promotions'), async ({ params, request }) => {
    const store = stores.find((item) => item.id === params.storeId)
    if (!store) return apiError('NOT_FOUND', 'Không tìm thấy gian hàng.', 404)
    const access = getAuth(request)
    if (!access) {
      const now = Date.now()
      return HttpResponse.json(promotions.filter((promotion) => promotion.storeId === store.id && promotion.status === 'published' && new Date(promotion.startDate).getTime() <= now && new Date(promotion.endDate).getTime() >= now))
    }
    if (access.user.role === 'store_owner' && store.ownerUserId !== access.user.id) return apiError('FORBIDDEN', 'Bạn chỉ được xem khuyến mãi của gian hàng được gán.', 403)
    if (access.user.role === 'admin') return apiError('FORBIDDEN', 'Quản trị viên không truy cập dữ liệu tenant.', 403)
    return HttpResponse.json(promotions.filter((promotion) => promotion.storeId === store.id))
  }),

  http.post(endpoint('/stores/:storeId/promotions'), async ({ params, request }) => {
    const store = stores.find((item) => item.id === params.storeId)
    if (!store) return apiError('NOT_FOUND', 'Không tìm thấy gian hàng.', 404)
    const access = requireAccess(request, ['store_owner', 'building_owner', 'building_manager'])
    if ('response' in access) return access.response
    if (access.auth.user.role === 'store_owner' && store.ownerUserId !== access.auth.user.id) return apiError('FORBIDDEN', 'Bạn chỉ được quản lý khuyến mãi của gian hàng được gán.', 403)
    const floor = floors.find((item) => item.id === store.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const floorAccess = access.auth.user.role === 'store_owner' ? access : canManageFloor(request, floor)
    if ('response' in floorAccess) return floorAccess.response
    const payload = (await request.json()) as PromotionPayload
    if (new Date(payload.endDate).getTime() < new Date(payload.startDate).getTime()) return apiError('INVALID_DATE_RANGE', 'Ngày kết thúc không được trước ngày bắt đầu.', 400)
    const promotion: Promotion = { ...payload, id: `promotion-${crypto.randomUUID()}`, storeId: store.id }
    promotions.push(promotion); saveToStorage(MOCK_STORAGE_KEYS.promotions, promotions)
    return HttpResponse.json(promotion, { status: 201 })
  }),

  http.patch(endpoint('/promotions/:promotionId'), async ({ params, request }) => {
    const promotion = promotions.find((item) => item.id === params.promotionId)
    if (!promotion) return apiError('NOT_FOUND', 'Không tìm thấy khuyến mãi.', 404)
    const store = stores.find((item) => item.id === promotion.storeId)
    const access = requireAccess(request, ['store_owner', 'building_owner', 'building_manager'])
    if ('response' in access) return access.response
    if (!store) return apiError('NOT_FOUND', 'Không tìm thấy gian hàng.', 404)
    if (access.auth.user.role === 'store_owner' && store.ownerUserId !== access.auth.user.id) return apiError('FORBIDDEN', 'Bạn không có quyền với khuyến mãi này.', 403)
    if (access.auth.user.role !== 'store_owner') { const floor = floors.find((item) => item.id === store.floorId); const floorAccess = floor ? canManageFloor(request, floor) : { response: apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404) }; if ('response' in floorAccess) return floorAccess.response }
    const payload = (await request.json()) as Partial<PromotionPayload>
    const nextStart = payload.startDate ?? promotion.startDate; const nextEnd = payload.endDate ?? promotion.endDate
    if (new Date(nextEnd).getTime() < new Date(nextStart).getTime()) return apiError('INVALID_DATE_RANGE', 'Ngày kết thúc không được trước ngày bắt đầu.', 400)
    Object.assign(promotion, payload); saveToStorage(MOCK_STORAGE_KEYS.promotions, promotions)
    return HttpResponse.json(promotion)
  }),

  http.delete(endpoint('/promotions/:promotionId'), async ({ params, request }) => {
    const index = promotions.findIndex((item) => item.id === params.promotionId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy khuyến mãi.', 404)
    const access = requireAccess(request, ['store_owner', 'building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const store = stores.find((item) => item.id === promotions[index].storeId)
    if (!store) return apiError('NOT_FOUND', 'Không tìm thấy gian hàng.', 404)
    if (access.auth.user.role === 'store_owner' && store.ownerUserId !== access.auth.user.id) return apiError('FORBIDDEN', 'Bạn không có quyền với khuyến mãi này.', 403)
    promotions.splice(index, 1); saveToStorage(MOCK_STORAGE_KEYS.promotions, promotions)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/floors/:floorId/maintenance-zones'), async ({ params, request }) => {
    const floor = floors.find((item) => item.id === params.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const forbidden = canReadPublishedFloor(request, floor)
    if (forbidden) return forbidden
    return HttpResponse.json(maintenanceZones.filter((zone) => zone.floorId === floor.id))
  }),

  http.post(endpoint('/floors/:floorId/maintenance-zones'), async ({ params, request }) => {
    const floor = floors.find((item) => item.id === params.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const access = canManageFloor(request, floor)
    if ('response' in access) return access.response
    const payload = (await request.json()) as Omit<MaintenanceZone, 'id' | 'floorId' | 'createdAt'>
    const zone: MaintenanceZone = { ...payload, id: `maintenance-${crypto.randomUUID()}`, floorId: floor.id, createdAt: new Date().toISOString(), rect: { x: Math.min(100, Math.max(0, payload.rect.x)), y: Math.min(100, Math.max(0, payload.rect.y)), w: Math.min(100, Math.max(0, payload.rect.w)), h: Math.min(100, Math.max(0, payload.rect.h)) } }
    maintenanceZones.push(zone); saveToStorage(MOCK_STORAGE_KEYS.maintenanceZones, maintenanceZones)
    return HttpResponse.json(zone, { status: 201 })
  }),

  http.patch(endpoint('/maintenance-zones/:zoneId'), async ({ params, request }) => {
    const zone = maintenanceZones.find((item) => item.id === params.zoneId)
    if (!zone) return apiError('NOT_FOUND', 'Không tìm thấy vùng bảo trì.', 404)
    const floor = floors.find((item) => item.id === zone.floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const access = canManageFloor(request, floor)
    if ('response' in access) return access.response
    Object.assign(zone, (await request.json()) as Partial<MaintenanceZone>)
    saveToStorage(MOCK_STORAGE_KEYS.maintenanceZones, maintenanceZones)
    return HttpResponse.json(zone)
  }),

  http.delete(endpoint('/maintenance-zones/:zoneId'), async ({ params, request }) => {
    const index = maintenanceZones.findIndex((item) => item.id === params.zoneId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy vùng bảo trì.', 404)
    const floor = floors.find((item) => item.id === maintenanceZones[index].floorId)
    if (!floor) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const access = canManageFloor(request, floor)
    if ('response' in access) return access.response
    maintenanceZones.splice(index, 1); saveToStorage(MOCK_STORAGE_KEYS.maintenanceZones, maintenanceZones)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/buildings/:buildingId/qr-codes'), async ({ params, request }) => {
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const forbidden = canReadBuilding(request, building)
    if (forbidden) return forbidden
    return HttpResponse.json(qrCodes.filter((code) => code.buildingId === building.id))
  }),

  http.post(endpoint('/buildings/:buildingId/qr-codes'), async ({ params, request }) => {
    const building = buildings.find((item) => item.id === params.buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const access = canManageTenantResource(request, building.tenantId, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const payload = (await request.json()) as Omit<QrCode, 'id' | 'buildingId' | 'code'>
    const floor = floors.find((item) => item.id === payload.floorId)
    if (!floor || floor.buildingId !== building.id) return apiError('NOT_FOUND', 'Không tìm thấy tầng.', 404)
    const floorAccess = canManageFloor(request, floor)
    if ('response' in floorAccess) return floorAccess.response
    const qr: QrCode = { ...payload, id: `qr-${crypto.randomUUID()}`, buildingId: building.id, code: `${building.id}-${crypto.randomUUID()}` }
    qrCodes.push(qr); saveToStorage(MOCK_STORAGE_KEYS.qrCodes, qrCodes)
    return HttpResponse.json(qr, { status: 201 })
  }),

  http.delete(endpoint('/qr-codes/:qrId'), async ({ params, request }) => {
    const index = qrCodes.findIndex((item) => item.id === params.qrId)
    if (index < 0) return apiError('NOT_FOUND', 'Không tìm thấy mã QR.', 404)
    const building = buildings.find((item) => item.id === qrCodes[index].buildingId)
    if (!building) return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    const access = canManageTenantResource(request, building.tenantId, ['building_owner', 'building_manager'])
    if ('response' in access) return access.response
    const floor = floors.find((item) => item.id === qrCodes[index].floorId)
    if (floor) { const floorAccess = canManageFloor(request, floor); if ('response' in floorAccess) return floorAccess.response }
    qrCodes.splice(index, 1); saveToStorage(MOCK_STORAGE_KEYS.qrCodes, qrCodes)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/qr/:code'), async ({ params }) => {
    const qr = qrCodes.find((item) => item.code === params.code)
    return qr ? HttpResponse.json({ buildingId: qr.buildingId, floorId: qr.floorId, nodeId: qr.nodeId, label: qr.label }) : apiError('NOT_FOUND', 'Mã QR không tồn tại.', 404)
  }),

  http.post(endpoint('/floors'), async ({ request }) => {
    await delay(180)
    const payload = (await request.json()) as CreateFloorPayload
    const building = buildings.find((item) => item.id === payload.buildingId)
    if (!building) {
      return apiError('NOT_FOUND', 'Không tìm thấy tòa nhà.', 404)
    }
    const access = canManageTenantResource(request, building.tenantId, ['building_owner'])
    if ('response' in access) {
      return access.response
    }
    const hasSameLevel = floors.some(
      (floor) =>
        floor.buildingId === payload.buildingId && floor.level === payload.level,
    )

    if (hasSameLevel) {
      return HttpResponse.json(
        { message: 'Floor level already exists' },
        { status: 409 },
      )
    }

    const floor = makeFloor(payload)
    floors.push(floor)

    const floorBuilding = buildings.find((item) => item.id === floor.buildingId)
    if (floorBuilding) {
      floorBuilding.floorCount += 1
    }
    const didPersistFloors = saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    const didPersistBuildings = saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)

    if ((!didPersistFloors || !didPersistBuildings) && payload.mapImageUrl) {
      floors.splice(floors.findIndex((item) => item.id === floor.id), 1)
      if (floorBuilding) {
        floorBuilding.floorCount -= 1
      }

      return HttpResponse.json(
        {
          message:
            'Không thể lưu ảnh sơ đồ vào localStorage. Hãy dùng ảnh nhỏ hơn hoặc upload ảnh sau.',
        },
        { status: 413 },
      )
    }

    return HttpResponse.json(floor, { status: 201 })
  }),

  http.patch(endpoint('/floors/:floorId'), async ({ params, request }) => {
    await delay(140)
    const payload = (await request.json()) as UpdateFloorPayload
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }
    const access = canManageFloor(request, floor)
    if ('response' in access) {
      return access.response
    }

    if (access.auth.user.role === 'building_manager' && payload.areaId !== undefined) {
      return apiError('FORBIDDEN', 'Quản lý khu vực không được đổi phân khu vực của tầng.', 403)
    }
    if (payload.level !== undefined) {
      const hasSameLevel = floors.some(
        (item) =>
          item.buildingId === floor.buildingId &&
          item.id !== floor.id &&
          item.level === payload.level,
      )

      if (hasSameLevel) {
        return HttpResponse.json(
          { message: 'Floor level already exists' },
          { status: 409 },
        )
      }
    }

    if (payload.publishStatus === 'published') {
      const missing: string[] = []
      if (!floor.mapImageUrl) missing.push('Ảnh sơ đồ')
      if (nodes.filter((node) => node.floorId === floor.id).length < 2) missing.push('ít nhất 2 node')
      if (edges.filter((edge) => edge.floorId === floor.id).length < 1) missing.push('ít nhất 1 edge')
      if (missing.length > 0) {
        return apiError('PUBLISH_REQUIREMENTS', `Chưa đủ điều kiện xuất bản: ${missing.join(', ')}.`, 400)
      }
    }

    floor.name = payload.name ?? floor.name
    floor.level = payload.level ?? floor.level
    floor.areaId = payload.areaId !== undefined ? payload.areaId : floor.areaId
    floor.publishStatus = payload.publishStatus ?? floor.publishStatus
    floor.mapImageUrl =
      payload.mapImageUrl !== undefined
        ? payload.mapImageUrl
        : payload.planImageUrl !== undefined
          ? payload.planImageUrl
          : floor.mapImageUrl
    floor.mapWidth = payload.mapWidth ?? floor.mapWidth
    floor.mapHeight = payload.mapHeight ?? floor.mapHeight
    floor.nextPoiNumber = payload.nextPoiNumber ?? floor.nextPoiNumber

    const didPersistFloors = saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    if (!didPersistFloors && payload.mapImageUrl !== undefined) {
      return HttpResponse.json(
        {
          message:
            'Không thể lưu ảnh sơ đồ vào localStorage. Hãy dùng ảnh nhỏ hơn hoặc bấm Đặt lại dữ liệu demo.',
        },
        { status: 413 },
      )
    }

    return HttpResponse.json(floor)
  }),

  http.delete(endpoint('/floors/:floorId'), async ({ params, request }) => {
    await delay(140)
    const floorIndex = floors.findIndex((item) => item.id === params.floorId)

    if (floorIndex < 0) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    const floor = floors[floorIndex]
    const access = canManageTenantResource(request, buildings.find((item) => item.id === floor.buildingId)?.tenantId ?? '', ['building_owner'])
    if ('response' in access) {
      return access.response
    }
    const buildingFloorCount = floors.filter(
      (item) => item.buildingId === floor.buildingId,
    ).length

    if (buildingFloorCount <= 1) {
      return HttpResponse.json(
        { message: 'Building must have at least one floor' },
        { status: 400 },
      )
    }

    floors.splice(floorIndex, 1)
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      if (nodes[index].floorId === floor.id) {
        nodes.splice(index, 1)
      }
    }
    for (let index = edges.length - 1; index >= 0; index -= 1) {
      if (edges[index].floorId === floor.id) edges.splice(index, 1)
    }
    for (let index = stores.length - 1; index >= 0; index -= 1) {
      if (stores[index].floorId === floor.id) stores.splice(index, 1)
    }
    for (let index = floorGeometry.length - 1; index >= 0; index -= 1) {
      if (floorGeometry[index].floorId === floor.id) floorGeometry.splice(index, 1)
    }

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (building) {
      building.floorCount = floors.filter(
        (item) => item.buildingId === floor.buildingId,
      ).length
    }

    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)
    saveToStorage(MOCK_STORAGE_KEYS.edges, edges)
    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)
    saveToStorage(MOCK_STORAGE_KEYS.geometry, floorGeometry)

    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(endpoint('/floors/:floorId/pois'), async ({ params, request }) => {
    await delay(140)
    const payload = (await request.json()) as
      | Poi[]
      | { pois: Poi[]; nextPoiNumber?: number }
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json(
        {
          message: `Không tìm thấy tầng ${String(params.floorId)} trong mock storage. Dữ liệu localStorage có thể đã cũ, hãy tải lại trang để MSW đồng bộ lại floor.`,
        },
        { status: 404 },
      )
    }
    const access = canManageFloor(request, floor)
    if ('response' in access) {
      return access.response
    }

    const pois = Array.isArray(payload) ? payload : payload.pois
    floor.pois = pois.map((poi) => ({ ...poi, floorId: floor.id }))
    floor.nextPoiNumber = Math.max(
      floor.nextPoiNumber,
      Array.isArray(payload) ? floor.nextPoiNumber : (payload.nextPoiNumber ?? 1),
      getNextPoiNumber(floor.pois),
    )
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    return HttpResponse.json(floor.pois)
  }),

]

