import { delay, http, HttpResponse, passthrough } from 'msw'
import { buildings } from './data/buildings.mock'
import { fallbackMap, floors } from './data/floors.mock'
import { MOCK_STORAGE_KEYS, saveToStorage } from './persist'
import type { Building } from '../types/building'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import type { Poi } from '../types/poi'

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

async function planImageToUrl(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return `data:${file.type};base64,${btoa(binary)}`
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
    const fileUrl = file instanceof File ? await planImageToUrl(file) : fallbackMap()
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

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (building) {
      building.floorCount = floors.filter(
        (item) => item.buildingId === floor.buildingId,
      ).length
    }

    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)

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

