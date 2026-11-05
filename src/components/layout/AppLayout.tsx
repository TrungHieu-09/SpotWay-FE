import { useEffect, useState } from 'react'
import { Button, Layout } from 'antd'
import { ApartmentOutlined, CompassOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearSession } from '../../api/auth'
import { ThemeToggle } from '../ui'
import { getDemoRole } from './ProtectedRoute'
import './AppLayout.css'

const { Content, Header } = Layout

const OWNER_NAV = [
  { to: '/dashboard', label: 'Tổng quan', icon: <DashboardOutlined /> },
  { to: '/owner/buildings', label: 'Buildings', icon: <ApartmentOutlined /> },
]

export function AppLayout() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const role = getDemoRole()
  const navItems = role === 'building_owner' || role === 'admin' ? OWNER_NAV : []
  const logout = () => { clearSession(); navigate('/login', { replace: true }) }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Layout className="app-layout">
      <Header className={`app-header ${scrolled ? 'app-header--scrolled' : ''}`}>
        <div className="brand">
          <div className="brand-logo">
            <CompassOutlined />
          </div>
          <span className="brand-name">SpotWay</span>
        </div>

        {navItems.length > 0 && (
          <nav className="nav-pill" aria-label="Điều hướng chính">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end className="nav-pill__link">
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="header-actions">
          <ThemeToggle />
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
            <span className="header-actions__label">Đăng xuất</span>
          </Button>
        </div>
      </Header>

      <Content className={navItems.length > 0 ? 'app-content--has-dock' : undefined}>
        <Outlet />
      </Content>

      {navItems.length > 0 && (
        <nav className="bottom-nav" aria-label="Điều hướng chính (mobile)">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end className="bottom-nav__link">
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </Layout>
  )
}
