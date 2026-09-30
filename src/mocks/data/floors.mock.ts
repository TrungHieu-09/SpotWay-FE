import type { Floor } from '../../types/floor'
import type { Poi } from '../../types/poi'
import { clampPercent } from '../../utils/canvasCoordinates'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'

type StoredPoi = Omit<Poi, 'x' | 'y'> &
  Partial<Pick<Poi, 'x' | 'y'>> & {
    xPercent?: number
    yPercent?: number
  }

type StoredFloor = Omit<Floor, 'pois' | 'publishStatus' | 'mapImageUrl'> &
  Partial<Pick<Floor, 'publishStatus' | 'mapImageUrl'>> & {
    planImageUrl?: string | null
    pois?: StoredPoi[]
  }

export const mallPlan =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#f8fafc"/>
  <rect x="44" y="44" width="1112" height="672" rx="12" fill="#ffffff" stroke="#334155" stroke-width="8"/>
  <path d="M150 130H520V330H150zM590 130h460v170H590zM150 400h285v215H150zM505 390h545v225H505z" fill="#e0f2fe" stroke="#64748b" stroke-width="5"/>
  <path d="M520 235h70M435 505h70M760 300v90" stroke="#0f172a" stroke-width="28" stroke-linecap="round"/>
  <rect x="650" y="455" width="170" height="105" fill="#dcfce7" stroke="#64748b" stroke-width="5"/>
  <circle cx="304" cy="256" r="44" fill="#fee2e2" stroke="#ef4444" stroke-width="5"/>
  <text x="176" y="190" font-family="Arial" font-size="44" fill="#0f172a">Retail A</text>
  <text x="628" y="205" font-family="Arial" font-size="44" fill="#0f172a">Atrium</text>
  <text x="188" y="505" font-family="Arial" font-size="42" fill="#0f172a">Cafe</text>
  <text x="680" y="520" font-family="Arial" font-size="34" fill="#166534">Lobby</text>
  <path d="M92 365h1015" stroke="#94a3b8" stroke-width="22" stroke-linecap="round"/>
</svg>`)

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

export const initialFloorsSeed: Floor[] = [
  {
    id: 'floor-1',
    buildingId: 'bldg-1',
    name: 'Ground Floor',
    level: 0,
    publishStatus: 'published',
    mapImageUrl: mallPlan,
    mapWidth: 1200,
    mapHeight: 760,
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
    ],
  },
  {
    id: 'floor-2',
    buildingId: 'bldg-1',
    name: 'Level 2',
    level: 2,
    publishStatus: 'draft',
    mapImageUrl: null,
    mapWidth: 1200,
    mapHeight: 760,
    pois: [],
  },
  {
    id: 'floor-3',
    buildingId: 'bldg-1',
    name: 'Level 3',
    level: 3,
    publishStatus: 'draft',
    mapImageUrl: null,
    mapWidth: 1200,
    mapHeight: 760,
    pois: [],
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
    pois: [],
  },
]

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

function normalizeFloor(floor: StoredFloor): Floor {
  return {
    ...floor,
    publishStatus: floor.publishStatus ?? 'draft',
    mapImageUrl: normalizeMapImageUrl(
      floor.mapImageUrl ?? floor.planImageUrl,
    ),
    mapWidth: floor.mapWidth ?? 1200,
    mapHeight: floor.mapHeight ?? 760,
    pois: floor.pois?.map(normalizePoi) ?? [],
  }
}

export const floors = loadFromStorage<StoredFloor[]>(
  MOCK_STORAGE_KEYS.floors,
  initialFloorsSeed,
).map(normalizeFloor)

export function fallbackMap() {
  return mallPlan
}

export function getFloorPois(floorId: string): Poi[] {
  return floors.find((floor) => floor.id === floorId)?.pois ?? []
}

