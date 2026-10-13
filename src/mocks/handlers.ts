import { delay, http, HttpResponse } from 'msw'
import { buildings } from './data/buildings.mock'
import { edges } from './data/edges.mock'
import { fallbackMap, floors } from './data/floors.mock'
import { floorGeometry } from './data/geometry.mock'
import { nodes } from './data/nodes.mock'
import { stores } from './data/stores.mock'
import { MOCK_STORAGE_KEYS, saveToStorage } from './persist'
import { buildRoute, getDestinations } from './routeEngine'
import type { Building } from '../types/building'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import type { UpdateNodePayload } from '../types/node'
import type { Poi } from '../types/poi'
import type {
  CreateStorePayload,
  Store,
  UpdateStorePayload,
} from '../types/store'
import type { FloorGeometry, Point, Room } from '../types/geometry'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function endpoint(path: string) {
  return `${API_BASE}${path}`
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

function updateStoreWithPayload(store: Store, payload: UpdateStorePayload) {
  store.name = payload.name ?? store.name
  store.category = payload.category ?? store.category
  store.description = payload.description ?? store.description
  store.status = payload.status ?? store.status
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

export const handlers = [
  http.get(endpoint('/buildings'), async () => {
    await delay(250)
    return HttpResponse.json(buildings)
  }),

  http.post(endpoint('/buildings'), async ({ request }) => {
    await delay(350)
    const formData = await request.formData()
    const file = formData.get('planImage')
    const fileUrl = file instanceof File ? await fileToDataUrl(file) : fallbackMap()
    const building: Building = {
      id: `bldg-${crypto.randomUUID()}`,
      name: String(formData.get('name') ?? 'Untitled building'),
      address: String(formData.get('address') ?? ''),
      status: 'draft',
      floorCount: 1,
      createdAt: new Date().toISOString(),
      planImageUrl: fileUrl,
    }

    buildings.unshift(building)
    floors.push(
      makeFloor({
        buildingId: building.id,
        name: 'Ground Floor',
        level: 0,
        mapImageUrl: fileUrl,
      }),
    )
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)

    return HttpResponse.json(building, { status: 201 })
  }),

  http.get(endpoint('/buildings/:buildingId/floors'), async ({ params }) => {
    await delay(220)
    const buildingFloors = floors.filter(
      (floor) => floor.buildingId === params.buildingId,
    )
    return HttpResponse.json(buildingFloors)
  }),

  http.get(endpoint('/buildings/:buildingId/destinations'), async ({ params }) => {
    await delay(160)
    return HttpResponse.json(
      getDestinations(
        { floors, geometries: floorGeometry, nodes, edges },
        String(params.buildingId),
      ),
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

    const route = buildRoute(
      { floors, geometries: floorGeometry, nodes, edges },
      buildingId,
      fromNodeId,
      toNodeId,
    )

    if (!route) {
      return HttpResponse.json(
        { message: 'Không tìm thấy đường đi' },
        { status: 404 },
      )
    }

    return HttpResponse.json(route)
  }),

  http.get(endpoint('/floors/:floorId/geometry'), async ({ params }) => {
    await delay(140)
    const geometry = floorGeometry.find((item) => item.floorId === params.floorId)

    if (!geometry) {
      return HttpResponse.json(
        { message: 'Floor geometry not found' },
        { status: 404 },
      )
    }

    return HttpResponse.json(geometry)
  }),

  http.post(endpoint('/floors/:floorId/recognize'), async ({ params }) => {
    await delay(1500 + Math.round(Math.random() * 500))
    const floorId = String(params.floorId)
    const floor = floors.find((item) => item.id === floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
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

  http.get(endpoint('/floors/:floorId/stores'), async ({ params }) => {
    await delay(160)
    const floorStores = stores.filter((store) => store.floorId === params.floorId)
    return HttpResponse.json(floorStores)
  }),

  http.get(endpoint('/owners/:ownerId/stores'), async ({ params }) => {
    await delay(160)
    const ownerStores = stores.filter((store) => store.ownerId === params.ownerId)
    return HttpResponse.json(ownerStores)
  }),

  http.post(endpoint('/stores'), async ({ request }) => {
    await delay(220)
    const contentType = request.headers.get('content-type') ?? ''
    const payload =
      contentType.includes('multipart/form-data')
        ? null
        : ((await request.json()) as CreateStorePayload)
    const formData = payload ? null : await request.formData()
    const ownerId = payload?.ownerId ?? formString(formData, 'ownerId')
    const buildingId =
      payload?.buildingId ?? formString(formData, 'buildingId')
    const floorId = payload?.floorId ?? formString(formData, 'floorId')
    const floor = floors.find((item) => item.id === floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    if (floor.buildingId !== buildingId) {
      return HttpResponse.json(
        { message: 'Floor does not belong to selected building' },
        { status: 400 },
      )
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
      ownerId,
      buildingId,
      floorId,
      name: payload?.name ?? formString(formData, 'name', 'Untitled store'),
      logoUrl: logoFile instanceof File ? await fileToDataUrl(logoFile) : null,
      galleryImageUrls: uploadedGalleryUrls.slice(0, 5),
      description: payload?.description ?? formString(formData, 'description'),
      category: payload?.category ?? formString(formData, 'category', 'Dịch vụ'),
      status: status ?? 'inactive',
    }

    stores.push(store)
    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)

    return HttpResponse.json(store, { status: 201 })
  }),

  http.get(endpoint('/floors/:floorId/nodes'), async ({ params }) => {
    await delay(160)
    const floorNodes = nodes.filter((node) => node.floorId === params.floorId)
    return HttpResponse.json(floorNodes)
  }),

  http.get(endpoint('/floors/:floorId/edges'), async ({ params }) => {
    await delay(160)
    const floorEdges = edges.filter((edge) => edge.floorId === params.floorId)
    return HttpResponse.json(floorEdges)
  }),

  http.patch(endpoint('/nodes/:nodeId'), async ({ params, request }) => {
    await delay(140)
    const node = nodes.find((item) => item.id === params.nodeId)

    if (!node) {
      return HttpResponse.json({ message: 'Node not found' }, { status: 404 })
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

  http.get(endpoint('/stores/:storeId'), async ({ params }) => {
    await delay(160)
    const store = stores.find((item) => item.id === params.storeId)

    if (!store) {
      return HttpResponse.json({ message: 'Store not found' }, { status: 404 })
    }

    return HttpResponse.json(store)
  }),

  http.patch(endpoint('/stores/:storeId'), async ({ params, request }) => {
    await delay(240)
    const store = stores.find((item) => item.id === params.storeId)

    if (!store) {
      return HttpResponse.json({ message: 'Store not found' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
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
      updateStoreWithPayload(store, payload)
    }

    saveToStorage(MOCK_STORAGE_KEYS.stores, stores)
    return HttpResponse.json(store)
  }),

  http.post(endpoint('/floors'), async ({ request }) => {
    await delay(180)
    const payload = (await request.json()) as CreateFloorPayload
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

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (building) {
      building.floorCount += 1
    }
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)

    return HttpResponse.json(floor, { status: 201 })
  }),

  http.patch(endpoint('/floors/:floorId'), async ({ params, request }) => {
    await delay(140)
    const payload = (await request.json()) as UpdateFloorPayload
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
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

    floor.name = payload.name ?? floor.name
    floor.level = payload.level ?? floor.level
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

  http.delete(endpoint('/floors/:floorId'), async ({ params }) => {
    await delay(140)
    const floorIndex = floors.findIndex((item) => item.id === params.floorId)

    if (floorIndex < 0) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    const floor = floors[floorIndex]
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

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (building) {
      building.floorCount = floors.filter(
        (item) => item.buildingId === floor.buildingId,
      ).length
    }

    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    saveToStorage(MOCK_STORAGE_KEYS.nodes, nodes)

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

