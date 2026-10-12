import { Button, Card, Typography } from 'antd'
import {
  BankOutlined,
  CompassOutlined,
  HomeOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Paragraph, Text, Title } = Typography

const roleCards = [
  {
    title: 'Khách tham quan',
    role: 'guest',
    path: '/guest',
    icon: <CompassOutlined />,
    description: 'Xem bản đồ trong nhà, chọn điểm đến và theo dõi chỉ dẫn 2D/3D.',
  },
  {
    title: 'Chủ gian hàng',
    role: 'store_owner',
    path: '/store/profile',
    icon: <ShopOutlined />,
    description: 'Quản lý hồ sơ, logo, hình ảnh và trạng thái gian hàng.',
  },
  {
    title: 'Quản lý tòa nhà',
    role: 'building_manager',
    path: '/manager',
    icon: <TeamOutlined />,
    description: 'Quản lý tầng, POI, gian hàng, nhận diện sơ đồ và bản xem 3D.',
  },
  {
    title: 'Chủ tòa nhà',
    role: 'building_owner',
    path: '/owner/buildings',
    icon: <BankOutlined />,
    description: 'Theo dõi danh sách tòa nhà, tạo tòa nhà mới và xem chi tiết.',
  },
] as const

export function HomePage() {
  const navigate = useNavigate()

  function enterRole(role: string, path: string) {
    window.localStorage.setItem('demoRole', role)
    navigate(path)
  }

  return (
    <main className="workspace home-workspace">
      <section className="home-hero">
        <Text type="secondary">Indoor Spatial Management System</Text>
        <Title level={1}>Quản lý bản đồ số trong nhà đa khách hàng</Title>
        <Paragraph>
          Một giao diện thống nhất để quản lý tòa nhà, tầng, gian hàng,
          POI và trải nghiệm tìm đường cho khách tham quan.
        </Paragraph>
      </section>

      <section className="home-role-grid">
        {roleCards.map((card) => (
          <Card className="tool-card home-role-card" key={card.path}>
            <div className="home-role-icon">{card.icon}</div>
            <Title level={3}>{card.title}</Title>
            <Paragraph>{card.description}</Paragraph>
            <Button
              type="primary"
              icon={<HomeOutlined />}
              onClick={() => enterRole(card.role, card.path)}
            >
              Vào màn hình
            </Button>
          </Card>
        ))}
      </section>
    </main>
  )
}
