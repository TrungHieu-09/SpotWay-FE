export type Role = 'admin' | 'building_owner' | 'building_manager' | 'store_owner'

export type UserStatus = 'active' | 'locked'

export type TenantStatus = 'active' | 'suspended'

export type User = {
  id: string
  tenantId: string | null
  role: Role
  name: string
  email: string
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
  maxStaff: number
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

export type AuthUser = Omit<User, 'status'> & {
  status: UserStatus
  tenant: Tenant | null
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
  plan: Plan
  usage: {
    buildings: number
    staff: number
    floors: number
    publishedFloors: number
    stores: number
    activePromotions: number
  }
}
