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
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />
    }
    // An account that is not attached to a Building Owner yet lands on /account instead of 403
    if (!user.tenantId) {
      return <Navigate to="/account" replace />
    }
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}


