import { Button, Dropdown, Layout, Popconfirm, Space } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { roleLabel, useAuthStore } from '../../auth/store'

const { Content, Footer, Header } = Layout

const routeTitles = [
  { prefix: '/admin', title: 'Quản trị hệ thống' },
  { prefix: '/owner/dashboard', title: 'Tổng quan doanh nghiệp' },
  { prefix: '/owner/staff', title: 'Nhân viên' },
  { prefix: '/owner/managers', title: 'Quản lý khu vực' },
  { prefix: '/owner/store-owners', title: 'Chủ gian hàng' },
  { prefix: '/owner/subscription', title: 'Gói dịch vụ' },
  { prefix: '/owner/buildings/', title: 'Chi tiết tòa nhà' },
  { prefix: '/owner/buildings', title: 'Chủ tòa nhà' },
  { prefix: '/manager', title: 'Quản lý tòa nhà' },
  { prefix: '/store/profile', title: 'Hồ sơ gian hàng' },
  { prefix: '/guest', title: 'Bản đồ khách tham quan' },
] as const

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const activePath = location.pathname.startsWith('/manager')
    ? '/manager'
    : location.pathname.startsWith('/store')
      ? '/store/profile'
      : location.pathname.startsWith('/guest')
        ? '/guest'
        : location.pathname.startsWith('/owner/dashboard')
          ? '/owner/dashboard'
          : location.pathname.startsWith('/owner/staff')
            ? '/owner/staff'
            : location.pathname.startsWith('/owner/managers')
              ? '/owner/managers'
              : location.pathname.startsWith('/owner/store-owners')
                ? '/owner/store-owners'
            : location.pathname.startsWith('/owner/subscription')
              ? '/owner/subscription'
              : location.pathname.startsWith('/owner')
                ? '/owner/buildings'
          : '/'

  const matchedTitle = routeTitles.find((route) => location.pathname.startsWith(route.prefix))
  useEffect(() => {
    document.title = matchedTitle
      ? `${matchedTitle.title} | Indoor Spatial`
      : 'Indoor Spatial Management System'
  }, [matchedTitle])

  const links = [
    { label: 'Khách tham quan', path: '/guest' },
    ...(user?.role === 'admin' ? [{ label: 'Quản trị hệ thống', path: '/admin' }] : []),
    ...(user?.role === 'building_owner'
      ? [
          { label: 'Tổng quan', path: '/owner/dashboard' },
          { label: 'Tòa nhà', path: '/owner/buildings' },
          { label: 'Nhân viên', path: '/owner/staff' },
          { label: 'Quản lý khu vực', path: '/owner/managers' },
          { label: 'Chủ gian hàng', path: '/owner/store-owners' },
          { label: 'Gói dịch vụ', path: '/owner/subscription' },
          { label: 'Quản lý tòa nhà', path: '/manager' },
        ]
      : []),
    ...(user?.role === 'building_manager' ? [{ label: 'Quản lý tòa nhà', path: '/manager' }] : []),
    ...(user?.role === 'store_owner' ? [{ label: 'Chủ gian hàng', path: '/store/profile' }] : []),
  ]

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
        <Space wrap>
          {links.map((link) => (
            <Button
              key={link.path}
              type={activePath === link.path ? 'primary' : 'text'}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </Button>
          ))}
          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'role', label: `${user.name} — ${roleLabel(user.role)}`, disabled: true },
                  { key: 'logout', label: 'Đăng xuất', onClick: () => logout().then(() => navigate('/')) },
                ],
              }}
            >
              <Button>{user.name}</Button>
            </Dropdown>
          ) : (
            <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button>
          )}
        </Space>
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

