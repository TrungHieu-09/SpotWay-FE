import type { AuthUser, Role } from '../types/auth'
import type { Floor } from '../types/floor'

export const PERMISSIONS = {
  ownerCanCreateBuilding: false,
} as const

export function canEditFloor(user: AuthUser | null, floor: Floor | null) {
  if (!user || !floor || user.tenantId === null) return false
  if (user.role === 'building_owner') return true
  if (user.role !== 'building_manager') return false
  // BE không có khái niệm khu vực: manager được gán theo toà nhà và BE tự chặn (403) nếu không đúng toà.
  // Chỉ khi tầng có areaId (dữ liệu cũ) mới yêu cầu khớp khu vực.
  return !floor.areaId || Boolean(user.areaIds?.includes(floor.areaId))
}

export function can(user: AuthUser | null, action: string, resource: string) {
  if (!user) return false
  if (user.role === 'admin') return resource === 'admin'
  if (resource === 'building' && action === 'create') return user.role === 'building_owner' && PERMISSIONS.ownerCanCreateBuilding
  if (resource === 'store' && action === 'create') return user.role === 'building_manager' || user.role === 'building_owner'
  if (resource === 'staff') return user.role === 'building_owner'
  return user.role === 'building_owner' || user.role === 'building_manager'
}

export type PermissionAction = Parameters<typeof can>[1]
export type PermissionResource = Parameters<typeof can>[2]
export type ManagedRole = Extract<Role, 'building_manager' | 'store_owner'>
