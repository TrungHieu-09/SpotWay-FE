import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Select,
  Segmented,
  Space,
  Spin,
  Statistic,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClearOutlined,
  CompassOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { MapViewer2D } from './MapViewer2D'
import { useGuestMapStore } from '../../store/useGuestMapStore'
import type { RouteStep } from '../../types/route'

const { Text, Title } = Typography
const Map3DViewer = lazy(() => import('../../components/map3d/Map3DViewer'))

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes} phút ${remainingSeconds} giây` : `${seconds} giây`
}

function stepIcon(type: RouteStep['type']) {
  if (type === 'elevator') {
    return 'EL'
  }

  if (type === 'arrive') {
    return 'OK'
  }

  return 'GO'
}

export function GuestMapPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [focusNonce, setFocusNonce] = useState(0)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const buildings = useGuestMapStore((state) => state.buildings)
  const floors = useGuestMapStore((state) => state.floors)
  const geometriesByFloorId = useGuestMapStore((state) => state.geometriesByFloorId)
  const nodesByFloorId = useGuestMapStore((state) => state.nodesByFloorId)
  const storesByFloorId = useGuestMapStore((state) => state.storesByFloorId)
  const destinations = useGuestMapStore((state) => state.destinations)
  const selectedBuildingId = useGuestMapStore((state) => state.selectedBuildingId)
  const selectedFloorId = useGuestMapStore((state) => state.selectedFloorId)
  const fromNodeId = useGuestMapStore((state) => state.fromNodeId)
  const toNodeId = useGuestMapStore((state) => state.toNodeId)
  const route = useGuestMapStore((state) => state.route)
  const isLoading = useGuestMapStore((state) => state.isLoading)
  const isRouteLoading = useGuestMapStore((state) => state.isRouteLoading)
  const error = useGuestMapStore((state) => state.error)
  const loadInitialData = useGuestMapStore((state) => state.loadInitialData)
  const refreshCurrentBuilding = useGuestMapStore(
    (state) => state.refreshCurrentBuilding,
  )
  const selectBuilding = useGuestMapStore((state) => state.selectBuilding)
  const selectFloor = useGuestMapStore((state) => state.selectFloor)
  const setFromNodeId = useGuestMapStore((state) => state.setFromNodeId)
  const setToNodeId = useGuestMapStore((state) => state.setToNodeId)
  const findRoute = useGuestMapStore((state) => state.findRoute)
  const clearRoute = useGuestMapStore((state) => state.clearRoute)

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId)
  const routeStep = route?.steps[activeStepIndex]
  const focusTarget = routeStep
    ? {
        floorId: routeStep.floorId,
        x: routeStep.x,
        y: routeStep.y,
        nonce: focusNonce,
      }
    : undefined
  const routeFloorStepCounts = useMemo(() => {
    const counts = new Map<string, number>()
    route?.steps.forEach((step) => {
      counts.set(step.floorId, (counts.get(step.floorId) ?? 0) + 1)
    })
    return counts
  }, [route])

  function focusStep(step: RouteStep, index: number) {
    setActiveStepIndex(index)
    selectFloor(step.floorId)
    setFocusNonce((value) => value + 1)
  }

  async function handleFindRoute() {
    await findRoute()
    setActiveStepIndex(0)
    setFocusNonce((value) => value + 1)
  }

  return (
    <div className="workspace guest-workspace guest-experience">
      <div className="page-heading">
        <div>
          <Text type="secondary">Khách tham quan</Text>
          <Title level={1}>Bản đồ trong nhà</Title>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={isLoading}
            onClick={refreshCurrentBuilding}
          >
            Tải lại
          </Button>
        </Space>
      </div>

      {error ? (
        <Alert className="canvas-alert" type="error" message={error} showIcon />
      ) : null}

      <Spin spinning={isLoading}>
        {floors.length > 0 ? (
          <div className="guest-layout">
            <Card className="tool-card guest-route-card" title="Tìm đường">
              <Space className="full-width" orientation="vertical" size={14}>
                <div>
                  <Text strong>Điểm bắt đầu</Text>
                  <Select
                    className="full-width"
                    showSearch
                    value={fromNodeId}
                    onChange={setFromNodeId}
                    optionFilterProp="label"
                    options={destinations.map((destination) => ({
                      value: destination.nodeId,
                      label: `${destination.label} - ${destination.floorName}`,
                    }))}
                  />
                </div>
                <div>
                  <Text strong>Điểm đến</Text>
                  <Select
                    className="full-width"
                    showSearch
                    value={toNodeId}
                    onChange={setToNodeId}
                    optionFilterProp="label"
                    options={destinations.map((destination) => ({
                      value: destination.nodeId,
                      label: `${destination.label} - ${destination.floorName}`,
                    }))}
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<CompassOutlined />}
                    loading={isRouteLoading}
                    onClick={handleFindRoute}
                  >
                    Tìm đường
                  </Button>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => {
                      clearRoute()
                      setActiveStepIndex(0)
                    }}
                  >
                    Xoá lộ trình
                  </Button>
                </Space>
              </Space>
            </Card>

            <Card className="tool-card guest-map-card">
              <div className="guest-map-search">
                <SearchOutlined />
                <Select
                  className="full-width"
                  aria-label="Tìm tòa nhà"
                  value={selectedBuildingId}
                  loading={isLoading}
                  onChange={(buildingId) => selectBuilding(buildingId)}
                  options={buildings.map((building) => ({
                    value: building.id,
                    label: building.name,
                  }))}
                  placeholder="Tìm tòa nhà"
                />
              </div>
              <div className="guest-map-mode-row">
                <Segmented
                  value={viewMode}
                  onChange={(mode) => setViewMode(mode as '2d' | '3d')}
                  options={[
                    { label: '2D', value: '2d' },
                    { label: '3D', value: '3d' },
                  ]}
                />
                <Segmented
                  className="guest-floor-tabs"
                  value={selectedFloorId}
                  onChange={(floorId) => selectFloor(String(floorId))}
                  options={floors.map((floor) => ({
                    value: floor.id,
                    label: (
                      <Badge count={routeFloorStepCounts.get(floor.id) ?? 0} size="small">
                        <span>{floor.name}</span>
                      </Badge>
                    ),
                  }))}
                />
              </div>
              {viewMode === '2d' ? (
                <MapViewer2D
                  floor={selectedFloor}
                  geometry={
                    selectedFloorId ? geometriesByFloorId[selectedFloorId] : undefined
                  }
                  stores={selectedFloorId ? (storesByFloorId[selectedFloorId] ?? []) : []}
                  destinations={destinations}
                  route={route}
                  focusTarget={focusTarget}
                  onSelectDestination={(nodeId) => {
                    const destination = destinations.find(
                      (item) => item.nodeId === nodeId,
                    )
                    if (destination) {
                      setToNodeId(destination.nodeId)
                    }
                  }}
                />
              ) : (
                <Suspense
                  fallback={
                    <div className="map3d-host map3d-empty">
                      <Spin />
                    </div>
                  }
                >
                  <Map3DViewer
                    floors={floors}
                    geometriesByFloorId={geometriesByFloorId}
                    nodesByFloorId={nodesByFloorId}
                    selectedFloorId={selectedFloorId}
                    route={route}
                    focusTarget={focusTarget}
                    onSelectFloor={(floorId) => selectFloor(floorId)}
                  />
                </Suspense>
              )}
            </Card>

            <Card className="tool-card guest-directions-card" title="Chỉ dẫn">
              {route ? (
                <Space className="full-width" orientation="vertical" size={16}>
                  <div className="guest-route-summary">
                    <Statistic
                      title="Quãng đường"
                      value={route.totalDistance}
                      suffix="m"
                    />
                    <Statistic
                      title="Thời gian"
                      value={formatSeconds(route.estimatedSeconds)}
                    />
                  </div>
                  <div className="guest-step-actions">
                    <Button
                      icon={<ArrowLeftOutlined />}
                      disabled={activeStepIndex <= 0}
                      onClick={() => {
                        const nextIndex = activeStepIndex - 1
                        const step = route.steps[nextIndex]
                        if (step) {
                          focusStep(step, nextIndex)
                        }
                      }}
                    >
                      Quay lại
                    </Button>
                    <Button
                      icon={<ArrowRightOutlined />}
                      disabled={activeStepIndex >= route.steps.length - 1}
                      onClick={() => {
                        const nextIndex = activeStepIndex + 1
                        const step = route.steps[nextIndex]
                        if (step) {
                          focusStep(step, nextIndex)
                        }
                      }}
                    >
                      Bước tiếp theo
                    </Button>
                  </div>
                  <div className="guest-timeline">
                    {route.steps.map((step, index) => (
                      <button
                        key={`${step.index}-${step.nodeId}`}
                        className={
                          index === activeStepIndex
                            ? 'guest-step guest-step-active'
                            : 'guest-step'
                        }
                        type="button"
                        onClick={() => focusStep(step, index)}
                      >
                        <span className="guest-step-icon">{stepIcon(step.type)}</span>
                        <span>
                          <strong>{step.instruction}</strong>
                          <small>
                            {floors.find((floor) => floor.id === step.floorId)?.name}
                            {step.distance > 0 ? ` - ${step.distance} m` : ''}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </Space>
              ) : (
                <Empty description="Chọn điểm đến rồi bấm Tìm đường" />
              )}
            </Card>
          </div>
        ) : (
          <Empty description="Chưa có tầng nào để hiển thị" />
        )}
      </Spin>
    </div>
  )
}
