import { Button, Layout } from 'antd'
import { CompassOutlined, LogoutOutlined } from '@ant-design/icons'
import { Outlet, useNavigate } from 'react-router-dom'
import { clearSession } from '../../api/auth'
import './AppLayout.css'

const { Content, Header } = Layout

export function AppLayout() {
  const navigate = useNavigate()
  const logout = () => { clearSession(); navigate('/login', { replace: true }) }

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        {/* Brand */}
        <div className="brand">
          <div className="brand-logo">
            <CompassOutlined />
          </div>
          <div className="brand-text">
            <span className="brand-name">SpotWay</span>
            <span className="brand-tagline">Indoor Spatial</span>
          </div>
        </div>

        <div className="header-actions">
          <div className="header-status"><span className="header-status__dot" /><span className="header-status__text">Live</span></div>
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>Đăng xuất</Button>
        </div>
      </Header>

      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}
