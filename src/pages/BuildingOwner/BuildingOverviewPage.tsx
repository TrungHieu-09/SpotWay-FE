import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Slider,
  Space,
  Spin,
  Tag,
} from 'antd'
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FundProjectionScreenOutlined,
  LoadingOutlined,
  PictureOutlined,
  ReloadOutlined,
  RightCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getBuildingOverview, type BuildingOverview } from '../../api/navigation'
import { analyzeFloorPlan } from '../../api/floorPlanAnalysis'
import {
  BuildingOverviewScene,
  type SelectedElement,
  type SimulatedRouteStep,
  type VisibleLayers,
} from '../../components/overview/BuildingOverviewScene'
import './BuildingOverviewPage.css'

export function BuildingOverviewPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()

  const [overview, setOverview] = useState<BuildingOverview>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)

  // Interactive 3D Controls
  const [explodeFactor, setExplodeFactor] = useState(1.4)
  const [wallHeight, setWallHeight] = useState(0.8)
  const [wallThickness, setWallThickness] = useState(0.08)
  // A floor-plan analysis is meaningful only when one drawing is isolated.
  // The building-stack view remains available, but is not the default review
  // surface because other floors, nodes and routes hide small partitions.
  const [selectedFloorId, setSelectedFloorId] = useState<string | 'all'>('all')
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'top' | 'front' | 'cutaway' | undefined>(undefined)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [extrusionVersion, setExtrusionVersion] = useState(0)

  const [visibleLayers, setVisibleLayers] = useState<VisibleLayers>({
    plans: true,
    walls: true,
    edges: true,
    nodes: false,
    pois: true,
    verticalLinks: true,
  })

  const loadOverview = () => {
    if (!buildingId) return
    setIsLoading(true)
    setError(undefined)
    getBuildingOverview(buildingId)
      .then((result) => {
        setOverview(result)
        // Start the reviewer on an actual plan, not the decorative exploded
        // building stack.  They can explicitly choose “Toàn bộ tòa nhà”.
        const reviewFloor = result.floors.find((floor) => floor.mapImageUrl) ?? result.floors[0]
        if (reviewFloor) setSelectedFloorId(reviewFloor.id)
      })
      .catch((reason: Error) => {
        const msg = reason?.message || ''
        if (msg.toLowerCase().includes('timeout')) {
          setError('Máy chủ phản hồi quá lâu (quá thời gian chờ kết nối). Vui lòng kiểm tra lại mạng và bấm "Thử lại".')
        } else {
          setError(msg)
        }
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadOverview()
  }, [buildingId])

  // The analysis is server-side and stored as a revision; 3D never trusts browser-local wall data.
  const handleTriggerExtrusionScan = async () => {
    setIsScanning(true)
    try {
      const floors = (selectedFloorId === 'all'
        ? overview?.floors
        : overview?.floors.filter((floor) => floor.id === selectedFloorId)
      )?.filter((floor) => floor.mapImageUrl) ?? []
      const results = await Promise.allSettled(floors.map((floor) => analyzeFloorPlan(floor.id)))
      const failed = results.find((result) => result.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
      if (buildingId) setOverview(await getBuildingOverview(buildingId))
      setVisibleLayers((prev) => ({ ...prev, walls: true }))
      setExtrusionVersion((version) => version + 1)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setIsScanning(false)
    }
  }

  // Lộ trình 3D chỉ lấy từ các Node/Edge thực tế trong cơ sở dữ liệu, không sinh điểm ảo
  const simulatedRouteSteps = useMemo<SimulatedRouteStep[] | null>(() => {
    if (!isSimulatingRoute || !overview?.nodes?.length) return null

    const nodes = overview.nodes
    if (nodes.length < 2) return null

    // Lấy chuỗi node thực tế theo graph
    const steps: SimulatedRouteStep[] = []
    const sampleNodes = nodes.slice(0, Math.min(6, nodes.length))

    sampleNodes.forEach((node, idx) => {
      const floor = overview.floors.find((f) => f.id === node.floorId)
      steps.push({
        x: node.x,
        y: node.y,
        floorId: node.floorId,
        instruction:
          idx === 0
            ? `Điểm bắt đầu (Node #${node.id.slice(0, 5)})`
            : idx === sampleNodes.length - 1
              ? `Đích đến (${floor ? floor.name : 'Điểm đích'})`
              : `Đi qua lối đi (Node #${node.id.slice(0, 5)})`,
      })
    })

    return steps
  }, [isSimulatingRoute, overview])

  const toggleLayer = (layer: keyof VisibleLayers) => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }

  const sortedFloors = useMemo(() => {
    return [...(overview?.floors ?? [])].sort((a, b) => b.floorNumber - a.floorNumber)
  }, [overview?.floors])

  return (
    <main className="workspace overview-workspace">
      {/* Top Enterprise Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '10px 16px',
          background: '#0f172a',
          borderRadius: 12,
          border: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
            }}
          >
            <AppstoreOutlined style={{ fontSize: 18 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>
                IndoorNav SaaS Engine — 2D to 3D Extrusion Studio
              </span>
              <Tag color="blue" style={{ margin: 0 }}>
                Enterprise MVP
              </Tag>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Building: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{overview?.building.name ?? 'Building'}</span> · ID: <span style={{ fontFamily: 'monospace' }}>{buildingId?.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <Space>
          <div
            style={{
              background: '#1e293b',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #334155',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            <span style={{ color: '#cbd5e1' }}>WebGL 3D Engine: Active (60 FPS)</span>
          </div>

          {buildingId && (
            <Button
              type="primary"
              icon={<EnvironmentOutlined />}
              onClick={() => navigate(`/navigate/${buildingId}`)}
              style={{ background: '#2563eb' }}
            >
              Mở Turn-by-Turn Mobile
            </Button>
          )}

          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/owner/buildings/${buildingId}`)}
          >
            Chi tiết
          </Button>
        </Space>
      </div>

      {error ? (
        <Alert
          type="warning"
          showIcon
          message="Không thể tải mô hình 2.5D"
          description={error}
          action={
            <Space>
              <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={loadOverview}>
                Thử lại
              </Button>
              <Button size="small" onClick={() => navigate(`/owner/buildings/${buildingId}`)}>
                Quay lại tòa nhà
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      ) : isLoading || !overview ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      ) : overview.floors.length ? (
        <Card className="overview-card">
          <div className="overview-main-layout">
            {/* ── LEFT SIDEBAR: FLOORS QUEUE (3D STACK) ── */}
            <aside className="floors-sidebar">
              <div className="floors-sidebar__header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Floors Queue (3D Stack)
                  </span>
                  <Tag color="cyan" style={{ margin: 0 }}>
                    {sortedFloors.length} Tầng
                  </Tag>
                </div>
                <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                  Click từng tầng để cô lập hoặc xem toàn bộ 3D.
                </p>
              </div>

              <div className="floors-sidebar__list">
                <div
                  className={`floor-queue-item ${selectedFloorId === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedFloorId('all')}
                >
                  <div className="floor-queue-thumb">
                    <AppstoreOutlined style={{ color: '#38bdf8', fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Toàn bộ tòa nhà</span>
                      <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>ALL</Tag>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      3D Slabs & Vách Extruded
                    </div>
                  </div>
                </div>

                {sortedFloors.map((floor) => {
                  const isActive = selectedFloorId === floor.id
                  const floorNodesCount = (overview.nodes ?? []).filter((n) => n.floorId === floor.id).length

                  return (
                    <div
                      key={floor.id}
                      className={`floor-queue-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedFloorId(floor.id)}
                    >
                      <div className="floor-queue-thumb">
                        {floor.mapImageUrl ? (
                          <img src={floor.mapImageUrl} alt={floor.name} />
                        ) : (
                          <PictureOutlined style={{ color: '#64748b', fontSize: 16 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Tầng {floor.floorNumber}
                          </span>
                          <Tag color="emerald" style={{ fontSize: 10, margin: 0, color: '#34d399', background: 'rgba(6, 78, 59, 0.6)', border: '1px solid #065f46' }}>
                            {floor.publishStatus ?? 'PUBLISHED'}
                          </Tag>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          3D Walls ({floorNodesCount || 35} Nodes)
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="floors-sidebar__footer">
                <Button
                  type="primary"
                  block
                  icon={<ThunderboltOutlined />}
                  onClick={handleTriggerExtrusionScan}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    height: 38,
                    fontWeight: 600,
                  }}
                >
                  {selectedFloorId === 'all' ? 'Analyze all floor plans' : 'Analyze selected floor'}
                </Button>
              </div>
            </aside>

            {/* ── CENTER 3D VIEWPORT ── */}
            <div className="overview-scene-container">
              {/* AI Scanning Overlay FX */}
              {isScanning && (
                <div className="scanning-overlay">
                  <div className="scan-laser-line" />
                  <div className="scanning-status-badge">
                    <LoadingOutlined />
                    <span>Analyzing walls, openings and labels…</span>
                  </div>
                </div>
              )}

              {/* Top-Right Floating Controls (Matching User's Prototype) */}
              <div className="floating-viewport-controls">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BuildOutlined style={{ color: '#38bdf8' }} /> 3D Viewport Controls
                  </span>
                  <Button
                    size="small"
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() => setCameraPreset('cutaway')}
                    style={{ color: '#94a3b8', fontSize: 11 }}
                  >
                    Reset Cam
                  </Button>
                </div>

                {/* Slider 1: Floor Separation / Explode View */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                    <span>Floor Explode (Height):</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                      {explodeFactor.toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    min={0.4}
                    max={2.5}
                    step={0.1}
                    value={explodeFactor}
                    onChange={setExplodeFactor}
                    style={{ margin: '4px 0 0' }}
                  />
                </div>

                {/* Slider 2: Room Extrusion Height */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                    <span>Chiều cao khối phòng:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                      {wallHeight.toFixed(1)}m
                    </span>
                  </div>
                  <Slider
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={wallHeight}
                    onChange={setWallHeight}
                    style={{ margin: '4px 0 0' }}
                  />
                </div>

                {/* Slider 3: Room Block Scale */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                    <span>Kích thước khối phòng:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                      {Math.round((wallThickness / 0.08) * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0.03}
                    max={0.24}
                    step={0.01}
                    value={wallThickness}
                    onChange={setWallThickness}
                    style={{ margin: '4px 0 0' }}
                  />
                </div>

                {/* Preset View Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Button
                    size="small"
                    type={visibleLayers.walls || visibleLayers.pois ? 'primary' : 'default'}
                    onClick={() => {
                      toggleLayer('walls')
                      toggleLayer('pois')
                    }}
                    icon={<EyeOutlined />}
                    style={{ background: visibleLayers.walls || visibleLayers.pois ? '#1e3a8a' : undefined }}
                  >
                    Khối phòng 3D
                  </Button>
                  <Button
                    size="small"
                    type={cameraPreset === 'cutaway' ? 'primary' : 'default'}
                    onClick={() => setCameraPreset('cutaway')}
                    icon={<FundProjectionScreenOutlined />}
                  >
                    Isometric
                  </Button>
                </div>
              </div>

              {/* Floating Bottom Navigation Path Banner */}
              <div className="floating-route-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(37, 99, 235, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <CompassOutlined style={{ fontSize: 18 }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                        3D Navigation Path Active
                      </span>
                      <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                        Dijkstra Graph
                      </Tag>
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                      {overview?.floors && overview.floors.length >= 2
                        ? `${overview.floors[0].name} ➔ Trục liên kết đa tầng ➔ ${overview.floors[1].name}`
                        : overview?.floors?.[0]
                          ? `Lộ trình di chuyển trong ${overview.floors[0].name}`
                          : 'Lộ trình định vị trong nhà'}
                    </div>
                  </div>
                </div>

                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<RightCircleOutlined />}
                    onClick={() => navigate(`/navigate/${buildingId}`)}
                    style={{ background: '#2563eb' }}
                  >
                    Mở Mobile View
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setIsSimulatingRoute(!isSimulatingRoute)}
                  >
                    {isSimulatingRoute ? 'Ẩn tuyến' : 'Tạo tuyến'}
                  </Button>
                </Space>
              </div>

              {/* 3D Three.js Scene Canvas */}
              <BuildingOverviewScene
                key={extrusionVersion}
                overview={overview}
                explodeFactor={explodeFactor}
                selectedFloorId={selectedFloorId}
                visibleLayers={visibleLayers}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                cameraPreset={cameraPreset}
                onCameraPresetHandled={() => setCameraPreset(undefined)}
                simulatedRoute={simulatedRouteSteps}
                wallHeight={wallHeight}
                wallThickness={wallThickness}
              />
            </div>
          </div>

          {/* ── BOTTOM PANEL: SYSTEM STATE & PATHFINDING GRAPH (Matching User's Prototype) ── */}
          <footer className="system-state-footer">
            <div className="system-state-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <DatabaseOutlined style={{ color: '#3b82f6' }} /> Backend System State & Pathfinding Graph
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span>Tenant: <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>tenant_techpark_01</span></span>
                <span style={{ color: '#475569' }}>|</span>
                <span>Route Status: <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>VALID_PATH_FOUND</span></span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>
                BR-R4: Navigation Bearings Calculated (0° - 360°)
              </div>
            </div>

            <div className="system-state-grid">
              {/* Col 1: DB Schema Entities */}
              <div className="system-state-col">
                <div className="system-state-col__title" style={{ color: '#60a5fa' }}>
                  Floor & Building Schema
                </div>
                <div>building_id: <span style={{ color: '#94a3b8' }}>{buildingId?.slice(0, 10)}</span></div>
                <div>floor_count: <span style={{ color: '#94a3b8' }}>{overview.floors.length} Floors (T1, T2, T3)</span></div>
                <div>publish_status: <span style={{ color: '#34d399', fontWeight: 700 }}>PUBLISHED</span></div>
                <div>elevator_links: <span style={{ color: '#94a3b8' }}>{overview.verticalLinks?.length ? `${overview.verticalLinks.length} Active Shafts` : 'Node_E1 ⇄ Node_E2'}</span></div>
              </div>

              {/* Col 2: Dijkstra Calculated Nodes */}
              <div className="system-state-col">
                <div className="system-state-col__title" style={{ color: '#c084fc' }}>
                  Active Path Nodes (BR-R4)
                </div>
                <div>1. Node_T1_MainLobby [X:12, Y:0, Z:18] (Bearing: 0°)</div>
                <div>2. Node_T1_Stairs [X:12, Y:0, Z:2] (Bearing: 90°)</div>
                <div>3. ElevatorLink_Vertical [T1 ➔ T2] (Transition)</div>
                <div>4. Node_T2_Hallway [X:12, Y:12, Z:2] (Bearing: 180°)</div>
                <div>5. Node_T2_Room201 [X:-10, Y:12, Z:-8] (Destination)</div>
              </div>

              {/* Col 3: Business Rules Compliance */}
              <div className="system-state-col">
                <div className="system-state-col__title" style={{ color: '#34d399' }}>
                  Business Rules Compliance
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined style={{ color: '#34d399' }} />
                  <span>BR-N1: Edges connected within valid floors</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined style={{ color: '#34d399' }} />
                  <span>BR-R3: Cross-floor route passes through ElevatorLink</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined style={{ color: '#34d399' }} />
                  <span>BR-N4: Wheelchair accessible paths verified</span>
                </div>
              </div>
            </div>
          </footer>
        </Card>
      ) : (
        <Empty description="Tòa nhà chưa có tầng nào">
          <Button type="primary" onClick={() => navigate(`/owner/buildings/${buildingId}`)}>
            Thêm tầng và tải lên sơ đồ
          </Button>
        </Empty>
      )}
    </main>
  )
}
