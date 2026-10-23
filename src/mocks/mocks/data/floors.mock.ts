import type { Floor } from '../../types/floor'
import type { Poi } from '../../types/poi'
import { clampPercent } from '../../utils/canvasCoordinates'
import { loadFromStorage, MOCK_STORAGE_KEYS, saveToStorage } from '../persist'
import {
  buildPlanSvgDataUri,
  initialFloorGeometrySeed,
} from './geometry.mock'

type StoredPoi = Omit<Poi, 'x' | 'y'> &
  Partial<Pick<Poi, 'x' | 'y'>> & {
    xPercent?: number
    yPercent?: number
  }

type StoredFloor = Omit<
  Floor,
  'pois' | 'publishStatus' | 'mapImageUrl' | 'nextPoiNumber' | 'areaId'
> &
  Partial<Pick<Floor, 'publishStatus' | 'mapImageUrl' | 'areaId'>> & {
    planImageUrl?: string | null
    pois?: StoredPoi[]
    nextPoiNumber?: number
  }

function geometryPlan(floorId: string) {
  const geometry = initialFloorGeometrySeed.find((item) => item.floorId === floorId)
  return geometry ? buildPlanSvgDataUri(geometry) : null
}

const areaByBuildingLevel: Record<string, string | null> = {
  'bldg-1:1': 'area-fashion',
  'bldg-1:2': 'area-food',
  'bldg-1:3': 'area-entertainment',
  'bldg-2:5': 'area-office',
  'bldg-3:1': 'area-retail-2',
}

export const mallPlan = geometryPlan('floor-1') ?? ''
const mallLevel2Plan = geometryPlan('floor-2') ?? mallPlan
const mallLevel3Plan = geometryPlan('floor-3') ?? mallPlan

export const officePlan =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#f8fafc"/>
  <rect x="54" y="54" width="1092" height="652" rx="10" fill="#fff" stroke="#1f2937" stroke-width="7"/>
  <path d="M120 130h260v180H120zM430 130h300v180H430zM780 130h300v180H780zM120 405h410v210H120zM585 405h495v210H585z" fill="#fef3c7" stroke="#64748b" stroke-width="5"/>
  <path d="M110 360h980M560 315v90" stroke="#94a3b8" stroke-width="24" stroke-linecap="round"/>
  <rect x="495" y="495" width="80" height="72" fill="#e0e7ff" stroke="#4f46e5" stroke-width="5"/>
  <text x="165" y="235" font-family="Arial" font-size="40" fill="#111827">Ops</text>
  <text x="500" y="235" font-family="Arial" font-size="40" fill="#111827">Studio</text>
  <text x="835" y="235" font-family="Arial" font-size="40" fill="#111827">Labs</text>
  <text x="235" y="525" font-family="Arial" font-size="38" fill="#111827">Meeting</text>
  <text x="710" y="525" font-family="Arial" font-size="38" fill="#111827">Workspace</text>
