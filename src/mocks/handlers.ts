import { delay, http, HttpResponse, passthrough } from 'msw'
import { buildings } from './data/buildings.mock'
import { fallbackMap, floors } from './data/floors.mock'
import { nodes } from './data/nodes.mock'
import { stores } from './data/stores.mock'
import { MOCK_STORAGE_KEYS, saveToStorage } from './persist'
import type { Building } from '../types/building'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import type { UpdateNodePayload } from '../types/node'
import type { Poi } from '../types/poi'
import type { Store, UpdateStorePayload } from '../types/store'

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
    pois: [],
  }
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

function updateStoreWithPayload(store: Store, payload: UpdateStorePayload) {
  store.name = payload.name ?? store.name
  store.category = payload.category ?? store.category
  store.description = payload.description ?? store.description
  store.status = payload.status ?? store.status
  store.logoUrl = payload.logoUrl !== undefined ? payload.logoUrl : store.logoUrl
  store.galleryImageUrls =
    payload.galleryImageUrls?.slice(0, 5) ?? store.galleryImageUrls
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

  http.get(endpoint('/floors/:floorId/stores'), async ({ params }) => {
    await delay(160)
    const floorStores = stores.filter((store) => store.floorId === params.floorId)
    return HttpResponse.json(floorStores)
  }),

  http.get(endpoint('/floors/:floorId/nodes'), async ({ params }) => {
    await delay(160)
    const floorNodes = nodes.filter((node) => node.floorId === params.floorId)
    return HttpResponse.json(floorNodes)
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

    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
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
    const payload = (await request.json()) as Poi[]
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    floor.pois = payload
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    return HttpResponse.json(floor.pois)
  }),

  http.get('*', ({ request }) => {
    const url = new URL(request.url)
    const isAppRouteImageRequest =
      url.origin === window.location.origin &&
      request.destination === 'image' &&
      (url.pathname === '/manager' || url.pathname.startsWith('/owner/'))

    if (isAppRouteImageRequest) {
      return new HttpResponse(null, { status: 204 })
    }

    return passthrough()
  }),
]

