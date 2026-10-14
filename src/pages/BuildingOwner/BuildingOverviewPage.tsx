import { ArrowLeftOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBuildingOverview, type BuildingOverview } from '../../api/navigation'
import { BuildingOverviewScene } from '../../components/overview/BuildingOverviewScene'
import './BuildingOverviewPage.css'

export function BuildingOverviewPage() {
  const { buildingId } = useParams<{ buildingId: string }>(); const navigate = useNavigate(); const [overview, setOverview] = useState<BuildingOverview>(); const [error, setError] = useState<string>()
  useEffect(() => { if (buildingId) getBuildingOverview(buildingId).then(setOverview).catch((reason: Error) => setError(reason.message)) }, [buildingId])
  return <main className="workspace overview-workspace"><Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button><Typography.Title level={2}>Tổng quan Building 2.5D</Typography.Title><Typography.Paragraph type="secondary">Kéo để xoay, cuộn để zoom. Mỗi mặt phẳng là một Floor đã publish.</Typography.Paragraph>{error ? <Alert type="warning" message={error} description="Building phải ACTIVE và các Floor cần PUBLISHED để xuất hiện trong overview." /> : !overview ? <Spin size="large" /> : overview.floors.length ? <Card className="overview-card"><div className="overview-scene"><BuildingOverviewScene overview={overview} /></div></Card> : <Empty description="Chưa có Floor đã publish" />}</main>
}
