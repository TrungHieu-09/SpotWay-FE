/* oxlint-disable react/only-export-components */
import { Suspense, lazy, type ReactNode } from 'react'
import { Spin } from 'antd'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { OwnerLayout } from '../components/layout/OwnerLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { LandingPage } from '../pages/Landing/LandingPage'
import { LoginPage } from '../pages/Auth/LoginPage'
import { ForbiddenPage } from '../pages/Auth/ForbiddenPage'
import { NotFoundPage } from '../pages/Auth/NotFoundPage'
import { ChangePasswordPage } from '../pages/Auth/ChangePasswordPage'
import { ForgotPasswordPage } from '../pages/Auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/Auth/ResetPasswordPage'

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
const StoreOwnerManagementPage = lazy(() =>
  import('../pages/BuildingManager/BuildingManager/StoreOwnerManagementPage').then((module) => ({
    default: module.StoreOwnerManagementPage,
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
const StorePromotionsPage = lazy(() =>
  import('../pages/StoreOwner/StorePromotionsPage').then((module) => ({
    default: module.StorePromotionsPage,
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
  // ── SpotWay Premium Landing Page ──
  { path: '/', element: <LandingPage /> },

  // ── Building Owner section with sidebar layout ──
  {
    element: <ProtectedRoute allowedRoles={['building_owner']} />,
    children: [
      {
        element: <OwnerLayout />,
        children: [
          { path: 'owner/dashboard', element: lazyElement(<OwnerDashboardPage />) },
          { path: 'owner/buildings', element: lazyElement(<BuildingListPage />) },
          { path: 'owner/buildings/:buildingId', element: lazyElement(<BuildingDetailPage />) },
          { path: 'owner/staff', element: lazyElement(<OwnerStaffPage />) },
          { path: 'owner/managers', element: lazyElement(<OwnerStaffPage />) },
          { path: 'owner/store-owners', element: lazyElement(<OwnerStaffPage />) },
          { path: 'owner/subscription', element: lazyElement(<OwnerSubscriptionPage />) },
        ],
      },
    ],
  },

  // ── Rest of app with AppLayout ──
  {
    element: <AppLayout />,
    children: [
      { path: 'home', element: lazyElement(<HomePage />) },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: '403', element: <ForbiddenPage /> },
      {
        element: <ProtectedRoute allowedRoles={['admin', 'building_owner', 'building_manager', 'store_owner']} />,
        children: [{ path: 'change-password', element: <ChangePasswordPage /> }],
      },
      {
        element: <ProtectedRoute allowedRoles={['building_manager', 'building_owner']} />,
        children: [
          { path: 'manager', element: lazyElement(<ManagerLayout />) },
          { path: 'manager/store-owners', element: lazyElement(<StoreOwnerManagementPage />) },
        ],
      },
      {
        children: [{ path: 'guest', element: lazyElement(<GuestMapPage />) }],
      },
      {
        element: <ProtectedRoute allowedRoles={['store_owner']} />,
        children: [
          { path: 'store/profile', element: lazyElement(<StoreProfilePage />) },
          { path: 'store/promotions', element: lazyElement(<StorePromotionsPage />) },
        ],
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
