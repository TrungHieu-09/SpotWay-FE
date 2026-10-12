/* oxlint-disable react/only-export-components */
import { Suspense, lazy, type ReactNode } from 'react'
import { Spin } from 'antd'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'

const HomePage = lazy(() =>
  import('../pages/Home/HomePage').then((module) => ({
    default: module.HomePage,
  })),
)
const BuildingListPage = lazy(() =>
  import('../pages/BuildingOwner/BuildingListPage').then((module) => ({
    default: module.BuildingListPage,
  })),
)
const BuildingDetailPage = lazy(() =>
  import('../pages/BuildingOwner/BuildingDetailPage').then((module) => ({
    default: module.BuildingDetailPage,
  })),
)
const ManagerLayout = lazy(() =>
  import('../pages/BuildingManager/ManagerLayout').then((module) => ({
    default: module.ManagerLayout,
  })),
)
const GuestMapPage = lazy(() =>
  import('../pages/Guest/GuestMapPage').then((module) => ({
    default: module.GuestMapPage,
  })),
)
const StoreProfilePage = lazy(() =>
  import('../pages/StoreOwner/StoreProfilePage').then((module) => ({
    default: module.StoreProfilePage,
  })),
)

function lazyElement(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="route-loading">
          <Spin />
        </div>
      }
    >
      {element}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: lazyElement(<HomePage />) },
      {
        element: (
          <ProtectedRoute allowedRoles={['building_owner', 'admin']} />
        ),
        children: [
          { path: 'owner/buildings', element: lazyElement(<BuildingListPage />) },
          {
            path: 'owner/buildings/:buildingId',
            element: lazyElement(<BuildingDetailPage />),
          },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['building_manager', 'admin']} />
        ),
        children: [{ path: 'manager', element: lazyElement(<ManagerLayout />) }],
      },
      {
        element: <ProtectedRoute allowedRoles={['guest', 'admin']} />,
        children: [{ path: 'guest', element: lazyElement(<GuestMapPage />) }],
      },
      { path: 'store/profile', element: lazyElement(<StoreProfilePage />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

