import type { Store } from '../../types/store'
import { floors } from './floors.mock'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'

function storeImage(label: string, fill: string, accent: string) {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
  <rect width="640" height="420" rx="24" fill="${fill}"/>
  <rect x="52" y="68" width="536" height="284" rx="20" fill="#ffffff" stroke="${accent}" stroke-width="10"/>
  <path d="M98 148h444M118 242h170M354 242h150" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
  <circle cx="174" cy="305" r="32" fill="${accent}" opacity="0.24"/>
  <circle cx="250" cy="305" r="32" fill="${accent}" opacity="0.32"/>
  <text x="320" y="214" text-anchor="middle" font-family="Arial" font-size="54" font-weight="700" fill="#111827">${label}</text>
</svg>`)
  )
}

function logo(label: string, fill: string) {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="48" fill="${fill}"/>
  <text x="120" y="140" text-anchor="middle" font-family="Arial" font-size="72" font-weight="700" fill="#ffffff">${label}</text>
</svg>`)
  )
}

export const initialStoresSeed: Store[] = [
  {
    id: 'store-1',
    ownerUserId: 'user-lumi',
    createdByUserId: 'user-manager-1a',
    buildingId: 'bldg-1',
    floorId: 'floor-1',
    name: 'Lumi Fashion',
    logoUrl: logo('LF', '#2563eb'),
    galleryImageUrls: [
      storeImage('Lumi', '#dbeafe', '#2563eb'),
      storeImage('Denim', '#e0f2fe', '#0284c7'),
    ],
    description: 'Thời trang công sở và casual wear cho khách mua sắm trong mall.',
    category: 'Thời trang',
    status: 'active',
  },
  {
    id: 'store-2',
    ownerUserId: 'user-bep',
    createdByUserId: 'user-manager-1b',
    buildingId: 'bldg-1',
    floorId: 'floor-1',
    name: 'Bep Saigon',
    logoUrl: logo('BS', '#16a34a'),
    galleryImageUrls: [
      storeImage('Bep', '#dcfce7', '#16a34a'),
      storeImage('Pho', '#fef9c3', '#ca8a04'),
    ],
    description: 'Quầy ăn uống phục vụ món Việt nhanh, nước ép và cà phê.',
    category: 'Ăn uống',
    status: 'active',
  },
  {
    id: 'store-3',
    ownerUserId: null,
    createdByUserId: 'user-manager-1a',
    buildingId: 'bldg-1',
    floorId: 'floor-1',
    name: 'TechCare',
    logoUrl: logo('TC', '#7c3aed'),
    galleryImageUrls: [storeImage('Tech', '#ede9fe', '#7c3aed')],
    description: 'Dịch vụ sửa chữa điện thoại, phụ kiện và bảo hành nhanh.',
    category: 'Dịch vụ',
    status: 'inactive',
  },
  {
    id: 'store-4',
    ownerUserId: 'user-green',
    createdByUserId: 'user-manager-1a',
    buildingId: 'bldg-1',
    floorId: 'floor-2',
    name: 'Green Home',
    logoUrl: logo('GH', '#059669'),
    galleryImageUrls: [storeImage('Home', '#d1fae5', '#059669')],
    description: 'Đồ gia dụng, trang trí nhà cửa và sản phẩm xanh.',
    category: 'Dịch vụ',
    status: 'active',
  },
  {
    id: 'store-5',
    ownerUserId: 'user-lumi',
    createdByUserId: 'user-owner-1',
    buildingId: 'bldg-2',
    floorId: 'floor-4',
    name: 'River Coffee',
    logoUrl: logo('RC', '#b45309'),
    galleryImageUrls: [storeImage('Coffee', '#ffedd5', '#b45309')],
    description: 'Coffee corner dành cho nhân viên văn phòng và khách vãng lai.',
    category: 'Ăn uống',
    status: 'active',
  },
]

type StoredStore = Omit<Store, 'ownerUserId' | 'buildingId'> &
  Partial<Pick<Store, 'ownerUserId' | 'buildingId'>> & {
    ownerId?: string | null
  createdByUserId?: string
  }

const legacyOwnerByStoreId: Record<string, string | null> = {
  'store-1': 'user-lumi',
  'store-2': 'user-bep',
  'store-3': null,
  'store-4': 'user-green',
  'store-5': 'user-lumi',
}

function getBuildingIdByFloorId(floorId: string) {
  return floors.find((floor) => floor.id === floorId)?.buildingId ?? 'bldg-1'
}

function normalizeStore(store: StoredStore): Store {
  return {
    ...store,
    ownerUserId:
      store.ownerUserId ??
      (store.ownerId !== undefined
        ? store.ownerId
        : legacyOwnerByStoreId[store.id] ?? null),
    buildingId: store.buildingId ?? getBuildingIdByFloorId(store.floorId),
    createdByUserId: store.createdByUserId ?? 'user-owner-1',
    logoUrl: store.logoUrl?.trim() ? store.logoUrl : null,
    galleryImageUrls: store.galleryImageUrls.slice(0, 5),
    status: store.status ?? 'inactive',
  }
}

export const stores = loadFromStorage<StoredStore[]>(
  MOCK_STORAGE_KEYS.stores,
  initialStoresSeed,
).map(normalizeStore)
