import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CloudOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../auth/store'
import './OwnerLayout.css'

const NAV_ITEMS = [
  {
    path: '/owner/dashboard',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
  },
  {
    path: '/owner/buildings',
    icon: <ApartmentOutlined />,
    label: 'Tòa nhà',
  },
  {
    path: '/owner/managers',
    icon: <TeamOutlined />,
    label: 'Quản lý khu vực',
  },
  {
    path: '/owner/store-owners',
    icon: <ShopOutlined />,
    label: 'Chủ gian hàng',
  },
  {
    path: '/owner/subscription',
    icon: <CloudOutlined />,
    label: 'Gói dịch vụ',
  },
]

export function OwnerLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="ol-root">
      {/* ── Sidebar ── */}
      <aside className={`ol-sidebar ${collapsed ? 'ol-sidebar--collapsed' : ''}`}>
        {/* Brand */}
        <div className="ol-brand" onClick={() => navigate('/')}>
          <div className="ol-brand__logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          {!collapsed && <span className="ol-brand__name">SpotWay</span>}
        </div>

        {/* Toggle button */}
        <button
          className="ol-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>

        {/* Nav items */}
        <nav className="ol-nav">
          {!collapsed && (
            <div className="ol-nav__label">MENU</div>
          )}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `ol-nav-item ${isActive ? 'ol-nav-item--active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="ol-nav-item__icon">{item.icon}</span>
              {!collapsed && <span className="ol-nav-item__label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="ol-user">
          {user && (
            <>
              <div className="ol-user__avatar">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="ol-user__info">
                  <div className="ol-user__name">{user.name}</div>
                  <div className="ol-user__role">Chủ tòa nhà</div>
                </div>
              )}
            </>
          )}
          {!collapsed && (
            <button className="ol-logout-btn" onClick={handleLogout} title="Đăng xuất">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ol-main">
        {/* Top bar */}
        <header className="ol-topbar">
          <div className="ol-topbar__breadcrumb">
            <AppstoreOutlined style={{ color: 'var(--sw-violet)', marginRight: 8 }} />
            <span>Building Owner Portal</span>
          </div>
          <div className="ol-topbar__right">
            <div className="ol-live-badge">
              <span className="ol-live-badge__dot" />
              <span>Live</span>
            </div>
            {user && (
              <div className="ol-topbar__user">
                <span>{user.email}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="ol-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
