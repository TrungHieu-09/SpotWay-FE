import type { Area } from './area'

// ── Auth / Tenant types ──────────────────────────────────────────────────────

export type Role = 'admin' | 'building_owner' | 'building_manager' | 'store_owner'

export type UserStatus = 'active' | 'locked'

export type TenantStatus = 'active' | 'suspended'

export type User = {
  id: string
  tenantId: string | null
  role: Role
  name: string
  email: string
  areaIds?: string[]
  createdByUserId: string | null
  mustChangePassword: boolean
  status: UserStatus
  createdAt: string
}

export type Tenant = {
  id: string
  name: string
  subdomain: string
  planId: string
  status: TenantStatus
  planExpiresAt: string
  createdAt: string
}

export type Plan = {
  id: string
  name: string
  maxBuildings: number
  maxManagers: number
  maxStoreOwners: number
  priceVnd: number
  durationMonths: number
}

export type Invoice = {
  id: string
  tenantId: string
  planId: string
  amountVnd: number
  months: number
  paidAt: string
  status: 'paid'
}

export type TenantOverview = {
  tenant: Tenant
  plan: Plan
  usage: {
    buildings: number
    areas: number
    managers: number
    storeOwners: number
    floors: number
    publishedFloors: number
    stores: number
    activePromotions: number
  }
}

export type AuthUser = Omit<User, 'status'> & {
  status: UserStatus
  tenant: Tenant | null
  areas?: Area[]
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export type AuthErrorResponse = {
  code: string
  message: string
}
