import { delay, http, HttpResponse } from 'msw'
import { buildings } from './data/buildings.mock'
import { fallbackMap, floors } from './data/floors.mock'
import { MOCK_STORAGE_KEYS, saveToStorage } from './persist'
import type { Building } from '../types/building'
import type { CreateFloorPayload, Floor } from '../types/floor'
import type { Poi } from '../types/poi'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function endpoint(path: string) {
  return `${API_BASE}${path}`
}

function makeFloor(payload: CreateFloorPayload): Floor {
  return {
    id: `floor-${crypto.randomUUID()}`,
    buildingId: payload.buildingId,
    name: payload.name,
    level: payload.level,
    publishStatus: payload.publishStatus ?? 'draft',
    mapImageUrl: payload.mapImageUrl ?? fallbackMap(),
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
]

