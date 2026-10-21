import { Button, Typography } from 'antd'
import { ArrowRightOutlined, BankOutlined, CompassOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { IsometricFloors, SectionLabel } from '../../components/ui/AuroraPrimitives'

const roles = [
  { title: 'Khách tham quan', description: 'Tìm gian hàng và nhận chỉ dẫn trong tòa nhà.', path: '/guest', icon: <CompassOutlined /> },
  { title: 'Chủ gian hàng', description: 'Cập nhật hồ sơ, hình ảnh và chương trình ưu đãi.', path: '/store/profile', icon: <ShopOutlined /> },
  { title: 'Quản lý tòa nhà', description: 'Vận hành tầng, sơ đồ, POI và mạng lưới chỉ đường.', path: '/manager', icon: <TeamOutlined /> },
  { title: 'Chủ tòa nhà', description: 'Theo dõi tài sản và quản lý đội ngũ vận hành.', path: '/owner/dashboard', icon: <BankOutlined /> },
] as const

export function HomePage() {
  const navigate = useNavigate()
  const enter = (path: string) => navigate(path === '/guest' ? path : `/login?redirect=${encodeURIComponent(path)}`)
  return <main className="workspace home-workspace">
    <section className="home-aurora-hero"><div className="home-hero-copy"><SectionLabel>Không gian trong tầm nhìn</SectionLabel><Typography.Title level={1}>Mỗi tầng. Mỗi điểm đến. <span className="gradient-text">Một hướng đi.</span></Typography.Title><Typography.Paragraph>Indoor Spatial biến sơ đồ mặt bằng thành trải nghiệm trực quan cho khách tham quan và một không gian vận hành rõ ràng cho doanh nghiệp.</Typography.Paragraph><div className="home-actions"><Button type="primary" size="large" icon={<CompassOutlined />} onClick={() => navigate('/guest')}>Khám phá bản đồ</Button><Button size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/login')}>Vào không gian quản trị</Button></div><div className="home-hero-meta"><span><strong>2D</strong> bản đồ linh hoạt</span><span><strong>3D</strong> không gian đa tầng</span><span><strong>24/7</strong> sẵn sàng dẫn lối</span></div></div><div className="home-hero-visual"><div className="home-visual-chip">Bản đồ đang hoạt động <span /></div><IsometricFloors /></div></section>
    <section className="home-role-section" aria-label="Vai trò sử dụng hệ thống"><SectionLabel>Bắt đầu theo vai trò</SectionLabel><Typography.Title level={2}>Một nền tảng, bốn góc nhìn</Typography.Title><div className="home-role-grid">{roles.map((role) => <article className="home-role-card" key={role.path}><div className="home-role-icon">{role.icon}</div><Typography.Title level={3}>{role.title}</Typography.Title><Typography.Paragraph>{role.description}</Typography.Paragraph><Button type="link" icon={<ArrowRightOutlined />} onClick={() => enter(role.path)}>{role.path === '/guest' ? 'Khám phá' : 'Đăng nhập'}</Button></article>)}</div></section>
  </main>
}
