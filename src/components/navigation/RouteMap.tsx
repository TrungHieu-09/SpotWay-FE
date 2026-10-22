import { Empty } from 'antd'
import type { PublicFloorMap, RouteStep } from '../../types/navigation'
import './RouteMap.css'

type RouteMapProps = {
  map?: PublicFloorMap
  routeSteps: RouteStep[]
  activeStep?: RouteStep
  destinationName?: string
  hazardNodeIds?: string[]
  interactiveFireMode?: boolean
  onSelectNode: (nodeId: string) => void
}

export function RouteMap({
  map,
  routeSteps,
  activeStep,
  destinationName,
  hazardNodeIds = [],
  interactiveFireMode = false,
  onSelectNode,
}: RouteMapProps) {
  if (!map) return <Empty description="Không có dữ liệu tầng này" />

  const width = map.floor.mapWidth ?? 1200
  const height = map.floor.mapHeight ?? 760
  const floorSteps = routeSteps.filter((step) => step.floorId === map.floor.id)
  const nodeById = new Map(map.nodes.map((node) => [node.id, node]))
  const pathPoints = floorSteps.map((step) => `${step.x},${step.y}`).join(' ')

  const isDestinationFloor =
    routeSteps.length > 0 &&
    routeSteps[routeSteps.length - 1].floorId === map.floor.id
  const destinationStep = isDestinationFloor
    ? routeSteps[routeSteps.length - 1]
    : undefined

  return (
    <div
      className={`route-map${interactiveFireMode ? ' route-map--fire-mode' : ''}`}
      aria-label={`Bản đồ ${map.floor.name}`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="userRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
        </defs>

        {map.floor.mapImageUrl ? (
          <image
            href={map.floor.mapImageUrl}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        ) : (
          <rect width={width} height={height} className="route-map__fallback" />
        )}

        {/* Graph edges */}
        {map.edges.map((edge) => {
          const from = nodeById.get(edge.fromNodeId)
          const to = nodeById.get(edge.toNodeId)
          if (!from || !to) return null
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="route-map__graph"
            />
          )
        })}

        {/* Outer White Halo + Solid Royal Blue Route Path */}
        {pathPoints && (
          <polyline points={pathPoints} className="route-map__route-outline" />
        )}
        {pathPoints && (
          <polyline points={pathPoints} className="route-map__route" />
        )}

        {/* Regular Nodes */}
        {map.nodes.map((node) => {
          const isOnRoute = floorSteps.some((step) => step.nodeId === node.id)
          const isActive = activeStep?.nodeId === node.id
          if (isActive) return null // Handled with custom user radar below
          return (
            <g
              key={node.id}
              className="route-map__node"
              onClick={() => onSelectNode(node.id)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isOnRoute ? 12 : 8}
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
        {floorSteps.map((step, index) => {
          const isCurrent = activeStep?.nodeId === step.nodeId
          const isDest = destinationStep?.nodeId === step.nodeId
          if (isCurrent || isDest) return null

          return (
            <g key={`${step.nodeId}-${index}`} className="route-map__step-label">
              <circle cx={step.x} cy={step.y} r="13" />
              <text x={step.x} y={step.y + 4} textAnchor="middle">
                {index + 1}
              </text>
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
          .map((node) => (
            <g key={`hazard-${node.id}`} className="route-map__hazard" onClick={() => onSelectNode(node.id)}>
              <circle cx={node.x} cy={node.y} r="22" />
              <text x={node.x} y={node.y + 8} textAnchor="middle" fontSize="22">
                🔥
              </text>
            </g>
          ))}

        {/* Current User Location Arrow with Radar Wave (matching the photo) */}
        {activeStep && (
          <g transform={`translate(${activeStep.x}, ${activeStep.y})`}>
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
