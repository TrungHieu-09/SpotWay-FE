/* oxlint-disable react/only-export-components */
import { Suspense, lazy, type ReactNode } from 'react'
import { Spin } from 'antd'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AdminLayout } from '../components/layout/AdminLayout'
import { OwnerLayout } from '../components/layout/OwnerLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { LandingPage } from '../pages/Landing/LandingPage'
import { LoginPage } from '../pages/Auth/LoginPage'
import { ForbiddenPage } from '../pages/Auth/ForbiddenPage'
import { NotFoundPage } from '../pages/Auth/NotFoundPage'
import { ChangePasswordPage } from '../pages/Auth/ChangePasswordPage'

const AccountHomePage = lazy(() =>
  import('../pages/Auth/AccountHomePage').then((module) => ({
    default: module.AccountHomePage,
  })),
)

const ProfilePage = lazy(() =>
  import('../pages/Auth/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)

const HomePage = lazy(() =>
  import('../pages/Home/HomePage').then((module) => ({
    default: module.HomePage,
  })),
)

// ── Building Owner pages ──
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
// ── Building Manager pages ──
const ManagerLayout = lazy(() =>
  import('../pages/BuildingManager/ManagerLayout').then((module) => ({
    default: module.ManagerLayout,
  })),
)
const StoreOwnerManagementPage = lazy(() =>
  import('../pages/BuildingManager/StoreOwnerManagementPage').then((module) => ({
    default: module.StoreOwnerManagementPage,
  })),
)

// ── Guest ──
const GuestMapPage = lazy(() =>
  import('../pages/Guest/GuestMapPage').then((module) => ({
    default: module.GuestMapPage,
  })),
)

// ── Store Owner ──
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

// ── Admin ──
const AdminOverviewPage = lazy(() =>
  import('../pages/Admin/AdminOverviewPage').then((module) => ({
    default: module.AdminOverviewPage,
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
  // ── SpotWay Premium Landing Page & Auth ──
  { path: '/', element: <LandingPage /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'account', element: lazyElement(<AccountHomePage />) },
  { path: 'workspace/choose', element: lazyElement(<AccountHomePage />) },
  { path: 'profile', element: lazyElement(<ProfilePage />) },

  // ── Building Owner section with sidebar ──
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
        ],
      },
    ],
  },

  // ── Rest of app with AppLayout ──
  {
    element: <AppLayout />,
    children: [
      { path: 'home', element: lazyElement(<HomePage />) },
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
    ],
  },

  // ── Admin section with sidebar ──
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: 'admin', element: lazyElement(<AdminOverviewPage />) },
          { path: 'admin/accounts', element: lazyElement(<AdminAccountsPage />) },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
