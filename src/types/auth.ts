import type { Area } from './area'

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
  status: TenantStatus
  createdAt: string
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

export type TenantOverview = {
  tenant: Tenant
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