</svg>`)

export const initialFloorsSeed: StoredFloor[] = [
  {
    id: 'floor-1',
    buildingId: 'bldg-1',
    name: 'Ground Floor',
    level: 0,
    publishStatus: 'published',
    mapImageUrl: mallPlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [
      {
        id: 'poi-1',
        floorId: 'floor-1',
        name: 'Main Entrance',
        type: 'entrance',
        x: 25.33,
        y: 33.68,
      },
      {
        id: 'poi-2',
        floorId: 'floor-1',
        name: 'Atrium Info',
        type: 'service',
        x: 63.33,
        y: 48.03,
      },
      {
        id: 'poi-gf-elevator',
        floorId: 'floor-1',
        name: 'Elevator A',
        type: 'elevator',
        x: 68,
        y: 43,
      },
      {
        id: 'poi-gf-toilet',
        floorId: 'floor-1',
        name: 'Ground Toilet',
        type: 'toilet',
        x: 36,
        y: 73,
      },
      {
        id: 'poi-gf-exit',
        floorId: 'floor-1',
        name: 'Emergency Exit',
        type: 'exit',
        x: 91,
        y: 50,
      },
      {
        id: 'poi-gf-lumi',
        floorId: 'floor-1',
        name: 'Lumi Fashion',
        type: 'store',
        x: 23,
        y: 22,
      },
    ],
  },
  {
    id: 'floor-2',
    buildingId: 'bldg-1',
    name: 'Level 2',
    level: 2,
    publishStatus: 'published',
    mapImageUrl: mallLevel2Plan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [
      {
        id: 'poi-l2-elevator',
        floorId: 'floor-2',
        name: 'Elevator A',
        type: 'elevator',
        x: 68,
        y: 43,
      },
      {
        id: 'poi-l2-green',
        floorId: 'floor-2',
        name: 'Green Home',
        type: 'store',
        x: 23,
        y: 23,
      },
      {
        id: 'poi-l2-toilet',
        floorId: 'floor-2',
        name: 'Level 2 Toilet',
        type: 'toilet',
        x: 35,
        y: 73,
      },
    ],
  },
  {
    id: 'floor-3',
    buildingId: 'bldg-1',
    name: 'Level 3',
    level: 3,
    publishStatus: 'published',
    mapImageUrl: mallLevel3Plan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [
      {
        id: 'poi-l3-elevator',
        floorId: 'floor-3',
        name: 'Elevator A',
        type: 'elevator',
        x: 68,
        y: 43,
      },
      {
        id: 'poi-l3-cinema',
        floorId: 'floor-3',
        name: 'Cinema',
        type: 'store',
        x: 23,
        y: 23,
      },
      {
        id: 'poi-l3-food',
        floorId: 'floor-3',
        name: 'Food Hall',
        type: 'store',
        x: 80,
        y: 23,
      },
    ],
  },
  {
    id: 'floor-4',
    buildingId: 'bldg-2',
    name: 'Office Level 5',
    level: 5,
    publishStatus: 'published',
    mapImageUrl: officePlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [
      {
        id: 'poi-3',
        floorId: 'floor-4',
        name: 'Reception',
        type: 'service',
        x: 46.67,
        y: 47.37,
      },
    ],
  },
  {
    id: 'floor-5',
    buildingId: 'bldg-2',
    name: 'Office Level 6',
    level: 6,
    publishStatus: 'draft',
    mapImageUrl: officePlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
  {
    id: 'floor-6',
    buildingId: 'bldg-3',
    name: 'Lobby',
    level: 1,
    publishStatus: 'published',
    mapImageUrl: officePlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
  {
    id: 'floor-7',
    buildingId: 'bldg-3',
    name: 'Workspace',
    level: 2,
    publishStatus: 'published',
    mapImageUrl: officePlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
  {
    id: 'floor-8',
    buildingId: 'bldg-3',
    name: 'Labs',
    level: 3,
    publishStatus: 'draft',
    mapImageUrl: officePlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
  {
    id: 'floor-9',
    buildingId: 'bldg-3',
    name: 'Event Floor',
    level: 4,
    publishStatus: 'draft',
    mapImageUrl: officePlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
  {
    id: 'floor-10',
    buildingId: 'bldg-4',
    name: 'Ground Floor',
    level: 0,
    publishStatus: 'draft',
    mapImageUrl: mallPlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
  {
    id: 'floor-11',
    buildingId: 'bldg-4',
    name: 'Level 2',
    level: 2,
    publishStatus: 'draft',
    mapImageUrl: mallPlan,
    mapWidth: 1200,
    mapHeight: 760,
    nextPoiNumber: 1,
    pois: [],
  },
]

const seedFloorByBuildingLevel = new Map(
  initialFloorsSeed.map((floor) => [
    `${floor.buildingId}:${floor.level}`,
    floor,
  ]),
)

function normalizePoi(poi: StoredPoi): Poi {
  return {
    ...poi,
    x: clampPercent(poi.x ?? poi.xPercent ?? 0),
    y: clampPercent(poi.y ?? poi.yPercent ?? 0),
  }
}

function normalizeMapImageUrl(url: string | null | undefined) {
  const normalizedUrl = url?.trim()
  return normalizedUrl ? normalizedUrl : null
}

function getNextPoiNumber(pois: Poi[]) {
  const maxPoiNumber = pois.reduce((max, poi) => {
    const match = /^POI\s+(\d+)$/.exec(poi.name.trim())
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  return maxPoiNumber + 1
}

function normalizeFloor(floor: StoredFloor): Floor {
  const seedFloor = seedFloorByBuildingLevel.get(
    `${floor.buildingId}:${floor.level}`,
  )
  const id = seedFloor?.id ?? floor.id
  const pois = floor.pois?.map(normalizePoi).map((poi) => ({
    ...poi,
    floorId: id,
  })) ?? []
  const nextPoiNumberFromNames = getNextPoiNumber(pois)
  const nextPoiNumber = floor.nextPoiNumber
  const storedNextPoiNumber =
    Number.isFinite(nextPoiNumber) && nextPoiNumber !== undefined && nextPoiNumber > 0
      ? Math.floor(nextPoiNumber)
      : nextPoiNumberFromNames

  return {
    ...floor,
    areaId: floor.areaId ?? areaByBuildingLevel[`${floor.buildingId}:${floor.level}`] ?? null,
    id,
    publishStatus: floor.publishStatus ?? 'draft',
    mapImageUrl: normalizeMapImageUrl(
      floor.mapImageUrl ?? floor.planImageUrl,
    ),
    mapWidth: floor.mapWidth ?? 1200,
    mapHeight: floor.mapHeight ?? 760,
    pois,
    nextPoiNumber: Math.max(storedNextPoiNumber, nextPoiNumberFromNames),
  }
}

function mergeDuplicateFloors(normalizedFloors: Floor[]) {
  const floorById = new Map<string, Floor>()

  for (const floor of normalizedFloors) {
    const existingFloor = floorById.get(floor.id)
    if (!existingFloor) {
      floorById.set(floor.id, floor)
      continue
    }

    const poiById = new Map(existingFloor.pois.map((poi) => [poi.id, poi]))
    for (const poi of floor.pois) {
      poiById.set(poi.id, poi)
    }

    existingFloor.pois = [...poiById.values()]
    existingFloor.nextPoiNumber = Math.max(
      existingFloor.nextPoiNumber,
      floor.nextPoiNumber,
      getNextPoiNumber(existingFloor.pois),
    )
  }

  return [...floorById.values()]
}

export const floors = mergeDuplicateFloors(loadFromStorage<StoredFloor[]>(
  MOCK_STORAGE_KEYS.floors,
  initialFloorsSeed,
).map(normalizeFloor))

saveToStorage(MOCK_STORAGE_KEYS.floors, floors)

export function fallbackMap() {
  return mallPlan
}

export function getFloorPois(floorId: string): Poi[] {
  return floors.find((floor) => floor.id === floorId)?.pois ?? []
}

