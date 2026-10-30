import { useLayoutEffect, useRef, useState } from 'react'
import { Empty } from 'antd'
import { publicMapSize } from '../../api/graphMapper'
import type { PercentPoint } from '../../types/geometry'
import type { RouteMapData, RouteStep } from '../../types/navigation'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'
import './RouteMap.css'

/** Biểu tượng theo loại POI; loại lạ dùng ghim chung. */
const POI_ICON: Record<string, string> = {
  RESTROOM: '🚻',
  TOILET: '🚻',
  ELEVATOR: '🛗',
  EXIT: '🚪',
  INFO: 'ℹ️',
  PARKING: '🅿️',
  ATM: '🏧',
}
const poiIcon = (category: string) => POI_ICON[category.toUpperCase()] ?? '📍'

/** Màu và biểu tượng theo loại thang để người dùng nhận ra chỗ phải lên thang. */
const TRANSITION_STYLE: Record<string, { icon: string; color: string; verb: string }> = {
  ELEVATOR: { icon: '🛗', color: '#7c3aed', verb: 'Thang máy' },
  STAIR: { icon: '🪜', color: '#d97706', verb: 'Thang bộ' },
  ESCALATOR: { icon: '↗', color: '#0d9488', verb: 'Thang cuốn' },
}

type RouteMapProps = {
  map?: RouteMapData
  routeSteps: RouteStep[]
  activeStep?: RouteStep
  destinationName?: string
  hazardNodeIds?: string[]
  interactiveFireMode?: boolean
  /** Hiện toàn bộ đồ thị đi bộ (để gỡ lỗi); mặc định ẩn cho bản đồ gọn. */
  showGraph?: boolean
  /** Tên tầng theo id, để ghi "→ Tầng 3" ở chỗ lên thang. */
  floorNameById?: Record<string, string>
  /** Bản thu nhỏ cho phần tổng quan nhiều tầng: chỉ giữ tuyến, điểm đầu/cuối và chỗ lên thang. */
  compact?: boolean
  /** Chạm vào chỗ trống trên bản đồ: toạ độ % trên tầng này (dùng để tự đặt vị trí hiện tại). */
  onSelectPoint?: (floorId: string, point: PercentPoint) => void
  onSelectNode: (nodeId: string) => void
}

