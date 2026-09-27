import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { BuildingListPage } from '../pages/BuildingOwner/BuildingListPage'
import { ManagerLayout } from '../pages/BuildingManager/ManagerLayout'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/owner/buildings" replace /> },
      {
        element: (
          <ProtectedRoute allowedRoles={['building_owner', 'admin']} />
        ),
        children: [
          { path: 'owner/buildings', element: <BuildingListPage /> },
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
  { path: '*', element: <Navigate to="/owner/buildings" replace /> },
])

