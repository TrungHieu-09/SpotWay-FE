import type {
  FloorGeometry,
  Point,
  Room,
  RoomType,
} from '../../types/geometry'
import { loadFromStorage, MOCK_STORAGE_KEYS, saveToStorage } from '../persist'

const SVG_WIDTH = 1200
const SVG_HEIGHT = 760

function p(x: number, y: number): Point {
  return { x, y }
}

function rect(
  floorId: string,
  id: string,
  name: string,
  type: RoomType,
  x: number,
  y: number,
  width: number,
  height: number,
  storeId?: string,
): Room {
  return {
    id,
    floorId,
    name,
    type,
    storeId: storeId ?? null,
    polygon: [
      p(x, y),
      p(x + width, y),
      p(x + width, y + height),
      p(x, y + height),
    ],
  }
}

const roomFillByType: Record<RoomType, string> = {
  store: '#dbeafe',
  corridor: '#f8fafc',
  atrium: '#fef3c7',
  office: '#e0f2fe',
  toilet: '#ede9fe',
  service: '#dcfce7',
  other: '#f1f5f9',
}

const roomStrokeByType: Record<RoomType, string> = {
  store: '#2563eb',
  corridor: '#94a3b8',
  atrium: '#f59e0b',
  office: '#0284c7',
  toilet: '#7c3aed',
  service: '#16a34a',
  other: '#64748b',
}

export const initialFloorGeometrySeed: FloorGeometry[] = [
  {
    floorId: 'floor-1',
    status: 'confirmed',
    updatedAt: '2026-10-12T00:00:00.000Z',
    wallHeight: 3.4,
    realWidthM: 60,
    realHeightM: 38,
    rooms: [
      rect('floor-1', 'room-gf-entrance', 'Main Entrance', 'atrium', 8, 42, 16, 18),
      rect('floor-1', 'room-gf-corridor', 'Central Corridor', 'corridor', 18, 40, 64, 20),
      rect('floor-1', 'room-gf-atrium', 'Atrium', 'atrium', 43, 22, 24, 30),
      rect('floor-1', 'room-gf-lumi', 'Lumi Fashion', 'store', 10, 10, 26, 24, 'store-1'),
      rect('floor-1', 'room-gf-bep', 'Bep Saigon', 'store', 70, 12, 20, 22, 'store-2'),
      rect('floor-1', 'room-gf-tech', 'TechCare', 'service', 70, 62, 20, 22, 'store-3'),
      rect('floor-1', 'room-gf-toilet', 'Toilet', 'toilet', 30, 66, 12, 14),
      rect('floor-1', 'room-gf-service', 'Guest Service', 'service', 48, 62, 18, 14),
      rect('floor-1', 'room-gf-exit', 'Emergency Exit', 'other', 88, 42, 6, 18),
    ],
  },
  {
    floorId: 'floor-2',
    status: 'confirmed',
    updatedAt: '2026-10-12T00:00:00.000Z',
    wallHeight: 3.2,
    realWidthM: 60,
    realHeightM: 38,
    rooms: [
      rect('floor-2', 'room-l2-corridor', 'Level 2 Corridor', 'corridor', 14, 42, 72, 18),
      rect('floor-2', 'room-l2-balcony', 'Atrium Balcony', 'atrium', 42, 20, 26, 26),
      rect('floor-2', 'room-l2-green', 'Green Home', 'store', 10, 12, 26, 22, 'store-4'),
      rect('floor-2', 'room-l2-kids', 'Kids Corner', 'store', 70, 12, 20, 22),
      rect('floor-2', 'room-l2-toilet', 'Toilet', 'toilet', 28, 66, 14, 14),
      rect('floor-2', 'room-l2-service', 'Service Desk', 'service', 48, 64, 18, 14),
      rect('floor-2', 'room-l2-lounge', 'Family Lounge', 'other', 70, 64, 20, 14),
    ],
  },
  {
    floorId: 'floor-3',
    status: 'confirmed',
    updatedAt: '2026-10-12T00:00:00.000Z',
    wallHeight: 3.2,
    realWidthM: 60,
    realHeightM: 38,
    rooms: [
      rect('floor-3', 'room-l3-corridor', 'Cinema Corridor', 'corridor', 14, 42, 72, 18),
      rect('floor-3', 'room-l3-atrium', 'Sky Atrium', 'atrium', 42, 20, 26, 26),
      rect('floor-3', 'room-l3-cinema', 'Cinema', 'store', 10, 12, 26, 22),
      rect('floor-3', 'room-l3-food', 'Food Hall', 'store', 70, 12, 20, 22),
      rect('floor-3', 'room-l3-games', 'Game Zone', 'store', 10, 66, 24, 14),
      rect('floor-3', 'room-l3-toilet', 'Toilet', 'toilet', 42, 66, 14, 14),
      rect('floor-3', 'room-l3-service', 'Cinema Service', 'service', 62, 64, 24, 14),
    ],
  },
]

function polygonPoints(points: Point[]) {
  return points
    .map((point) => `${(point.x / 100) * SVG_WIDTH},${(point.y / 100) * SVG_HEIGHT}`)
    .join(' ')
}

function roomCenter(points: Point[]) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  )

  return {
    x: (total.x / points.length / 100) * SVG_WIDTH,
    y: (total.y / points.length / 100) * SVG_HEIGHT,
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buildPlanSvgDataUri(geometry: FloorGeometry) {
  const roomsSvg = geometry.rooms
    .map((room) => {
      const center = roomCenter(room.polygon)
      return `
  <polygon points="${polygonPoints(room.polygon)}" fill="${roomFillByType[room.type]}" stroke="${roomStrokeByType[room.type]}" stroke-width="4"/>
  <text x="${center.x}" y="${center.y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="28" font-weight="700" fill="#0f172a">${escapeXml(room.name)}</text>`
    })
    .join('')

  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="#ffffff"/>
  <rect x="36" y="36" width="${SVG_WIDTH - 72}" height="${SVG_HEIGHT - 72}" rx="16" fill="#f8fafc" stroke="#1f2937" stroke-width="8"/>
  ${roomsSvg}
  <path d="M${0.18 * SVG_WIDTH} ${0.5 * SVG_HEIGHT}H${0.86 * SVG_WIDTH}" stroke="#64748b" stroke-width="16" stroke-linecap="round" opacity="0.48"/>
  <circle cx="${0.68 * SVG_WIDTH}" cy="${0.43 * SVG_HEIGHT}" r="26" fill="#f97316" stroke="#ffffff" stroke-width="7"/>
</svg>`)
  )
}

export const floorGeometry = loadFromStorage<FloorGeometry[]>(
  MOCK_STORAGE_KEYS.geometry,
  initialFloorGeometrySeed,
)

saveToStorage(MOCK_STORAGE_KEYS.geometry, floorGeometry)