export function RouteMap({
  map,
  routeSteps,
  activeStep,
  destinationName,
  hazardNodeIds = [],
  interactiveFireMode = false,
  showGraph = false,
  floorNameById = {},
  compact = false,
  onSelectPoint,
  onSelectNode,
}: RouteMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // Số pixel màn hình trên mỗi đơn vị bản đồ: ký hiệu chỗ lên thang đặt theo pixel màn hình để to vừa phải
  // dù bản đồ đang thu nhỏ trong khung điện thoại hay phóng lớn ở bản máy tính.
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const read = () => {
      const a = svgRef.current?.getScreenCTM()?.a
      if (a && a > 0) setScale((current) => (Math.abs(current - a) > 0.001 ? a : current))
    }
    read()
    const svg = svgRef.current
    if (!svg || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    observer.observe(svg)
    return () => observer.disconnect()
  })

  if (!map) return <Empty description="Không có dữ liệu tầng này" />

  const { width, height } = publicMapSize(map.floor)
  // Cỡ ký hiệu tỉ lệ theo kích thước ảnh để đọc được dù ảnh 800px hay 4000px.
  const s = Math.max(width, height) / 1000
  const at = (point: PercentPoint) => {
    const { pixelX, pixelY } = percentToPixel(point.x, point.y, width, height)
    return { x: pixelX, y: pixelY }
  }
  const floorSteps = routeSteps.filter((step) => step.floorId === map.floor.id)
  const nodeById = new Map(map.nodes.map((node) => [node.id, node]))
  const poiNodeIds = new Set(map.pois.map((poi) => poi.nodeId))
  const pathPoints = floorSteps.map((step) => `${step.x},${step.y}`).join(' ')

  const isDestinationFloor =
    routeSteps.length > 0 &&
    routeSteps[routeSteps.length - 1].floorId === map.floor.id
  const destinationStep = isDestinationFloor
    ? routeSteps[routeSteps.length - 1]
    : undefined
  // Chỗ lên thang (tầng này là tầng đi) và chỗ bước ra khỏi thang (tầng này là tầng đến).
  const boardings = routeSteps.flatMap((step, index) =>
    step.floorId === map.floor.id && step.transition ? [{ step, index }] : [],
  )
  const exits = routeSteps.flatMap((step, index) => {
    const previous = routeSteps[index - 1]
    return index > 0 && previous?.transition && previous.floorId !== step.floorId && step.floorId === map.floor.id
      ? [{ step, kind: previous.transition }]
      : []
  })
  // Ký hiệu chỗ lên/xuống thang phải đọc được cả khi bản đồ chính bị thu nhỏ trong khung điện thoại.
  const u = (screenPixels: number) => (scale > 0 ? screenPixels / scale : screenPixels * 3)
  // Bản thu nhỏ phóng vào khoảng chứa tuyến (kèm lề) thay vì hiện cả sơ đồ nhỏ xíu.
  let viewBox = `0 0 ${width} ${height}`
  if (compact && floorSteps.length > 0) {
    const xs = floorSteps.map((step) => step.x)
    const ys = floorSteps.map((step) => step.y)
    const pad = Math.max(110 * s, 0.12 * Math.max(width, height))
    const x0 = Math.max(0, Math.min(...xs) - pad)
    const y0 = Math.max(0, Math.min(...ys) - pad)
    const x1 = Math.min(width, Math.max(...xs) + pad)
    const y1 = Math.min(height, Math.max(...ys) + pad)
    viewBox = `${x0} ${y0} ${x1 - x0} ${y1 - y0}`
  }
  const floorLabel = (floorId?: string) => (floorId ? floorNameById[floorId] ?? 'tầng khác' : 'tầng khác')

  function handleBackgroundClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!onSelectPoint) return
    const svg = event.currentTarget
    const matrix = svg.getScreenCTM()
    if (!matrix) return
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    onSelectPoint(map!.floor.id, pixelToPercent(local.x, local.y, width, height))
  }

  return (
    <div
      className={`route-map${interactiveFireMode ? ' route-map--fire-mode' : ''}`}
      aria-label={`Bản đồ ${map.floor.name}`}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        onClick={handleBackgroundClick}
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="routeGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2={height}>
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <radialGradient id="userRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
        </defs>

        {map.floor.mapImageUrl ? (
          <image
            href={map.floor.mapImageUrl}
            className="route-map__plan"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        ) : (
          <rect width={width} height={height} className="route-map__fallback" />
        )}

        {/* Graph edges: chỉ khi gỡ lỗi hoặc đang đặt lửa, để bản đồ không rối */}
        {!compact && (showGraph || interactiveFireMode) && map.edges.map((edge) => {
          const from = nodeById.get(edge.fromNodeId)
          const to = nodeById.get(edge.toNodeId)
          if (!from || !to) return null
          const a = at(from)
          const b = at(to)
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="route-map__graph"
            />
          )
        })}

        {/* Outer White Halo + Solid Royal Blue Route Path */}
        {pathPoints && (
          <polyline points={pathPoints} className="route-map__route-outline" />
        )}
        {pathPoints && (
          <polyline points={pathPoints} className="route-map__route" stroke="url(#routeGradient)" />
        )}
        {pathPoints && (
          <polyline points={pathPoints} className="route-map__route-flow" />
        )}

        {/* POI: biểu tượng theo loại + tên, bỏ POI đang là đích (đã có ghim đích) */}
        {!compact && map.pois
          .filter((poi) => poi.floorId === map.floor.id && poi.nodeId !== destinationStep?.nodeId)
          .map((poi) => {
            const node = nodeById.get(poi.nodeId)
            if (!node) return null
            const p = at(node)
            return (
              <g key={`poi-${poi.id}`} className="route-map__poi" onClick={() => onSelectNode(poi.nodeId)}>
                <circle cx={p.x} cy={p.y} r={15 * s} />
                <text x={p.x} y={p.y + 5.5 * s} textAnchor="middle" fontSize={15 * s}>
                  {poiIcon(poi.category)}
                </text>
                <text x={p.x} y={p.y + 30 * s} textAnchor="middle" fontSize={12 * s} className="route-map__poi-label">
                  {poi.name.length > 16 ? `${poi.name.slice(0, 15)}…` : poi.name}
                </text>
              </g>
            )
          })}

        {/* Regular Nodes */}
        {!compact && map.nodes.map((node) => {
          const isOnRoute = floorSteps.some((step) => step.nodeId === node.id)
          const isActive = activeStep?.nodeId === node.id
          if (isActive) return null // Handled with custom user radar below
          if (poiNodeIds.has(node.id) && !isOnRoute) return null // Đã có biểu tượng POI
          const p = at(node)
          return (
            <g
              key={node.id}
              className="route-map__node"
              onClick={(event) => {
                event.stopPropagation()
                onSelectNode(node.id)
              }}
            >
              <circle cx={p.x} cy={p.y} r={16 * s} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={(isOnRoute ? 10 : 5) * s}
                className={
                  isOnRoute
                    ? 'route-map__node--route'
                    : 'route-map__node--base'
                }
              />
            </g>
          )
        })}

        {/* Step Numbers (only intermediate steps) */}
        {!compact && floorSteps.map((step, index) => {
          const isCurrent = activeStep?.nodeId === step.nodeId
          const isDest = destinationStep?.nodeId === step.nodeId
          if (isCurrent || isDest || step.transition) return null

          return (
            <g key={`${step.nodeId}-${index}`} className="route-map__step-label">
              <circle cx={step.x} cy={step.y} r="13" />
              <text x={step.x} y={step.y + 4} textAnchor="middle">
                {index + 1}
              </text>
            </g>
          )
        })}

        {/* Điểm xuất phát (chỉ ở bản thu nhỏ; bản chính có chấm vị trí hiện tại) */}
        {compact && floorSteps[0] && routeSteps[0]?.floorId === map.floor.id && (
          <g>
            <circle cx={floorSteps[0].x} cy={floorSteps[0].y} r={14 * s} className="radar-core" />
            <text x={floorSteps[0].x} y={floorSteps[0].y + 5 * s} textAnchor="middle" fontSize={14 * s} fill="#ffffff" fontWeight="700">A</text>
          </g>
        )}

        {/* Chỗ lên thang: biểu tượng + "→ Tầng N" để thấy rõ phải đi thang nào, lên tầng nào */}
        {boardings.map(({ step, index }) => {
          const style = TRANSITION_STYLE[step.transition ?? ''] ?? TRANSITION_STYLE.ELEVATOR
          const label = `${style.verb} → ${floorLabel(step.targetFloorId)}`
          const labelWidth = label.length * u(6.4) + u(20)
          return (
            <g key={`board-${index}`} className="route-map__transition">
              <circle cx={step.x} cy={step.y} r={u(15)} fill={style.color} stroke="#ffffff" strokeWidth={u(2.5)} />
              <text x={step.x} y={step.y + u(5.5)} textAnchor="middle" fontSize={u(15)}>{style.icon}</text>
              <g transform={`translate(${step.x}, ${step.y - u(28)})`}>
                <rect x={-labelWidth / 2} y={-u(11)} width={labelWidth} height={u(22)} rx={u(7)} fill={style.color} />
                <text x={0} y={u(4)} textAnchor="middle" fontSize={u(11.5)} fill="#ffffff" fontWeight="700">{label}</text>
              </g>
            </g>
          )
        })}

        {/* Chỗ bước ra khỏi thang ở tầng đến */}
        {exits.map(({ step, kind }) => {
          const style = TRANSITION_STYLE[kind] ?? TRANSITION_STYLE.ELEVATOR
          const label = `Ra khỏi ${style.verb.toLowerCase()}`
          const labelWidth = label.length * u(6.4) + u(20)
          return (
            <g key={`exit-${step.nodeId}`} className="route-map__transition">
              <circle cx={step.x} cy={step.y} r={u(15)} fill="#ffffff" stroke={style.color} strokeWidth={u(3)} />
              <text x={step.x} y={step.y + u(5.5)} textAnchor="middle" fontSize={u(15)}>{style.icon}</text>
              <g transform={`translate(${step.x}, ${step.y - u(28)})`}>
                <rect x={-labelWidth / 2} y={-u(11)} width={labelWidth} height={u(22)} rx={u(7)} fill="#ffffff" stroke={style.color} strokeWidth={u(1.5)} />
                <text x={0} y={u(4)} textAnchor="middle" fontSize={u(11.5)} fill={style.color} fontWeight="700">{label}</text>
              </g>
            </g>
          )
        })}

        {/* Destination Teardrop Pin Marker (matching the photo) */}
        {destinationStep && (
          <g
            transform={`translate(${destinationStep.x}, ${destinationStep.y - 36})`}
          >
            {/* Soft destination room label banner */}
            {destinationName && (
              <g transform="translate(0, -18)">
                <rect
                  x="-75"
                  y="-18"
                  width="150"
                  height="26"
                  rx="6"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.18))"
                />
                <text
                  x="0"
                  y="-1"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="700"
                  fontSize="12"
                >
                  {destinationName.length > 18
                    ? `${destinationName.slice(0, 16)}...`
                    : destinationName}
                </text>
              </g>
            )}

            {/* Teardrop Pin Shape */}
            <path
              d="M0,36 C-12,22 -20,12 -20,0 C-20,-11 -11,-20 0,-20 C11,-20 20,-11 20,0 C20,12 12,22 0,36 Z"
              className="destination-pin-body"
            />
            {/* White Center Dot */}
            <circle cx="0" cy="-2" r="7" className="destination-pin-dot" />
          </g>
        )}

        {/* Simulated fire / blocked nodes */}
        {map.nodes
          .filter((node) => hazardNodeIds.includes(node.id))
          .map((node) => {
            const p = at(node)
            return (
              <g key={`hazard-${node.id}`} className="route-map__hazard" onClick={() => onSelectNode(node.id)}>
                <circle cx={p.x} cy={p.y} r="22" />
                <text x={p.x} y={p.y + 8} textAnchor="middle" fontSize="22">
                  🔥
                </text>
              </g>
            )
          })}

        {/* Current User Location Arrow with Radar Wave (matching the photo) */}
        {!compact && activeStep && activeStep.floorId === map.floor.id && (
          <g
            key={map.floor.id}
            style={{ transform: `translate(${activeStep.x}px, ${activeStep.y}px)`, transition: 'transform 0.9s ease-in-out' }}
          >
            {/* Radar Wave Pulse */}
            <circle cx="0" cy="0" r="44" className="radar-wave" />
            <circle cx="0" cy="0" r="26" fill="url(#userRadarGlow)" />
            {/* Blue Core Circle */}
            <circle cx="0" cy="0" r="15" className="radar-core" />
            {/* Direction Pointer Arrow */}
            <polygon
              points="0,-10 6,7 0,4 -6,7"
              className="radar-heading"
              transform={`rotate(${activeStep.bearing ?? 0})`}
            />
          </g>
        )}
      </svg>

      {!map.floor.mapImageUrl && (
        <p className="route-map__notice">
          Tầng này chưa có ảnh sơ đồ. Tuyến đường vẫn được hiển thị theo graph không gian.
        </p>
      )}
    </div>
  )
}
