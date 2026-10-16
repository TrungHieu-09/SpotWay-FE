import type { MaintenanceZone } from '../../types/maintenance'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'

const seed: MaintenanceZone[] = [
  { id: 'maintenance-1', floorId: 'floor-1', name: 'Khu vực sửa chữa', reason: 'Thi công sàn', rect: { x: 72, y: 68, w: 15, h: 15 }, active: false, createdAt: '2026-10-01T08:00:00.000Z' },
]

export const maintenanceZones = loadFromStorage<MaintenanceZone[]>(MOCK_STORAGE_KEYS.maintenanceZones, seed)
