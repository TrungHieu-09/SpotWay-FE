import { Navigate, Outlet } from 'react-router-dom'

export type AppRole =
  | 'guest'
  | 'store_owner'
  | 'building_manager'
  | 'building_owner'
  | 'admin'

const defaultRouteByRole: Record<AppRole, string> = {
  guest: '/owner/buildings',
  store_owner: '/owner/buildings',
  building_manager: '/manager',
  building_owner: '/owner/buildings',
  admin: '/owner/buildings',
}

export function getDemoRole(): AppRole {
  const storedRole = window.localStorage.getItem('demoRole') as AppRole | null
  return (
    storedRole ??
    (import.meta.env.VITE_DEMO_ROLE as AppRole | undefined) ??
    'building_owner'
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

