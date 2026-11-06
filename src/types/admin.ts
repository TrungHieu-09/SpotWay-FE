import type { Role, User } from './auth'

export type AdminOverview = {
  users: {
    total: number
    admin: number
    buildingOwner: number
    buildingManager: number
    storeOwner: number
  }
  buildings: number
}

/** `tenantName` is the Building Owner an account belongs to (null for admins). */
export type AdminUser = User & { tenantName: string | null }

/** Roles an admin can hand out. */
export type AssignableRole = Extract<Role, 'building_owner' | 'building_manager' | 'store_owner'>

export type CreateAdminUserPayload = {
  email: string
  password: string
  role: AssignableRole
  /** Required for building_manager / store_owner: the Building Owner they belong to. */
  ownerId?: string
}
