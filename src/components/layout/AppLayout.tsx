import { Button, Layout } from 'antd'
import { HomeOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../../auth/store'
import { clearSession } from '../../api/auth'
import './SpotWayNavbar.css'
import './AppLayout.css'

const { Content, Header } = Layout

interface HeaderNavItem {
  path: string
  label: string
  exact?: boolean
}

const ROLE_NAV_ITEMS: Record<string, HeaderNavItem[]> = {
  admin: [
    { path: '/admin', label: 'Tổng quan', exact: true },
    { path: '/admin/accounts', label: 'Tài khoản' },
    { path: '/admin/profile', label: 'Hồ sơ cá nhân' },
  ],
  building_owner: [
    { path: '/owner/dashboard', label: 'Tổng quan', exact: true },
    { path: '/owner/buildings', label: 'Tòa nhà' },
    { path: '/owner/profile', label: 'Hồ sơ cá nhân' },
  ],
  building_manager: [
    { path: '/manager', label: 'Không gian 2D', exact: true },
    { path: '/manager/store-owners', label: 'Chủ gian hàng' },
    { path: '/manager/profile', label: 'Hồ sơ cá nhân' },
  ],
  store_owner: [
    { path: '/store/profile', label: 'Gian hàng', exact: true },
    { path: '/store/promotions', label: 'Khuyến mãi' },
    { path: '/store/account', label: 'Hồ sơ cá nhân' },
  ],
}

function getProfilePathForRole(role?: string): string {
  switch (role) {
    case 'admin':
      return '/admin/profile'
    case 'building_owner':
      return '/owner/profile'
    case 'building_manager':
      return '/manager/profile'
    case 'store_owner':
      return '/store/account'
    default:
      return '/profile'
  }
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // ignore
    } finally {
      clearSession()
      navigate('/login', { replace: true })
    }
  }

  const isAdmin = user?.role === 'admin'
  const navItems = user?.role ? (ROLE_NAV_ITEMS[user.role] ?? []) : []
  const profilePath = getProfilePathForRole(user?.role)

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        {/* Brand */}
        <Link to="/" className="spw-brand group" title="Về trang chủ SpotWay">
          <div className="spw-brand-icon">
            <div className="spw-brand-icon-inner">
              <span className="material-symbols-outlined">near_me</span>
            </div>
            <span className="spw-brand-ping ping-anim" />
            <span className="spw-brand-ping" />
          </div>
          <div className="flex items-baseline">
            <span className="spw-brand-text">SpotWay</span>
            <span className="spw-brand-sub">{isAdmin ? 'Admin' : 'Spatial OS'}</span>
          </div>
        </Link>

        {/* Role-aware Navigation Bar */}
        {navItems.length > 0 && (
          <nav className="app-nav" aria-label="Workspace Navigation">
            {navItems.map((item) => {
              const active = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`app-nav-item ${active ? 'app-nav-item--active' : ''}`}
                >
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        )}

        <div className="header-actions">
          {/* Back to Home button */}
          <Button
            type="text"
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            className="app-btn-home"
            title="Quay lại trang giới thiệu"
          >
            Trang chủ
          </Button>

          {/* User info if available — Clickable to open Profile */}
          {user && (
            <button
              type="button"
              className="app-header-user app-header-user--clickable"
              title="Bấm để mở Hồ sơ cá nhân (Đổi tên / Đổi mật khẩu)"
              onClick={() => navigate(profilePath)}
            >
              <span className="app-header-user__role">
                {roleLabel(user.role)}
              </span>
              <span className="app-header-user__email">
                {user.name || user.email}
              </span>
              <UserOutlined style={{ fontSize: 12, color: '#5de6ff' }} />
            </button>
          )}

          {/* Logout button */}
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className="app-logout-btn"
            title="Đăng xuất khỏi hệ thống"
          >
            Đăng xuất
          </Button>
        </div>
      </Header>

      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}
