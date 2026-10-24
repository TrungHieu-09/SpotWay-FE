import type { Area } from '../../types/area'
import { loadFromStorage, MOCK_STORAGE_KEYS, saveToStorage } from '../persist'

export const initialAreasSeed: Area[] = [
  { id: 'area-fashion', tenantId: 'tenant-1', buildingId: 'bldg-1', name: 'Khu Thời trang & Dịch vụ', description: 'Khu mua sắm và dịch vụ', color: '#2563eb', createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'area-food', tenantId: 'tenant-1', buildingId: 'bldg-1', name: 'Khu Ẩm thực', description: 'Khu ăn uống', color: '#f59e0b', createdAt: '2026-09-01T09:01:00.000Z' },
  { id: 'area-entertainment', tenantId: 'tenant-1', buildingId: 'bldg-1', name: 'Khu Giải trí', color: '#7c3aed', createdAt: '2026-09-01T09:02:00.000Z' },
  { id: 'area-office', tenantId: 'tenant-2', buildingId: 'bldg-2', name: 'Khu Văn phòng', color: '#16a34a', createdAt: '2026-09-01T09:03:00.000Z' },
  { id: 'area-retail-2', tenantId: 'tenant-2', buildingId: 'bldg-3', name: 'Khu Bán lẻ', color: '#0891b2', createdAt: '2026-09-01T09:04:00.000Z' },
]

export const areas = loadFromStorage(MOCK_STORAGE_KEYS.areas, initialAreasSeed)
saveToStorage(MOCK_STORAGE_KEYS.areas, areas)
