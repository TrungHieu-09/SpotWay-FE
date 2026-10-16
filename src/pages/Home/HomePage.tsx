import { Button, Typography } from 'antd'
import { ArrowRightOutlined, BankOutlined, CompassOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { FloorPlanIllustration } from '../../components/ui/FloorPlanIllustration'

const roles = [
  { title: 'Khách tham quan', description: 'Tìm gian hàng và nhận chỉ dẫn trong tòa nhà.', path: '/guest', icon: <CompassOutlined /> },
  { title: 'Chủ gian hàng', description: 'Cập nhật hồ sơ, hình ảnh và chương trình ưu đãi.', path: '/store/profile', icon: <ShopOutlined /> },
  { title: 'Quản lý tòa nhà', description: 'Vận hành tầng, sơ đồ, POI và mạng lưới chỉ đường.', path: '/manager', icon: <TeamOutlined /> },
  { title: 'Chủ tòa nhà', description: 'Theo dõi tài sản và quản lý đội ngũ vận hành.', path: '/owner/dashboard', icon: <BankOutlined /> },
] as const

const features = [
  { title: 'Số hóa không gian', text: 'Từ sơ đồ 2D đến mô hình đa tầng, dữ liệu không gian được quản lý tập trung và dễ cập nhật.' },
  { title: 'Chỉ đường nhiều tầng', text: 'Kết nối POI, node và thang máy để khách tham quan luôn biết bước tiếp theo.' },
  { title: 'Quản trị đa doanh nghiệp', text: 'Một nền tảng rõ ràng cho chủ tòa nhà, quản lý vận hành và chủ gian hàng.' },
] as const

export function HomePage() {
  const navigate = useNavigate()
  const enter = (path: string) => navigate(path === '/guest' ? path : `/login?redirect=${encodeURIComponent(path)}`)
  return <main className="workspace home-workspace">
    <section className="home-hero-layout"><div className="home-hero-copy"><div className="eyebrow">Nền tảng bản đồ trong nhà</div><Typography.Title level={1}>Dẫn lối trong từng không gian.</Typography.Title><Typography.Paragraph>Quản lý tòa nhà, tầng, gian hàng và trải nghiệm tìm đường trong một không gian số thống nhất.</Typography.Paragraph><div className="home-actions"><Button type="primary" size="large" icon={<CompassOutlined />} onClick={() => navigate('/guest')}>Khám phá bản đồ</Button><Button size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/login')}>Đăng nhập quản trị</Button></div></div><div className="home-illustration"><FloorPlanIllustration /></div></section>
    <section className="role-columns" aria-label="Vai trò sử dụng hệ thống">{roles.map((role) => <div className="role-column" key={role.path}>{role.icon}<Typography.Title level={3}>{role.title}</Typography.Title><Typography.Paragraph>{role.description}</Typography.Paragraph><Button type="link" icon={<ArrowRightOutlined />} onClick={() => enter(role.path)}>{role.path === '/guest' ? 'Khám phá' : 'Đăng nhập'}</Button></div>)}</section>
    <section className="home-feature-list">{features.map((feature) => <div className="home-feature-row" key={feature.title}><div className="home-feature-copy"><Typography.Title level={2}>{feature.title}</Typography.Title><Typography.Paragraph>{feature.text}</Typography.Paragraph></div><div className="home-feature-visual"><FloorPlanIllustration /></div></div>)}</section>
  </main>
}
