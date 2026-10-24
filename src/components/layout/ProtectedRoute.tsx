import { Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import type { Role } from '../../types/auth'

export type AppRole =
  | 'guest'
  | 'store_owner'
  | 'building_manager'
  | 'building_owner'
  | 'admin'

export function getDemoRole(): AppRole {
  const storedRole = window.localStorage.getItem('spotway.role') as AppRole | null
  return (
    storedRole ??
    (import.meta.env.VITE_DEMO_ROLE as AppRole | undefined) ??
    'guest'
  )
}

type ProtectedRouteProps = {
  allowedRoles: (Role | AppRole)[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isInitializing = useAuthStore((state) => state.isInitializing)

  if (isInitializing) {
    return (
      <div
        className="route-loading"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}


