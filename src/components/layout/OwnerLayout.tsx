import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  ApartmentOutlined,
  CloudOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../auth/store'
import './OwnerLayout.css'

interface NavItem {
  path: string
  icon: React.ReactNode
  label: string
  matchPrefixes?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/owner/dashboard',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
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
  {
    path: '/owner/subscription',
    icon: <CloudOutlined />,
    label: 'Gói dịch vụ',
    matchPrefixes: ['/owner/subscription'],
  },
]

function isNavItemActive(item: NavItem, currentPath: string): boolean {
  if (item.path === '/owner/dashboard') {
    return currentPath === '/owner/dashboard'
  }
  if (item.matchPrefixes) {
    return item.matchPrefixes.some((p) => currentPath.startsWith(p))
  }
  return currentPath.startsWith(item.path)
}

export function OwnerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const userInitial = (user?.name || user?.email || 'O').slice(0, 1).toUpperCase()

  return (
    <div className="ol-root">
      {/* ── Ambient Glow Background ── */}
      <div className="ol-ambient" aria-hidden="true">
        <div className="ol-ambient__glow ol-ambient__glow--violet" />
        <div className="ol-ambient__glow ol-ambient__glow--cyan" />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="ol-navbar">
        <div className="ol-navbar__inner">
          {/* Brand Lockup */}
          <div
            className="ol-brand"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            title="Về trang chủ SpotWay"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/')
              }
            }}
          >
            <div className="ol-brand__logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div className="ol-brand__meta">
              <span className="ol-brand__name">SpotWay</span>
              <span className="ol-brand__badge">
                <span className="ol-brand__dot" />
                Owner Portal
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="ol-nav" aria-label="Owner Navigation">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item, location.pathname)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`ol-nav-item ${active ? 'ol-nav-item--active' : ''}`}
                >
                  <span className="ol-nav-item__icon">{item.icon}</span>
                  <span className="ol-nav-item__label">{item.label}</span>
                  {active && <span className="ol-nav-item__indicator" />}
                </NavLink>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="ol-actions">
            {/* User Profile */}
            {user && (
              <div className="ol-user-profile" title={user.email}>
                <div className="ol-user-avatar">{userInitial}</div>
                <div className="ol-user-details">
                  <span className="ol-user-name">{user.name || 'Chủ tòa nhà'}</span>
                  <span className="ol-user-role">Chủ tòa nhà</span>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              className="ol-logout-btn"
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              type="button"
            >
              <LogoutOutlined className="ol-logout-btn__icon" />
              <span className="ol-logout-btn__label">Đăng xuất</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              className="ol-mobile-toggle"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              type="button"
            >
              {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </div>

        {/* ── Mobile Drawer ── */}
        {mobileMenuOpen && (
          <div className="ol-mobile-menu">
            <div className="ol-mobile-menu__inner">
              <div className="ol-mobile-menu__header">
                <span className="ol-mobile-menu__label">MENU ĐIỀU HƯỚNG</span>
              </div>

              <div className="ol-mobile-nav">
                {NAV_ITEMS.map((item) => {
                  const active = isNavItemActive(item, location.pathname)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`ol-mobile-nav-item ${active ? 'ol-mobile-nav-item--active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="ol-mobile-nav-item__icon">{item.icon}</span>
                      <span className="ol-mobile-nav-item__label">{item.label}</span>
                      {active && <span className="ol-mobile-nav-item__badge">Đang xem</span>}
                    </NavLink>
                  )
                })}
              </div>

              {user && (
                <div className="ol-mobile-footer">
                  <div className="ol-mobile-user">
                    <div className="ol-user-avatar">{userInitial}</div>
                    <div className="ol-user-details">
                      <span className="ol-user-name">{user.name || 'Chủ tòa nhà'}</span>
                      <span className="ol-user-role">{user.email}</span>
                    </div>
                  </div>
                  <button
                    className="ol-logout-btn ol-logout-btn--mobile"
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogoutOutlined />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content Area ── */}
      <main className="ol-main">
        <div className="ol-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
