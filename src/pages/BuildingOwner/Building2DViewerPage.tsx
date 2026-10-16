import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Button,
  Empty,
  Spin,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  FullscreenExitOutlined,
  PlusOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { Floor } from '../../types/floor'
import { StatusPill } from '../../components/ui'
import { UploadFloorPlanModal } from './UploadFloorPlanModal'
import { CreateFloorModal } from './CreateFloorModal'
import './Building2DViewerPage.css'

export function Building2DViewerPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageStatus, setImageStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [imageKey, setImageKey] = useState(0)

  // Zoom and Pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [createFloorModalOpen, setCreateFloorModalOpen] = useState(false)

  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const building = useBuildingStore((state) =>
    buildingId ? state.getBuildingById(buildingId) : undefined,
  )

  useEffect(() => {
    loadBuildings().catch((err: Error) => message.error(err.message))
  }, [loadBuildings, message])

  // Fit image into viewport smoothly
  const fitToView = useCallback((naturalWidth?: number, naturalHeight?: number) => {
    const selected = floors.find((f) => f.id === selectedFloorId)
    const w = naturalWidth || selected?.mapWidth || 1600
    const h = naturalHeight || selected?.mapHeight || 1000

    if (viewportRef.current) {
      const vw = viewportRef.current.clientWidth || 800
      const vh = viewportRef.current.clientHeight || 600
      const padding = 60
      const scaleX = (vw - padding) / w
      const scaleY = (vh - padding) / h
      const optimalZoom = Math.min(scaleX, scaleY, 1.2)
      setZoom(Math.max(0.1, Number(optimalZoom.toFixed(2))))
      setPan({ x: 0, y: 0 })
    }
  }, [floors, selectedFloorId])

  // Initial load floors
  useEffect(() => {
    if (!buildingId) return
    setIsLoading(true)
    getFloors(buildingId)
      .then((data) => {
        setFloors(data)
        const targetFloorId = searchParams.get('floorId')
        if (targetFloorId && data.some((f) => f.id === targetFloorId)) {
          setSelectedFloorId(targetFloorId)
        } else {
          // Prefer floor with image, otherwise first floor
          const floorWithImage = data.find((f) => f.mapImageUrl)
          if (floorWithImage) {
            setSelectedFloorId(floorWithImage.id)
          } else if (data.length > 0) {
            setSelectedFloorId(data[0].id)
          }
        }
      })
      .catch((err: Error) => message.error(err.message))
      .finally(() => setIsLoading(false))
  }, [buildingId, message]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFloor = floors.find((f) => f.id === selectedFloorId)

  // Reset image status when changing floor
  useEffect(() => {
    if (selectedFloor?.mapImageUrl) {
      setImageStatus('loading')
    } else {
      setImageStatus('idle')
    }
    setPan({ x: 0, y: 0 })
  }, [selectedFloorId, selectedFloor?.mapImageUrl])

  // Handle floor switch
  function handleSelectFloor(floorId: string) {
    setSelectedFloorId(floorId)
    setSearchParams({ floorId })
  }

  // Zoom controls
  function handleZoomIn() {
    setZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 4))
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.1))
  }

  // Pan controls
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom((prev) => Math.max(0.1, Math.min(Number((prev + delta).toFixed(2)), 4)))
  }

  return (
    <main className="workspace b2d-workspace">
      {/* ── Top Header ── */}
      <section className="b2d-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/owner/buildings/${buildingId}`)}
        >
          Chi tiết tòa nhà
        </Button>
        <div className="b2d-header__text">
          <span className="b2d-header__eyebrow">Owner 2D Map Viewer</span>
          <h1 className="b2d-header__title">
            {building?.name ? `${building.name} — Sơ đồ 2D` : 'Building 2D Viewer'}
          </h1>
        </div>
        <div className="b2d-header__actions">
          {buildingId && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => navigate(`/owner/buildings/${buildingId}/overview`)}
            >
              Tổng quan 2.5D
            </Button>
          )}
          {selectedFloor && (
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => setUploadModalOpen(true)}
            >
              {selectedFloor.mapImageUrl ? 'Đổi sơ đồ' : 'Tải lên sơ đồ'}
            </Button>
          )}
        </div>
      </section>

      {/* ── Main Content: Sidebar + Viewer ── */}
      <div className="b2d-main-layout">
        {/* Floor list sidebar */}
        <aside className="b2d-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="b2d-sidebar__title">Danh sách tầng</span>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateFloorModalOpen(true)}
              title="Thêm tầng mới"
            />
          </div>

          <Spin spinning={isLoading}>
            {floors.length === 0 && !isLoading ? (
              <Empty
                description="Chưa có tầng nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateFloorModalOpen(true)}
                >
                  Thêm tầng
                </Button>
              </Empty>
            ) : (
              floors.map((floor) => {
                const isActive = floor.id === selectedFloorId
                return (
                  <button
                    key={floor.id}
                    className={`b2d-floor-btn ${isActive ? 'b2d-floor-btn--active' : ''}`}
                    onClick={() => handleSelectFloor(floor.id)}
                    type="button"
                  >
                    <div className="b2d-floor-badge">{floor.level}</div>
                    <div className="b2d-floor-info">
                      <span className="b2d-floor-name">{floor.name}</span>
                      <span className="b2d-floor-sub">
                        {floor.mapImageUrl ? 'Đã có sơ đồ' : 'Chưa có ảnh'}
                      </span>
                    </div>
                    <StatusPill status={floor.publishStatus} />
                  </button>
                )
              })
            )}
          </Spin>
        </aside>

        {/* 2D Map viewport */}
        <section className="b2d-viewer-card">
          <Spin spinning={isLoading} style={{ height: '100%' }}>
            {selectedFloor ? (
              selectedFloor.mapImageUrl ? (
                <div
                  ref={viewportRef}
                  className="b2d-viewport"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  {/* HUD Info */}
                  <div className="b2d-hud-info">
                    <span className="b2d-hud-info__title">
                      Level {selectedFloor.level} · {selectedFloor.name}
                    </span>
                    <span className="b2d-hud-info__meta">
                      Kích thước: {selectedFloor.mapWidth} × {selectedFloor.mapHeight} px
                    </span>
                  </div>

                  {/* Image loading indicator */}
                  {imageStatus === 'loading' && (
                    <div className="b2d-image-loading">
                      <Spin size="large" />
                      <span>Đang tải sơ đồ mặt bằng từ máy chủ...</span>
                    </div>
                  )}

                  {/* Image error fallback */}
                  {imageStatus === 'error' && (
                    <div className="b2d-image-error">
                      <Alert
                        type="error"
                        showIcon
                        message="Không thể hiển thị ảnh sơ đồ"
                        description="Trình duyệt không tải được file ảnh sơ đồ hoặc kết nối mạng bị gián đoạn."
                        action={
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Button
                              size="small"
                              icon={<ReloadOutlined />}
                              onClick={() => {
                                setImageStatus('loading')
                                setImageKey((prev) => prev + 1)
                              }}
                            >
                              Thử lại
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              icon={<CloudUploadOutlined />}
                              onClick={() => setUploadModalOpen(true)}
                            >
                              Tải lên ảnh khác
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  )}

                  {/* Centered Image with Pan and Zoom */}
                  <div
                    className="b2d-canvas-content"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      visibility: imageStatus === 'error' ? 'hidden' : 'visible',
                    }}
                  >
                    <img
                      key={imageKey}
                      src={selectedFloor.mapImageUrl}
                      alt={`Sơ đồ ${selectedFloor.name}`}
                      className="b2d-floor-image"
                      draggable={false}
                      crossOrigin="anonymous"
                      onLoad={(e) => {
                        setImageStatus('loaded')
                        fitToView(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
                      }}
                      onError={() => {
                        setImageStatus('error')
                      }}
                    />
                  </div>

                  {/* HUD Zoom Controls */}
                  <div className="b2d-hud-controls">
                    <Tooltip title="Thu nhỏ (Cuộn chuột xuống)">
                      <Button
                        type="text"
                        size="small"
                        icon={<ZoomOutOutlined />}
                        onClick={handleZoomOut}
                      />
                    </Tooltip>
                    <span className="b2d-zoom-text">{Math.round(zoom * 100)}%</span>
                    <Tooltip title="Phóng to (Cuộn chuột lên)">
                      <Button
                        type="text"
                        size="small"
                        icon={<ZoomInOutlined />}
                        onClick={handleZoomIn}
                      />
                    </Tooltip>
                    <Tooltip title="Vừa vặn khung nhìn (Fit to view)">
                      <Button
                        type="text"
                        size="small"
                        icon={<FullscreenExitOutlined />}
                        onClick={() => fitToView()}
                      />
                    </Tooltip>
                  </div>
                </div>
              ) : (
                <div className="b2d-empty-state">
                  <Empty
                    description={
                      <span>
                        Tầng <strong>{selectedFloor.name}</strong> chưa có ảnh sơ đồ mặt bằng
                      </span>
                    }
                  >
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      onClick={() => setUploadModalOpen(true)}
                    >
                      Tải lên sơ đồ cho tầng này
                    </Button>
                  </Empty>
                </div>
              )
            ) : (
              <div className="b2d-empty-state">
                <Empty description="Vui lòng chọn hoặc thêm tầng để xem sơ đồ 2D" />
              </div>
            )}
          </Spin>
        </section>
      </div>

      {/* ── Modals ── */}
      {buildingId && (
        <>
          <CreateFloorModal
            buildingId={buildingId}
            open={createFloorModalOpen}
            existingLevels={floors.map((f) => f.level)}
            onClose={() => setCreateFloorModalOpen(false)}
            onSuccess={(newFloor) => {
              setFloors((prev) => [...prev, newFloor].sort((a, b) => a.level - b.level))
              handleSelectFloor(newFloor.id)
            }}
          />

          <UploadFloorPlanModal
            buildingId={buildingId}
            floor={selectedFloor ?? null}
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onSuccess={(updated) => {
              setFloors((prev) =>
                prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)),
              )
              setImageStatus('loading')
              setImageKey((prev) => prev + 1)
            }}
          />
        </>
      )}
    </main>
  )
}
