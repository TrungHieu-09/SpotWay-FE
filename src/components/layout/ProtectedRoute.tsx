import { Navigate, Outlet } from 'react-router-dom'

export type AppRole =
  | 'guest'
  | 'store_owner'
  | 'building_manager'
  | 'building_owner'
  | 'admin'

const defaultRouteByRole: Record<AppRole, string> = {
  guest: '/login',
  store_owner: '/login',
  building_manager: '/manager',
  building_owner: '/owner/buildings',
  admin: '/owner/buildings',
}

export function getDemoRole(): AppRole {
  const storedRole = window.localStorage.getItem('spotway.role') as AppRole | null
  return (
    storedRole ??
    (import.meta.env.VITE_DEMO_ROLE as AppRole | undefined) ??
    'guest'
  )
}

type ProtectedRouteProps = {
  allowedRoles: AppRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const role = getDemoRole()

  if (!allowedRoles.includes(role)) {
    return <Navigate to={defaultRouteByRole[role]} replace />
  }

  return <Outlet />
}

