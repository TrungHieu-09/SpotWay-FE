import type { Promotion, PromotionPayload } from '../types/promotion'
import type { Store, StoreStatus } from '../types/store'

/** Store as the BE returns it (see SpotWay-BE `stores`). */
export type StoreDto = {
  id: string
  floorId: string
  buildingId?: string | null
  nodeId?: string | null
  ownerId?: string | null
  name: string
  logoUrl?: string | null
  images?: string[] | null
  description?: string | null
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | string
}

export type PromotionDto = {
  id: string
  storeId: string
  title: string
  description?: string | null
  startAt: string
  endAt: string
  status: 'ACTIVE' | 'INACTIVE' | string
}

export function storeStatusFromDto(status: string): StoreStatus {
  return status === 'ACTIVE' ? 'active' : 'inactive'
}

export function storeStatusToDto(status: StoreStatus): 'ACTIVE' | 'CLOSED' {
  return status === 'active' ? 'ACTIVE' : 'CLOSED'
}

/** BE has no category / opening hours / creator: those FE fields stay empty. */
export function storeFromDto(dto: StoreDto): Store {
  return {
    id: dto.id,
    ownerUserId: dto.ownerId ?? null,
    createdByUserId: '',
    buildingId: dto.buildingId ?? '',
    floorId: dto.floorId,
    nodeId: dto.nodeId ?? null,
    name: dto.name,
    logoUrl: dto.logoUrl ?? null,
    galleryImageUrls: dto.images ?? [],
    description: dto.description ?? '',
    category: '',
    openingHours: '',
    status: storeStatusFromDto(dto.status),
  }
}

export function promotionFromDto(dto: PromotionDto): Promotion {
  return {
    id: dto.id,
    storeId: dto.storeId,
    title: dto.title,
    description: dto.description ?? '',
    discountText: '',
    startDate: dto.startAt,
    endDate: dto.endAt,
    status: dto.status === 'ACTIVE' ? 'published' : 'draft',
  }
}

/** FE dates are `YYYY-MM-DD` or ISO strings; BE wants ISO date-times. A date-only end covers the whole day. */
function toIso(value: string, endOfDay: boolean) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

export function promotionToDto(payload: Partial<PromotionPayload>) {
  return {
    title: payload.title,
    description: payload.description,
    startAt: payload.startDate ? toIso(payload.startDate, false) : undefined,
    endAt: payload.endDate ? toIso(payload.endDate, true) : undefined,
    status: payload.status === undefined ? undefined : payload.status === 'published' ? 'ACTIVE' : 'INACTIVE',
  }
}
