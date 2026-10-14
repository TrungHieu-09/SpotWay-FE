import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { BuildingDetailPage } from '../pages/BuildingOwner/BuildingDetailPage'
import { BuildingListPage } from '../pages/BuildingOwner/BuildingListPage'
import { ManagerLayout } from '../pages/BuildingManager/ManagerLayout'
import { LandingPage } from '../pages/Landing/LandingPage'
import { LoginPage } from '../pages/Landing/LoginPage'

export const router = createBrowserRouter([
  // ── Landing page (no layout wrapper) ──
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },

  // ── App shell with sticky header & role switcher ──
  {
    element: <AppLayout />,
    children: [
      {
        element: (
          <ProtectedRoute allowedRoles={['building_owner', 'admin']} />
        ),
        children: [
          { path: 'owner/buildings', element: <BuildingListPage /> },
          {
            path: 'owner/buildings/:buildingId',
            element: <BuildingDetailPage />,
          },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['building_manager', 'admin']} />
        ),
        children: [{ path: 'manager', element: <ManagerLayout /> }],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
