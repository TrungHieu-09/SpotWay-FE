import { Button, Dropdown, Layout, Menu, Popconfirm, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { ApartmentOutlined, BankOutlined, CompassOutlined, DashboardOutlined, GiftOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { roleLabel, useAuthStore } from '../../auth/store'
import { BrandLogo } from '../ui/BrandLogo'

const { Content, Footer, Header, Sider } = Layout
const routeTitles = [
  { prefix: '/admin', title: 'Quản trị hệ thống' }, { prefix: '/owner/dashboard', title: 'Tổng quan doanh nghiệp' },
  { prefix: '/owner/staff', title: 'Nhân viên' }, { prefix: '/owner/managers', title: 'Quản lý khu vực' },
  { prefix: '/owner/store-owners', title: 'Chủ gian hàng' }, { prefix: '/owner/subscription', title: 'Gói dịch vụ' },
  { prefix: '/owner/buildings/', title: 'Chi tiết tòa nhà' }, { prefix: '/owner/buildings', title: 'Tòa nhà' },
  { prefix: '/manager', title: 'Quản lý tòa nhà' }, { prefix: '/store/promotions', title: 'Khuyến mãi gian hàng' },
  { prefix: '/store/profile', title: 'Hồ sơ gian hàng' }, { prefix: '/guest', title: 'Bản đồ khách tham quan' },
] as const

type NavItem = Required<MenuProps>['items'][number]

function roleItems(role: string): NavItem[] {
  if (role === 'admin') return [{ type: 'group', label: 'Quản trị', children: [
    { key: '/admin', icon: <DashboardOutlined />, label: 'Tổng quan' }, { key: '/admin/tenants', icon: <BankOutlined />, label: 'Doanh nghiệp & tòa nhà' },
    { key: '/admin/accounts', icon: <TeamOutlined />, label: 'Tài khoản' }, { key: '/admin/plans', icon: <SettingOutlined />, label: 'Gói dịch vụ' },
  ] }]
  if (role === 'building_owner') return [{ type: 'group', label: 'Doanh nghiệp', children: [
    { key: '/owner/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' }, { key: '/owner/buildings', icon: <BankOutlined />, label: 'Tòa nhà' },
    { key: '/owner/staff', icon: <TeamOutlined />, label: 'Nhân viên' }, { key: '/owner/managers', icon: <TeamOutlined />, label: 'Quản lý khu vực' },
    { key: '/owner/store-owners', icon: <ShopOutlined />, label: 'Chủ gian hàng' }, { key: '/owner/subscription', icon: <GiftOutlined />, label: 'Gói dịch vụ' },
    { key: '/manager', icon: <ApartmentOutlined />, label: 'Quản lý tòa nhà' },
  ] }]
  if (role === 'building_manager') return [{ type: 'group', label: 'Vận hành', children: [
    { key: '/manager', icon: <ApartmentOutlined />, label: 'Quản lý tòa nhà' }, { key: '/manager/store-owners', icon: <ShopOutlined />, label: 'Chủ gian hàng' },
  ] }]
  return [{ type: 'group', label: 'Gian hàng', children: [
    { key: '/store/profile', icon: <ShopOutlined />, label: 'Hồ sơ gian hàng' }, { key: '/store/promotions', icon: <GiftOutlined />, label: 'Khuyến mãi' },
  ] }]
}

function PublicShell() {
  const navigate = useNavigate()
  return <Layout className="public-layout"><Header className="public-header"><button className="brand-button" type="button" onClick={() => navigate('/')}><BrandLogo /></button><Space><Button type="text" icon={<CompassOutlined />} onClick={() => navigate('/guest')}>Khách tham quan</Button><Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button></Space></Header><Content><Outlet /></Content><Footer className="public-footer">Indoor Spatial <span>•</span> Bản đồ trong nhà cho doanh nghiệp</Footer></Layout>
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [collapsed, setCollapsed] = useState(false)
  const matchedTitle = routeTitles.find((route) => location.pathname.startsWith(route.prefix))
  const isPublic = !user || location.pathname === '/' || location.pathname.startsWith('/login') || location.pathname.startsWith('/forgot-password') || location.pathname.startsWith('/reset-password') || location.pathname.startsWith('/guest')

  useEffect(() => { document.title = matchedTitle ? `${matchedTitle.title} | Indoor Spatial` : 'Indoor Spatial Management System' }, [matchedTitle])

  const items = useMemo(() => roleItems(user?.role ?? 'building_owner'), [user?.role])
  const activeKey = location.pathname.startsWith('/admin/tenants') ? '/admin/tenants' : location.pathname.startsWith('/admin/accounts') ? '/admin/accounts' : location.pathname.startsWith('/admin/plans') ? '/admin/plans' : location.pathname.startsWith('/admin') ? '/admin' : location.pathname.startsWith('/manager/store-owners') ? '/manager/store-owners' : location.pathname.startsWith('/manager') ? '/manager' : location.pathname.startsWith('/store/promotions') ? '/store/promotions' : location.pathname.startsWith('/store') ? '/store/profile' : location.pathname.startsWith('/owner/dashboard') ? '/owner/dashboard' : location.pathname.startsWith('/owner/staff') ? '/owner/staff' : location.pathname.startsWith('/owner/managers') ? '/owner/managers' : location.pathname.startsWith('/owner/store-owners') ? '/owner/store-owners' : location.pathname.startsWith('/owner/subscription') ? '/owner/subscription' : location.pathname.startsWith('/owner') ? '/owner/buildings' : ''

  if (isPublic) return <PublicShell />

  const profileItems: MenuProps['items'] = [{ key: 'profile', label: `${user.name} · ${roleLabel(user.role)}`, disabled: true }, { type: 'divider' }, { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất' }]
  const handleProfileClick: MenuProps['onClick'] = ({ key }) => { if (key === 'logout') void logout().then(() => navigate('/')) }

  return <Layout className="app-layout"><Sider className="app-sider" collapsible collapsed={collapsed} trigger={null} width={248} collapsedWidth={72}><div className="sider-brand"><BrandLogo compact={collapsed} /></div><Menu mode="inline" selectedKeys={[activeKey]} items={items} onClick={({ key }) => navigate(key)} /><div className="sider-bottom"><Dropdown menu={{ items: profileItems, onClick: handleProfileClick }} placement="topLeft"><button className="user-summary" type="button"><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>{collapsed ? null : <span><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></span>}</button></Dropdown><Button type="text" className="collapse-button" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} /></div></Sider><Layout className="app-main-layout"><Header className="app-topbar"><div><Typography.Text className="topbar-eyebrow">Không gian làm việc</Typography.Text><Typography.Text strong>{matchedTitle?.title ?? 'Indoor Spatial'}</Typography.Text></div><Space><Button type="text" icon={<CompassOutlined />} onClick={() => navigate('/guest')}>Xem bản đồ</Button><Dropdown menu={{ items: profileItems, onClick: handleProfileClick }}><Button className="topbar-user">{user.name}</Button></Dropdown></Space></Header><Content className="app-content"><Outlet /></Content>{import.meta.env.DEV ? <Footer className="app-footer"><Popconfirm title="Đặt lại dữ liệu demo?" description="Toàn bộ dữ liệu mock trong localStorage sẽ trở về seed ban đầu." okText="Đặt lại" cancelText="Hủy" onConfirm={() => { window.__resetMock?.(); window.location.reload() }}><Button type="text">Đặt lại dữ liệu demo</Button></Popconfirm></Footer> : null}</Layout></Layout>
}
