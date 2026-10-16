import { Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import type { Role } from '../../types/auth'

type ProtectedRouteProps = {
  allowedRoles: Role[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isInitializing = useAuthStore((state) => state.isInitializing)

  if (isInitializing) {
    return <div className="route-loading"><Spin /></div>
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

