import { Layout, Segmented } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

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
        <div className="brand">
          <ApartmentOutlined />
          <span>Indoor Spatial</span>
        </div>
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
      </Header>

      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}

