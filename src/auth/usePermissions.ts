import { useAuthStore } from './store'
import { can, canEditFloor, type PermissionAction, type PermissionResource } from './permissions'
import type { Floor } from '../types/floor'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  return {
    user,
    can: (action: PermissionAction, resource: PermissionResource) => can(user, action, resource),
    canEditFloor: (floor: Floor | null) => canEditFloor(user, floor),
  }
}
