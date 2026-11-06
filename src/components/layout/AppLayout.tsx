import { Button, Layout } from 'antd'
import { HomeOutlined, LogoutOutlined } from '@ant-design/icons'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { clearSession } from '../../api/auth'
import './SpotWayNavbar.css'
import './AppLayout.css'

const { Content, Header } = Layout

const ADMIN_NAV_ITEMS = [
  { path: '/admin', label: 'Tổng quan' },
  { path: '/admin/accounts', label: 'Tài khoản' },
]

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

        {/* Admin Navigation Bar if logged in as Admin */}
        {isAdmin && (
          <nav className="app-nav" aria-label="Admin Navigation">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active =
                item.path === '/admin'
                  ? location.pathname === '/admin'
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

          {/* User info if available */}
          {user && (
            <div className="app-header-user" title={user.email}>
              <span className="app-header-user__role">
                {user.role === 'admin' ? 'Admin' : user.role}
              </span>
              <span className="app-header-user__email">{user.email}</span>
            </div>
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
