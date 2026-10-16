import type { Plan, Tenant, User } from './auth'
import type { Building } from './building'

export type AdminOverview = {
  tenants: { total: number; active: number; suspended: number }
  buildings: number
  users: number
  plans: Array<{ planId: string; planName: string; count: number }>
}

export type TenantDetail = Tenant & {
  plan: Plan
  buildings: Building[]
  users: User[]
}

export type AdminUser = User & { tenantName: string | null }
