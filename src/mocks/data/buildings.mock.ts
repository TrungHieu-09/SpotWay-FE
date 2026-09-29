import type { Building } from '../../types/building'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'
import { mallPlan, officePlan } from './floors.mock'

export const initialBuildingsSeed: Building[] = [
  {
    id: 'bldg-1',
    name: 'Saigon Central Mall',
    address: '72 Le Loi, District 1',
    status: 'active',
    floorCount: 3,
    createdAt: '2026-09-10T09:00:00.000Z',
    planImageUrl: mallPlan,
  },
  {
    id: 'bldg-2',
    name: 'Rivergate Office Tower',
    address: '151 Ben Van Don, District 4',
    status: 'draft',
    floorCount: 2,
    createdAt: '2026-09-18T11:30:00.000Z',
    planImageUrl: officePlan,
  },
  {
    id: 'bldg-3',
    name: 'Hanoi Innovation Hub',
    address: '24 Tran Duy Hung, Cau Giay',
    status: 'active',
    floorCount: 4,
    createdAt: '2026-09-20T08:15:00.000Z',
    planImageUrl: officePlan,
  },
  {
    id: 'bldg-4',
    name: 'Danang Retail Plaza',
    address: '09 Bach Dang, Hai Chau',
    status: 'draft',
    floorCount: 2,
    createdAt: '2026-09-23T14:45:00.000Z',
    planImageUrl: mallPlan,
  },
]

export const buildings = loadFromStorage(
  MOCK_STORAGE_KEYS.buildings,
  initialBuildingsSeed,
)

