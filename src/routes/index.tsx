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
import { ForgotPasswordPage } from '../pages/Auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/Auth/ResetPasswordPage'

const RegisterPage = lazy(() =>
  import('../pages/Auth/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
)

const EmailVerifyPage = lazy(() =>
  import('../pages/Auth/EmailVerifyPage').then((module) => ({
    default: module.EmailVerifyPage,
  })),
)

const WorkspaceOnboardingPage = lazy(() =>
  import('../pages/Auth/WorkspaceOnboardingPage').then((module) => ({
    default: module.WorkspaceOnboardingPage,
  })),
)

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

const PricingPage = lazy(() =>
  import('../pages/Pricing/PricingPage').then((module) => ({
    default: module.PricingPage,
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

const NavigationPage = lazy(() =>
  import('../pages/Guest/NavigationPage').then((module) => ({
    default: module.NavigationPage,
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
  // ── SpotWay Premium Landing Page & Auth ──
  { path: '/', element: <LandingPage /> },
  { path: 'pricing', element: lazyElement(<PricingPage />) },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: lazyElement(<RegisterPage />) },
  { path: 'signup', element: lazyElement(<RegisterPage />) },
  { path: 'verify-email', element: lazyElement(<EmailVerifyPage />) },
  { path: 'verify', element: lazyElement(<EmailVerifyPage />) },
  { path: 'onboarding', element: lazyElement(<WorkspaceOnboardingPage />) },
  { path: 'workspace-setup', element: lazyElement(<WorkspaceOnboardingPage />) },
  { path: 'account', element: lazyElement(<AccountHomePage />) },
  { path: 'workspace/choose', element: lazyElement(<AccountHomePage />) },
  { path: 'profile', element: lazyElement(<ProfilePage />) },
  { path: 'navigate', element: lazyElement(<NavigationPage />) },
  { path: 'navigate/:buildingId', element: lazyElement(<NavigationPage />) },

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
        ],
      },
    ],
  },

  // ── Rest of app with AppLayout ──
  {
    element: <AppLayout />,
    children: [
      { path: 'home', element: lazyElement(<HomePage />) },
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
          { path: 'manager/navigation-test/:buildingId', element: lazyElement(<NavigationPage />) },
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
          { path: 'admin/tenants', element: lazyElement(<AdminTenantsPage />) },
          { path: 'admin/plans', element: lazyElement(<AdminPlansPage />) },
          { path: 'admin/accounts', element: lazyElement(<AdminAccountsPage />) },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
