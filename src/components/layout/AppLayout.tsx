import { useEffect } from 'react'
import { Button, Layout, Popconfirm, Segmented } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Content, Footer, Header } = Layout

const routeTitles = [
  { prefix: '/owner/buildings/', title: 'Chi tiết tòa nhà' },
  { prefix: '/owner/buildings', title: 'Chủ tòa nhà' },
  { prefix: '/manager', title: 'Quản lý tòa nhà' },
  { prefix: '/store/profile', title: 'Hồ sơ gian hàng' },
  { prefix: '/guest', title: 'Bản đồ khách tham quan' },
] as const

function roleForPath(path: string) {
  if (path === '/manager') {
    return 'building_manager'
  }

  if (path === '/store/profile') {
    return 'store_owner'
  }

  if (path === '/guest') {
    return 'guest'
  }

  return 'building_owner'
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePath = location.pathname.startsWith('/manager')
    ? '/manager'
    : location.pathname.startsWith('/store')
      ? '/store/profile'
      : location.pathname.startsWith('/guest')
        ? '/guest'
        : location.pathname.startsWith('/owner')
          ? '/owner/buildings'
          : '/'

  useEffect(() => {
    const matchedTitle = routeTitles.find((route) =>
      location.pathname.startsWith(route.prefix),
    )
    document.title = matchedTitle
      ? `${matchedTitle.title} | Indoor Spatial`
      : 'Indoor Spatial Management System'
  }, [location.pathname])

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <button
          className="brand brand-button"
          type="button"
          onClick={() => navigate('/')}
        >
          <ApartmentOutlined />
          <span>Indoor Spatial</span>
        </button>
        <Segmented
          value={activePath === '/' ? undefined : activePath}
          onChange={(value) => {
            const nextPath = String(value)
            window.localStorage.setItem('demoRole', roleForPath(nextPath))
            navigate(nextPath)
          }}
          options={[
            { label: 'Chủ tòa nhà', value: '/owner/buildings' },
            { label: 'Quản lý tòa nhà', value: '/manager' },
            { label: 'Chủ gian hàng', value: '/store/profile' },
            { label: 'Khách tham quan', value: '/guest' },
          ]}
        />
      </Header>

      <Content>
        <Outlet />
      </Content>

      {import.meta.env.DEV ? (
        <Footer className="app-footer">
          <Popconfirm
            title="Đặt lại dữ liệu demo?"
            description="Toàn bộ dữ liệu mock trong localStorage sẽ trở về seed ban đầu."
            okText="Đặt lại"
            cancelText="Hủy"
            onConfirm={() => {
              window.__resetMock?.()
              window.location.reload()
            }}
          >
            <Button>Đặt lại dữ liệu demo</Button>
          </Popconfirm>
        </Footer>
      ) : null}
    </Layout>
  )
}

