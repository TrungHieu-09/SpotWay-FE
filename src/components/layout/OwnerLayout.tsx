import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  ApartmentOutlined,
  DashboardOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../auth/store'
import './SpotWayNavbar.css'
import './OwnerLayout.css'
import '../../pages/BuildingOwner/OwnerStaffPage.css'

interface NavItem {
  path: string
  icon: React.ReactNode
  label: string
  exactMatch?: boolean
  matchPrefixes?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/owner/dashboard',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
    exactMatch: true,
  },
  {
    path: '/owner/buildings',
    icon: <ApartmentOutlined />,
    label: 'Tòa nhà',
    matchPrefixes: ['/owner/buildings'],
  },
  {
    path: '/owner/managers',
    icon: <TeamOutlined />,
    label: 'Quản lý khu vực',
    matchPrefixes: ['/owner/managers', '/owner/staff'],
  },
  {
    path: '/owner/store-owners',
    icon: <ShopOutlined />,
    label: 'Chủ gian hàng',
    matchPrefixes: ['/owner/store-owners'],
  },
]

function isNavItemActive(item: NavItem, currentPath: string): boolean {
  if (item.exactMatch) {
    return currentPath === item.path
  }
  if (item.matchPrefixes) {
    return item.matchPrefixes.some((p) => currentPath.startsWith(p))
  }
  return currentPath.startsWith(item.path)
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/owner/buildings/') && pathname !== '/owner/buildings') {
    return 'Chi tiết tòa nhà'
  }
  const match = NAV_ITEMS.find((item) => isNavItemActive(item, pathname))
  return match?.label ?? 'Chủ tòa nhà'
}

export function OwnerLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const userInitial = (user?.name || user?.email || 'O').slice(0, 1).toUpperCase()
  const currentTitle = getPageTitle(location.pathname)

  return (
    <div className="ol-root">
      {/* ── Ambient Glow Background ── */}
      <div className="ol-ambient" aria-hidden="true">
        <div className="ol-ambient__glow ol-ambient__glow--violet" />
        <div className="ol-ambient__glow ol-ambient__glow--cyan" />
      </div>

      {/* ── Sidebar ── */}
      <aside className={`ol-sidebar ${collapsed ? 'ol-sidebar--collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="ol-sidebar__header">
          <Link
            to="/"
            className={`spw-brand group ${collapsed ? 'spw-brand--centered' : ''}`}
            title="Về trang chủ SpotWay"
            style={{ textDecoration: 'none' }}
          >
            <div className="spw-brand-icon">
              <div className="spw-brand-icon-inner">
                <span className="material-symbols-outlined">near_me</span>
              </div>
              <span className="spw-brand-ping ping-anim" />
              <span className="spw-brand-ping" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="spw-brand-text">SpotWay</span>
                  <span className="spw-brand-sub">Spatial OS</span>
                </div>
                {user?.tenant?.name && (
                  <span
                    className="text-[11px] font-mono truncate max-w-[130px] opacity-75"
                    style={{ color: '#5de6ff', marginTop: '-2px' }}
                    title={user.tenant.name}
                  >
                    {user.tenant.name}
                  </span>
                )}
              </div>
            )}
          </Link>

          <button
            className="ol-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            type="button"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="ol-nav" aria-label="Owner Navigation">
          {!collapsed && (
            <div className="ol-nav__section-label">
              <span>ĐIỀU HƯỚNG</span>
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item, location.pathname)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`ol-nav-item ${active ? 'ol-nav-item--active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="ol-nav-item__icon">{item.icon}</span>
                {!collapsed && <span className="ol-nav-item__label">{item.label}</span>}
                {active && !collapsed && <span className="ol-nav-item__indicator" />}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="ol-sidebar__footer">
          {/* Back to Home */}
          <button
            className="ol-footer-btn"
            onClick={() => navigate('/')}
            title="Về trang chủ"
            type="button"
          >
            <HomeOutlined />
            {!collapsed && <span>Trang chủ</span>}
          </button>

          {/* User Profile */}
          {user && (
            <div className={`ol-user ${collapsed ? 'ol-user--collapsed' : ''}`} title={user.email}>
              <div className="ol-user__avatar">{userInitial}</div>
              {!collapsed && (
                <div className="ol-user__info">
                  <span className="ol-user__name">{user.name || 'Chủ tòa nhà'}</span>
                  <span className="ol-user__role">Chủ tòa nhà</span>
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          <button
            className="ol-logout-btn"
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
            type="button"
          >
            <LogoutOutlined />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="ol-main">
        {/* Top bar */}
        <header className="ol-topbar">
          <div className="ol-topbar__left">
            <span className="ol-topbar__title">{currentTitle}</span>
          </div>
          <div className="ol-topbar__right">
            <div className="ol-topbar__badge">
              <span className="ol-topbar__dot" />
              <span>{user?.tenant?.subdomain ? `${user.tenant.subdomain}.spotway.app` : 'Tổ hợp hoạt động'}</span>
            </div>
            {user && (
              <div className="ol-topbar__user" title={user.email}>
                <span className="ol-topbar__user-avatar">{userInitial}</span>
                <span className="ol-topbar__user-name">{user.name || 'Chủ tòa nhà'}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="ol-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
