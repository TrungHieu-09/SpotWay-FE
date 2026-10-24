import type { QrCode } from '../../types/qr'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'

const seed: QrCode[] = [
  { id: 'qr-1', buildingId: 'bldg-1', floorId: 'floor-1', nodeId: 'node-gf-entrance', label: 'Cổng chính', code: 'saigon-entrance' },
  { id: 'qr-2', buildingId: 'bldg-1', floorId: 'floor-1', nodeId: 'node-12', label: 'Thang máy A', code: 'saigon-elevator-a' },
  { id: 'qr-3', buildingId: 'bldg-1', floorId: 'floor-2', nodeId: 'node-45', label: 'Thang máy A tầng 2', code: 'saigon-l2-elevator-a' },
]

export const qrCodes = loadFromStorage<QrCode[]>(MOCK_STORAGE_KEYS.qrCodes, seed)
