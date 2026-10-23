import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Empty,
  Input,
  Segmented,
  Select,
  Skeleton,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd'
import {
  AimOutlined,
  ArrowLeftOutlined,
  EnvironmentOutlined,
  FundProjectionScreenOutlined,
  MenuOutlined,
  SearchOutlined,
  SwapOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { resolvePublicQrToken } from '../../api/publicNavigation'
import { DemoSimulationToolbar } from '../../components/navigation/DemoSimulationToolbar'
import { RouteMap } from '../../components/navigation/RouteMap'
import { useNavigationStore } from '../../store/useNavigationStore'
import type { Maneuver, PublicQrResolution, RouteStep } from '../../types/navigation'
import './NavigationPage.css'

const formatDistance = (distance: number) =>
  distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${Math.round(distance)} m`

const formatDuration = (seconds: number) =>
  `${Math.max(1, Math.ceil(seconds / 60))} phút`

const MANEUVER_ARROW: Record<Maneuver, string> = {
  START: '↑',
  STRAIGHT: '↑',
  SLIGHT_LEFT: '↖',
  SLIGHT_RIGHT: '↗',
  TURN_LEFT: '↰',
  TURN_RIGHT: '↱',
  U_TURN_LEFT: '↶',
  U_TURN_RIGHT: '↷',
  ELEVATOR: '🛗',
  STAIR: '🪜',
  ESCALATOR: '↗',
  ARRIVE: '📍',
  ARRIVE_AT_SAFE_EXIT: '🚪',
}

function getTurnArrow(instruction: string, transition?: string, maneuver?: Maneuver) {
  if (maneuver) return MANEUVER_ARROW[maneuver]
  if (transition === 'ELEVATOR') return '🛗'
  const text = instruction.toLowerCase()
  if (text.includes('phải') || text.includes('right')) return '↱'
  if (text.includes('trái') || text.includes('left')) return '↰'
  if (text.includes('thang máy') || text.includes('lift')) return '🛗'
  if (text.includes('thang bộ') || text.includes('stairs')) return '🪜'
  return '↑'
}

export function NavigationPage() {
  const { buildingId: routeBuildingId } = useParams<{ buildingId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qrToken = searchParams.get('qr')
  const paramFromNodeId = searchParams.get('fromNodeId') ?? undefined
  const paramFloorId = searchParams.get('floorId') ?? undefined
  const paramToStoreId = searchParams.get('toStoreId') ?? undefined
  const [qr, setQr] = useState<PublicQrResolution>()
  const [qrLoading, setQrLoading] = useState(Boolean(qrToken))
  const [qrError, setQrError] = useState<string>()
  const [qrLocked, setQrLocked] = useState(true)
  const autoRoutedRef = useRef(false)
  const buildingId = routeBuildingId ?? qr?.buildingId ?? searchParams.get('buildingId') ?? undefined

  const {
    floors,
    mapsByFloorId,
    destinations,
    route,
    isLoading,
    isRouting,
    error,
    load,
    search,
    findRoute,
    clearRoute,
    routeTargetName,
    routeWarning,
    routeSource,
    activeFireNodeIds,
    interactiveFireMode,
    toggleFireNode,
  } = useNavigationStore()

  const [selectedFloorId, setSelectedFloorId] = useState<string>()
  const [fromNodeId, setFromNodeId] = useState<string>()
  const [destinationId, setDestinationId] = useState<string>()
  const [wheelchairMode, setWheelchairMode] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile')
  const [stepsDrawerOpen, setStepsDrawerOpen] = useState(false)
  const [trackedRoute, setTrackedRoute] = useState(route)

  // Tuyến mới (tìm đường, demo, tái định tuyến khi cháy) luôn bắt đầu lại từ bước đầu
  if (route !== trackedRoute) {
    setTrackedRoute(route)
    setStepIndex(0)
    if (route?.steps[0]) setSelectedFloorId(route.steps[0].floorId)
  }

  useEffect(() => {
    if (buildingId) void load(buildingId)
  }, [buildingId, load])

  useEffect(() => {
    if (!qrToken) return
    let cancelled = false
    resolvePublicQrToken(qrToken, () => {
      // Mock khi backend chưa sẵn sàng: token "demo*" xuất phát từ node đầu tiên của tòa nhà đã tải
      const { floors: loadedFloors, mapsByFloorId: maps } = useNavigationStore.getState()
      const ground = [...loadedFloors].sort((a, b) => a.floorNumber - b.floorNumber)[0]
      const node = ground && maps[ground.id]?.nodes[0]
      return qrToken.startsWith('demo') && node && routeBuildingId
        ? { nodeId: node.id, floorId: node.floorId, buildingId: routeBuildingId, x: node.x, y: node.y, label: 'Điểm quét QR (demo)' }
        : undefined
    })
      .then((resolved) => {
        if (cancelled) return
        setQr(resolved)
        setSelectedFloorId(resolved.floorId)
        setQrLocked(true)
      })
      .catch((error: unknown) => {
        if (!cancelled) setQrError(error instanceof Error ? error.message : 'Không thể xác thực mã QR.')
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [qrToken, routeBuildingId])

  const sortedFloors = useMemo(() => {
    return [...floors].sort((a, b) => b.floorNumber - a.floorNumber) // Descending for vertical stack
  }, [floors])

  const sourceOptions = useMemo(
    () =>
      Object.values(mapsByFloorId).flatMap((map) =>
        map.nodes.map((node, index) => ({
          value: node.id,
          label: `${map.floor.name} · ${node.type || 'Điểm'} ${index + 1}`,
        })),
      ),
    [mapsByFloorId],
  )

  const destinationOptions = destinations.map((destination) => {
    const floor = floors.find((item) => item.id === destination.floorId)
    return {
      value: destination.id,
      label: `${destination.name} · ${floor?.name ?? 'Tầng khác'}`,
    }
  })

  const currentStep: RouteStep | undefined = route?.steps[stepIndex]
  const nextStep: RouteStep | undefined = route?.steps[stepIndex + 1]
  const fromLocked = Boolean(qr) && qrLocked
  const effectiveFromNodeId =
    (fromLocked ? qr?.nodeId : undefined) ?? fromNodeId ?? qr?.nodeId ?? paramFromNodeId ?? sourceOptions[0]?.value
  const displayedFloorId =
    currentStep?.floorId ?? selectedFloorId ?? qr?.floorId ?? paramFloorId ?? floors[0]?.id

  const handleSelectNode = (nodeId: string) => {
    if (interactiveFireMode) toggleFireNode(nodeId, currentStep?.nodeId)
    else if (!fromLocked) setFromNodeId(nodeId)
  }

  const destinationObj = destinations.find((d) => d.id === destinationId)
  const destinationName = routeTargetName ?? destinationObj?.name ?? 'Lecture Hall 301'

  const beginRoute = async (targetDestId?: string, targetFromId?: string) => {
    const from = targetFromId ?? effectiveFromNodeId
    const dest = targetDestId ?? destinationId
    if (!from || !dest) return
    const result = await findRoute({
      fromNodeId: from,
      toStoreId: dest,
      wheelchairMode,
    })
    if (!result) return
    setStepIndex(0)
    setSelectedFloorId(result.steps[0]?.floorId)
  }

  // Deep-link ?toStoreId=: tự chỉ đường khi đã có điểm xuất phát và dữ liệu điểm đến
  useEffect(() => {
    if (autoRoutedRef.current || !paramToStoreId || isLoading || !effectiveFromNodeId) return
    if (!destinations.some((item) => item.id === paramToStoreId)) return
    autoRoutedRef.current = true
    setDestinationId(paramToStoreId)
    void beginRoute(paramToStoreId, effectiveFromNodeId).catch(() => undefined)
    // beginRoute phụ thuộc state cục bộ; chỉ cần chạy 1 lần khi đủ dữ liệu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramToStoreId, isLoading, effectiveFromNodeId, destinations])

  // Quick Demo Route (Lecture Hall 301 as in Reference Photo)
  const handleLoadDemoRoute = () => {
    if (sourceOptions[0]?.value && (destinationOptions[0]?.value || destinations[0]?.id)) {
      const dest = destinationOptions[0]?.value ?? destinations[0]?.id
      setDestinationId(dest)
      setFromNodeId(sourceOptions[0]?.value)
      void beginRoute(dest, sourceOptions[0]?.value)
    }
  }

  const handleNextStep = () => {
    if (!route || stepIndex >= route.steps.length - 1) return
    const nextIdx = stepIndex + 1
    setStepIndex(nextIdx)
    const nextFloorId = route.steps[nextIdx]?.floorId
    if (nextFloorId && nextFloorId !== displayedFloorId) {
      setSelectedFloorId(nextFloorId)
    }
  }

  const handlePrevStep = () => {
    if (stepIndex <= 0) return
    const prevIdx = stepIndex - 1
    setStepIndex(prevIdx)
    const prevFloorId = route?.steps[prevIdx]?.floorId
    if (prevFloorId && prevFloorId !== displayedFloorId) {
      setSelectedFloorId(prevFloorId)
    }
  }

  if (!buildingId) {
    if (qrLoading) return <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 24 }} />
    if (qrError) {
      return (
        <Alert
          type="error"
          showIcon
          style={{ margin: 24 }}
          message="Mã QR không hợp lệ hoặc đã hết hiệu lực"
          description={qrError}
        />
      )
    }
    return <Empty description="Thiếu mã tòa nhà" />
  }

  return (
    <main className="navigation-page">
      {/* Page Header */}
      <header className="navigation-page__header">
        <div>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/owner/buildings/${buildingId}`)}
            >
              Tòa nhà
            </Button>
            <Button
              icon={<FundProjectionScreenOutlined />}
              onClick={() => navigate(`/owner/buildings/${buildingId}/overview`)}
            >
              Xem Mô hình 3D Xuyên tầng
            </Button>
          </Space>
          <Typography.Title level={2} style={{ marginTop: 8 }}>
            Indoor Navigation · Chỉ đường trong tòa nhà
          </Typography.Title>
        </div>

        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'mobile' | 'desktop')}
            options={[
              { value: 'mobile', label: '📱 Giao diện Mobile Turn-by-Turn' },
              { value: 'desktop', label: '🖥️ Giao diện Mở rộng' },
            ]}
          />
          {!route && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleLoadDemoRoute}
              style={{ background: '#2563eb' }}
            >
              Chạy Demo Lộ trình (Lecture Hall 301)
            </Button>
          )}
        </Space>
      </header>

      {qr && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Vị trí quét QR: ${qr.label}`}
          description={`Tầng ${floors.find((floor) => floor.id === qr.floorId)?.floorNumber ?? ''} · ${qrLocked ? 'điểm xuất phát đã được khóa theo mã QR' : 'bạn đang tự chọn điểm xuất phát'}`}
          action={
            <Button size="small" onClick={() => setQrLocked((locked) => !locked)}>
              {qrLocked ? 'Đổi vị trí' : 'Dùng vị trí QR'}
            </Button>
          }
        />
      )}
      {qrError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không xác thực được mã QR — hãy chọn điểm xuất phát thủ công"
          description={qrError}
        />
      )}

      <DemoSimulationToolbar currentNodeId={currentStep?.nodeId} />

      {routeWarning && (
        <Alert
          type={routeWarning.severity === 'CRITICAL' ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={routeWarning.code === 'DESTINATION_IN_HAZARD' ? '🚨 Điểm đến đang bị cháy — đã huỷ điểm đến' : routeWarning.code}
          description={
            <>
              {routeWarning.message}
              {routeWarning.requestedDestinationName && <div>Điểm đến bị huỷ: {routeWarning.requestedDestinationName}</div>}
              {routeWarning.destinationCancelled && routeTargetName && (
                <div>
                  Đang dẫn tới lối thoát hiểm: <b>{routeTargetName}</b>
                </div>
              )}
            </>
          }
        />
      )}
      {route && routeSource === 'offline' && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Chế độ ngoại tuyến: tuyến đường được tính ngay trên thiết bị"
        />
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          message="Không thể tải điều hướng"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 14 }} />
      ) : floors.length === 0 ? (
        <Card>
          <Empty description="Tòa nhà chưa có tầng nào được công bố" />
        </Card>
      ) : viewMode === 'mobile' ? (
        /* ── MOBILE TURN-BY-TURN VIEW (Matching Reference Photo) ── */
        <div className="phone-mockup-wrapper">
          <div className="phone-device">
            {/* Status bar & Dynamic Island */}
            <div className="phone-status-bar">
              <span>9:41</span>
              <div className="phone-dynamic-island" />
              <span>5G 􀛨 100%</span>
            </div>

            <div className="phone-screen">
              {/* Top Turn-by-Turn Header Card */}
              {route && currentStep ? (
                <div className="phone-turn-banner">
                  <div className="turn-banner__main">
                    <div className="turn-banner__arrow">
                      {getTurnArrow(currentStep.instruction, currentStep.transition, currentStep.maneuver)}
                    </div>
                    <div className="turn-banner__details">
                      <div className="turn-banner__distance">
                        {currentStep.transition
                          ? currentStep.waitSeconds
                            ? `Chuyển tầng · chờ ~${Math.round(currentStep.waitSeconds)} s`
                            : 'Chuyển tầng'
                          : currentStep.distanceMeters !== undefined
                            ? formatDistance(currentStep.distanceMeters)
                            : `Bước ${stepIndex + 1}/${route.steps.length}`}
                      </div>
                      <div className="turn-banner__instruction">
                        {currentStep.instruction}
                      </div>
                    </div>
                    <Button
                      type="text"
                      icon={<MenuOutlined />}
                      onClick={() => setStepsDrawerOpen(true)}
                    />
                  </div>

                  {nextStep && (
                    <div className="turn-banner__next">
                      <span>Sau đó</span>
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>
                        {getTurnArrow(nextStep.instruction, nextStep.transition, nextStep.maneuver)}
                      </span>
                      <span>{nextStep.instruction}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="phone-turn-banner" style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                    Chọn điểm xuất phát và điểm đến
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                      size="small"
                      placeholder="Điểm bắt đầu"
                      value={effectiveFromNodeId}
                      options={sourceOptions}
                      onChange={setFromNodeId}
                      disabled={fromLocked}
                      style={{ width: '100%' }}
                    />
                    <Select
                      size="small"
                      placeholder="Chọn điểm đến"
                      value={destinationId}
                      options={destinationOptions}
                      onChange={setDestinationId}
                      style={{ width: '100%' }}
                    />
                    <Button
                      type="primary"
                      size="small"
                      block
                      loading={isRouting}
                      disabled={!effectiveFromNodeId || !destinationId}
                      onClick={() => void beginRoute()}
                      style={{ background: '#2563eb' }}
                    >
                      Bắt đầu chỉ đường
                    </Button>
                  </Space>
                </div>
              )}

              {/* Vertical Stacked Floor Switcher (Pill style on the right) */}
              <div className="phone-floor-pills">
                {sortedFloors.map((floor) => {
                  const isActive = floor.id === displayedFloorId
                  return (
                    <button
                      key={floor.id}
                      className={`phone-floor-pill-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedFloorId(floor.id)}
                    >
                      {floor.floorNumber === 1 ? 'G' : floor.floorNumber}
                    </button>
                  )
                })}
              </div>

              {/* Left Transition Shortcuts */}
              <div className="phone-transition-shortcuts">
                <div
                  className="phone-shortcut-card"
                  onClick={() => {
                    const elevStep = route?.steps.find((s) => s.transition === 'ELEVATOR')
                    if (elevStep) {
                      setStepIndex(route?.steps.indexOf(elevStep) ?? 0)
                      setSelectedFloorId(elevStep.floorId)
                    }
                  }}
                >
                  <span>🪜</span>
                  <span>Stairs</span>
                </div>
                <div
                  className="phone-shortcut-card"
                  onClick={() => {
                    const elevStep = route?.steps.find((s) => s.transition === 'ELEVATOR')
                    if (elevStep) {
                      setStepIndex(route?.steps.indexOf(elevStep) ?? 0)
                      setSelectedFloorId(elevStep.floorId)
                    }
                  }}
                >
                  <span>🛗</span>
                  <span>Lift</span>
                </div>
              </div>

              {/* Map Canvas with Animated Radar Pulse & Destination Pin */}
              <div style={{ flex: 1, position: 'relative' }}>
                <RouteMap
                  map={displayedFloorId ? mapsByFloorId[displayedFloorId] : undefined}
                  routeSteps={route?.steps ?? []}
                  activeStep={currentStep}
                  destinationName={destinationName}
                  hazardNodeIds={activeFireNodeIds}
                  interactiveFireMode={interactiveFireMode}
                  onSelectNode={handleSelectNode}
                />
              </div>

              {/* Bottom Floating Navigation Status Sheet */}
              {route && (
                <div className="phone-bottom-sheet">
                  <div className="bottom-sheet__header">
                    <div>
                      <div className="bottom-sheet__title">{destinationName}</div>
                      <div className="bottom-sheet__sub">qua Hành lang chính · Tầng {floors.find((f) => f.id === displayedFloorId)?.floorNumber}</div>
                    </div>
                    <div className="bottom-sheet__stats">
                      <div style={{ color: '#2563eb' }}>{formatDuration(route.estimatedDurationSeconds)}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{formatDistance(route.totalDistance)}</div>
                    </div>
                  </div>

                  <div className="bottom-sheet__actions">
                    <Button
                      disabled={stepIndex === 0}
                      onClick={handlePrevStep}
                      size="middle"
                    >
                      Trước
                    </Button>
                    <button
                      className="bottom-sheet__exit-btn"
                      onClick={() => {
                        clearRoute()
                        setStepIndex(0)
                      }}
                    >
                      Exit Navigation
                    </button>
                    <Button
                      type="primary"
                      disabled={stepIndex === route.steps.length - 1}
                      onClick={handleNextStep}
                      size="middle"
                      style={{ background: '#2563eb' }}
                    >
                      Tiếp theo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── DESKTOP EXPANDED GRID VIEW ── */
        <div className="navigation-page__grid">
          <section className="navigation-page__map-panel">
            <div className="navigation-page__floor-tabs" role="tablist">
              {floors.map((floor) => (
                <Button
                  key={floor.id}
                  type={floor.id === displayedFloorId ? 'primary' : 'default'}
                  onClick={() => setSelectedFloorId(floor.id)}
                >
                  Tầng {floor.floorNumber} - {floor.name}
                </Button>
              ))}
            </div>
            <RouteMap
              map={displayedFloorId ? mapsByFloorId[displayedFloorId] : undefined}
              routeSteps={route?.steps ?? []}
              activeStep={currentStep}
              destinationName={destinationName}
              hazardNodeIds={activeFireNodeIds}
              interactiveFireMode={interactiveFireMode}
              onSelectNode={handleSelectNode}
            />
          </section>

          <aside className="navigation-page__panel">
            <Typography.Title level={4}>Lên đường</Typography.Title>
            <label className="navigation-page__label">
              <AimOutlined /> Vị trí hiện tại
            </label>
            <Select
              value={effectiveFromNodeId}
              options={sourceOptions}
              onChange={setFromNodeId}
              disabled={fromLocked}
              placeholder="Chạm một điểm trên bản đồ"
              showSearch
              optionFilterProp="label"
            />
            <label className="navigation-page__label">
              <EnvironmentOutlined /> Điểm đến
            </label>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm cửa hàng / phòng"
              onChange={(event) => void search(event.target.value)}
            />
            <Select
              value={destinationId}
              options={destinationOptions}
              onChange={setDestinationId}
              placeholder="Chọn cửa hàng"
              showSearch
              optionFilterProp="label"
            />
            <Checkbox
              checked={wheelchairMode}
              onChange={(event) => setWheelchairMode(event.target.checked)}
            >
              Ưu tiên lối đi phù hợp xe lăn
            </Checkbox>
            <Button
              type="primary"
              block
              size="large"
              icon={<SwapOutlined />}
              loading={isRouting}
              disabled={!effectiveFromNodeId || !destinationId}
              onClick={() => void beginRoute()}
              style={{ background: '#2563eb' }}
            >
              Tìm đường đi
            </Button>

            {route && currentStep && (
              <div className="navigation-page__guidance">
                <Tag color={currentStep.transition ? 'gold' : 'blue'}>
                  {currentStep.transition ? 'Chuyển tầng' : `Bước ${stepIndex + 1}/${route.steps.length}`}
                </Tag>
                <Typography.Title level={4}>{currentStep.instruction}</Typography.Title>
                <Steps
                  size="small"
                  current={stepIndex}
                  direction="vertical"
                  items={route.steps.map((step) => ({
                    title: step.instruction,
                    description: floors.find((floor) => floor.id === step.floorId)?.name,
                  }))}
                />
                <Space>
                  <Button disabled={stepIndex === 0} onClick={handlePrevStep}>
                    Trước
                  </Button>
                  <Button
                    type="primary"
                    disabled={stepIndex === route.steps.length - 1}
                    onClick={handleNextStep}
                  >
                    Tiếp theo
                  </Button>
                  <Button type="text" danger onClick={clearRoute}>
                    Kết thúc
                  </Button>
                </Space>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Turn-by-Turn Steps Drawer for Mobile Mode */}
      <Drawer
        title="Danh sách bước đi (Turn-by-Turn)"
        placement="bottom"
        onClose={() => setStepsDrawerOpen(false)}
        open={stepsDrawerOpen}
        height="65%"
      >
        {route?.steps && (
          <Steps
            current={stepIndex}
            direction="vertical"
            onChange={(idx) => {
              setStepIndex(idx)
              const fId = route.steps[idx]?.floorId
              if (fId) setSelectedFloorId(fId)
              setStepsDrawerOpen(false)
            }}
            items={route.steps.map((step) => ({
              title: step.instruction,
              description: `Tầng ${floors.find((f) => f.id === step.floorId)?.floorNumber ?? ''} · Toạ độ (${Math.round(step.x)}, ${Math.round(step.y)})`,
            }))}
          />
        )}
      </Drawer>
    </main>
  )
}
