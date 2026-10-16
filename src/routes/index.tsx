/* oxlint-disable react/only-export-components */
import { Suspense, lazy, type ReactNode } from 'react'
import { Spin } from 'antd'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { LoginPage } from '../pages/Auth/LoginPage'
import { ForbiddenPage } from '../pages/Auth/ForbiddenPage'
import { NotFoundPage } from '../pages/Auth/NotFoundPage'

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
const OwnerDashboardPage = lazy(() =>
  import('../pages/BuildingOwner/OwnerDashboardPage').then((module) => ({
    default: module.OwnerDashboardPage,
  })),
)
const OwnerStaffPage = lazy(() =>
  import('../pages/BuildingOwner/OwnerStaffPage').then((module) => ({
    default: module.OwnerStaffPage,
  })),
)
const OwnerSubscriptionPage = lazy(() =>
  import('../pages/BuildingOwner/OwnerSubscriptionPage').then((module) => ({
    default: module.OwnerSubscriptionPage,
  })),
)
const AdminOverviewPage = lazy(() =>
  import('../pages/Admin/AdminOverviewPage').then((module) => ({
    default: module.AdminOverviewPage,
  })),
)
const AdminTenantsPage = lazy(() =>
  import('../pages/Admin/AdminTenantsPage').then((module) => ({
    default: module.AdminTenantsPage,
  })),
)
const AdminPlansPage = lazy(() =>
  import('../pages/Admin/AdminPlansPage').then((module) => ({
    default: module.AdminPlansPage,
  })),
)
const AdminAccountsPage = lazy(() =>
  import('../pages/Admin/AdminAccountsPage').then((module) => ({
    default: module.AdminAccountsPage,
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
        path: 'login',
        element: <LoginPage />,
      },
      { path: '403', element: <ForbiddenPage /> },
      {
        element: <ProtectedRoute allowedRoles={['building_owner']} />,
        children: [
          { path: 'owner/dashboard', element: lazyElement(<OwnerDashboardPage />) },
          { path: 'owner/buildings', element: lazyElement(<BuildingListPage />) },
          { path: 'owner/staff', element: lazyElement(<OwnerStaffPage />) },
          { path: 'owner/subscription', element: lazyElement(<OwnerSubscriptionPage />) },
          {
            path: 'owner/buildings/:buildingId',
            element: lazyElement(<BuildingDetailPage />),
          },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['building_manager', 'building_owner']} />
        ),
        children: [{ path: 'manager', element: lazyElement(<ManagerLayout />) }],
      },
      {
        children: [{ path: 'guest', element: lazyElement(<GuestMapPage />) }],
      },
      {
        element: <ProtectedRoute allowedRoles={['store_owner']} />,
        children: [{ path: 'store/profile', element: lazyElement(<StoreProfilePage />) }],
      },
      {
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
          { path: 'admin', element: lazyElement(<AdminOverviewPage />) },
          { path: 'admin/tenants', element: lazyElement(<AdminTenantsPage />) },
          { path: 'admin/plans', element: lazyElement(<AdminPlansPage />) },
          { path: 'admin/accounts', element: lazyElement(<AdminAccountsPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

