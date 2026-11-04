import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChartOutlined,
  BankOutlined,
  CrownOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CompassOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../auth/store'
import './AdminLayout.css'

interface NavItem {
  path: string
  icon: React.ReactNode
  label: string
  exactMatch?: boolean
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    path: '/admin',
    icon: <BarChartOutlined />,
    label: 'Tổng quan',
    exactMatch: true,
  },
  {
    path: '/admin/tenants',
    icon: <BankOutlined />,
    label: 'Doanh nghiệp',
  },
  {
    path: '/admin/plans',
    icon: <CrownOutlined />,
    label: 'Gói dịch vụ',
  },
  {
    path: '/admin/accounts',
    icon: <TeamOutlined />,
    label: 'Tài khoản',
  },
]

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exactMatch) return pathname === item.path
  return pathname.startsWith(item.path)
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const userInitial = (user?.name || user?.email || 'A').slice(0, 1).toUpperCase()

  return (
    <div className="adm-root">
      {/* ── Ambient Glow ── */}
      <div className="adm-ambient" aria-hidden="true">
        <div className="adm-ambient__glow adm-ambient__glow--violet" />
        <div className="adm-ambient__glow adm-ambient__glow--cyan" />
      </div>

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar ${collapsed ? 'adm-sidebar--collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="adm-sidebar__header">
          <div
            className="adm-brand"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            title="Về trang chủ SpotWay"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/')
            }}
          >
            <div className="adm-brand__logo">
              <CompassOutlined />
            </div>
            {!collapsed && (
              <div className="adm-brand__meta">
                <span className="adm-brand__name">SpotWay</span>
                <span className="adm-brand__badge">Quản trị hệ thống</span>
              </div>
            )}
          </div>

          <button
            className="adm-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            type="button"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="adm-nav" aria-label="Admin Navigation">
          <div className="adm-nav__section-label">
            {!collapsed && <span>ĐIỀU HƯỚNG</span>}
          </div>
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isActive(item, location.pathname)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`adm-nav-item ${active ? 'adm-nav-item--active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="adm-nav-item__icon">{item.icon}</span>
                {!collapsed && <span className="adm-nav-item__label">{item.label}</span>}
                {active && <span className="adm-nav-item__indicator" />}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="adm-sidebar__footer">
          {/* Back to Home */}
          <button
            className="adm-footer-btn"
            onClick={() => navigate('/')}
            title="Về trang chủ"
            type="button"
          >
            <HomeOutlined />
            {!collapsed && <span>Trang chủ</span>}
          </button>

          {/* User Profile */}
          {user && (
            <div className={`adm-user ${collapsed ? 'adm-user--collapsed' : ''}`} title={user.email}>
              <div className="adm-user__avatar">{userInitial}</div>
              {!collapsed && (
                <div className="adm-user__info">
                  <span className="adm-user__name">{user.name || 'Quản trị viên'}</span>
                  <span className="adm-user__role">Admin</span>
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            className="adm-logout-btn"
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
      <div className="adm-main">
        {/* Top bar */}
        <header className="adm-topbar">
          <div className="adm-topbar__left">
            <span className="adm-topbar__title">
              {ADMIN_NAV_ITEMS.find((item) => isActive(item, location.pathname))?.label ?? 'Quản trị'}
            </span>
          </div>
          <div className="adm-topbar__right">
            <div className="adm-topbar__badge">
              <span className="adm-topbar__dot" />
              <span>Hệ thống hoạt động</span>
            </div>
            {user && (
              <div className="adm-topbar__user" title={user.email}>
                <span className="adm-topbar__user-avatar">{userInitial}</span>
                <span className="adm-topbar__user-name">{user.name || 'Admin'}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="adm-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
