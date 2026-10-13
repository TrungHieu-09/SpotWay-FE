import { Layout, Segmented } from 'antd'
import { CompassOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import './AppLayout.css'

const { Content, Header } = Layout

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePath = location.pathname.startsWith('/manager')
    ? '/manager'
    : '/owner/buildings'

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

        {/* Nav switcher */}
        <Segmented
          value={activePath}
          onChange={(value) => {
            const nextPath = String(value)
            window.localStorage.setItem(
              'demoRole',
              nextPath === '/manager' ? 'building_manager' : 'building_owner',
            )
            navigate(nextPath)
          }}
          options={[
            { label: 'Building Owner', value: '/owner/buildings' },
            { label: 'Building Manager', value: '/manager' },
          ]}
        />

        {/* Header right: decorative indicator */}
        <div className="header-status">
          <span className="header-status__dot" />
          <span className="header-status__text">Live</span>
        </div>
      </Header>

      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}
