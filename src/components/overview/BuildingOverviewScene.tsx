import { Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  Path,
  Shape,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three'
import type {
  BuildingOverview,
  OverviewEdge,
  OverviewNode,
  OverviewPoi,
  OverviewStore,
} from '../../api/navigation'
import type { CubiCasaPolygons, DetectedWall } from '../../api/floorPlanAnalysis'
import type { DetectedDoor } from '../../utils/wallDetection'

export type SelectedElement =
  | { type: 'node'; id: string; data: OverviewNode; floorName: string }
  | { type: 'poi'; id: string; data: OverviewPoi; floorName: string }
  | { type: 'store'; id: string; data: OverviewStore; floorName: string }
  | { type: 'link'; id: string; data: BuildingOverview['verticalLinks'][number]; floorName?: string }

export type VisibleLayers = {
  plans: boolean
  walls: boolean
  edges: boolean
  nodes: boolean
  pois: boolean
  verticalLinks: boolean
}

export type SimulatedRouteStep = {
  x: number
  y: number
  floorId: string
  instruction?: string
}

type SceneProps = {
  overview: BuildingOverview
  explodeFactor: number
  selectedFloorId: string | 'all'
  visibleLayers: VisibleLayers
  selectedElement: SelectedElement | null
  onSelectElement: (element: SelectedElement | null) => void
  cameraPreset?: 'perspective' | 'top' | 'front' | 'cutaway'
  onCameraPresetHandled?: () => void
  simulatedRoute?: SimulatedRouteStep[] | null
  wallHeight?: number
  wallThickness?: number
}

// Convert percentage coordinates (0-100) to 3D plane local positions
function toLocalCoords(
  x: number,
  y: number,
  planeWidth: number,
  planeHeight: number,
  mapWidth?: number | null,
  mapHeight?: number | null,
) {
  const normX = x > 100 && mapWidth ? (x / mapWidth) * 100 : Math.min(100, Math.max(0, x))
  const normY = y > 100 && mapHeight ? (y / mapHeight) * 100 : Math.min(100, Math.max(0, y))

  const localX = (normX / 100 - 0.5) * planeWidth
  const localZ = (normY / 100 - 0.5) * planeHeight

  return { localX, localZ, normX, normY }
}

function getNodeColor(type: string, isSelected: boolean) {
  if (isSelected) return '#ffffff'
  switch (type.toUpperCase()) {
    case 'ELEVATOR':
      return '#c084fc'
    case 'ESCALATOR':
      return '#34d399'
    case 'STAIR':
      return '#fbbf24'
    case 'ENTRANCE':
      return '#f87171'
    case 'EXIT':
    case 'EMERGENCY_EXIT':
      return '#10b981'
    default:
      return '#38bdf8'
  }
}

function getPoiCategoryIcon(category: string) {
  const cat = category.toUpperCase()
  if (cat.includes('FOOD') || cat.includes('CAFE') || cat.includes('RESTAURANT')) return '☕'
  if (cat.includes('RESTROOM') || cat.includes('TOILET') || cat.includes('WC')) return '🚻'
  if (cat.includes('ELEVATOR')) return '🛗'
  if (cat.includes('ESCALATOR') || cat.includes('STAIR')) return '🪜'
  if (cat.includes('EXIT') || cat.includes('ENTRANCE')) return '🚪'
  if (cat.includes('INFO')) return 'ℹ️'
  if (cat.includes('ATM')) return '🏧'
  return '🛍️'
}

// Camera controller component
function CameraController({
  preset,
  onHandled,
  highestElevation,
  maxDimension,
}: {
  preset?: 'perspective' | 'top' | 'front' | 'cutaway'
  onHandled?: () => void
  highestElevation: number
  maxDimension: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const highestElevationRef = useRef(highestElevation)
  highestElevationRef.current = highestElevation
  const maxDimensionRef = useRef(maxDimension)
  maxDimensionRef.current = maxDimension
  const onHandledRef = useRef(onHandled)
  onHandledRef.current = onHandled

  useEffect(() => {
    if (!preset) return
    const curElev = highestElevationRef.current
    const curDim = maxDimensionRef.current
    const midY = curElev / 2
    const dist = curDim * 1.6

    if (preset === 'cutaway') {
      camera.position.set(dist * 0.95, curElev + 8, dist * 0.95)
      controlsRef.current?.target.set(0, midY * 0.7, 0)
    } else if (preset === 'perspective') {
      camera.position.set(dist * 0.9, curElev + 10, dist * 0.9)
      controlsRef.current?.target.set(0, midY, 0)
    } else if (preset === 'top') {
      camera.position.set(0, curElev + dist * 1.5, 0.001)
      controlsRef.current?.target.set(0, midY, 0)
    } else if (preset === 'front') {
      camera.position.set(0, midY + 2, dist * 1.8)
      controlsRef.current?.target.set(0, midY, 0)
    }
    controlsRef.current?.update()
    onHandledRef.current?.()
  }, [preset, camera])

  return <OrbitControls ref={controlsRef} makeDefault minDistance={4} maxDistance={95} />
}

// ── CUBICASA5K ARCHITECTURAL EXTRUDER (POLYGONS WITH HOLES & OPENINGS) ──
function CubiCasaExtrudedArchitecture({
  polygons,
  width,
  height,
  wallHeight = 0.8,
  isDimmed = false,
}: {
  polygons: CubiCasaPolygons
  width: number
  height: number
  wallHeight?: number
  isDimmed?: boolean
}) {
  const wallShapes = useMemo(() => {
    return (polygons.wall ?? []).map((poly, idx) => {
      try {
        const shape = new Shape()
        poly.outer.forEach(([px, py], i) => {
          const sx = (px / 100 - 0.5) * width
          const sy = (0.5 - py / 100) * height
          if (i === 0) shape.moveTo(sx, sy)
          else shape.lineTo(sx, sy)
        })
        shape.closePath()

        for (const hole of poly.holes ?? []) {
          const path = new Path()
          hole.forEach(([px, py], i) => {
            const sx = (px / 100 - 0.5) * width
            const sy = (0.5 - py / 100) * height
            if (i === 0) path.moveTo(sx, sy)
            else path.lineTo(sx, sy)
          })
          path.closePath()
          shape.holes.push(path)
        }
        return { id: `wall-poly-${idx}`, shape }
      } catch {
        return null
      }
    }).filter(Boolean) as { id: string; shape: Shape }[]
  }, [polygons.wall, width, height])

  const doorShapes = useMemo(() => {
    return (polygons.door ?? []).map((poly, idx) => {
      try {
        const shape = new Shape()
        poly.outer.forEach(([px, py], i) => {
          const sx = (px / 100 - 0.5) * width
          const sy = (0.5 - py / 100) * height
          if (i === 0) shape.moveTo(sx, sy)
          else shape.lineTo(sx, sy)
        })
        shape.closePath()
        return { id: `door-poly-${idx}`, shape }
      } catch {
        return null
      }
    }).filter(Boolean) as { id: string; shape: Shape }[]
  }, [polygons.door, width, height])

  const windowShapes = useMemo(() => {
    return (polygons.window ?? []).map((poly, idx) => {
      try {
        const shape = new Shape()
        poly.outer.forEach(([px, py], i) => {
          const sx = (px / 100 - 0.5) * width
          const sy = (0.5 - py / 100) * height
          if (i === 0) shape.moveTo(sx, sy)
          else shape.lineTo(sx, sy)
        })
        shape.closePath()
        return { id: `window-poly-${idx}`, shape }
      } catch {
        return null
      }
    }).filter(Boolean) as { id: string; shape: Shape }[]
  }, [polygons.window, width, height])

  const wallOpacity = isDimmed ? 0.35 : 0.95
  const wallDepth = wallHeight
  const doorDepth = wallHeight * 0.28
  const windowDepth = wallHeight * 0.5

  return (
    <group>
      {/* 1. Solid Extruded Walls with Doorway/Window Holes */}
      {wallShapes.map(({ id, shape }) => (
        <group key={id} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[shape, { depth: wallDepth, bevelEnabled: false }]} />
            <meshStandardMaterial
              color={isDimmed ? '#94a3b8' : '#f1f5f9'}
              roughness={0.4}
              metalness={0.1}
              transparent={isDimmed}
              opacity={wallOpacity}
            />
          </mesh>
        </group>
      ))}

      {/* 2. Doorway Lintels (Suspended at the top, leaving open passage below) */}
      {doorShapes.map(({ id, shape }) => (
        <group key={id} position={[0, wallHeight - doorDepth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[shape, { depth: doorDepth, bevelEnabled: false }]} />
            <meshStandardMaterial
              color="#cbd5e1"
              roughness={0.5}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      ))}

      {/* 3. Window Glass Slabs */}
      {windowShapes.map(({ id, shape }) => (
        <group key={id} position={[0, wallHeight * 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <extrudeGeometry args={[shape, { depth: windowDepth, bevelEnabled: false }]} />
            <meshStandardMaterial
              color="#38bdf8"
              transparent
              opacity={0.55}
              roughness={0.1}
              metalness={0.1}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── 3D EXTRUDED PARTITION WALLS (VÁCH TƯỜNG 3D THEO THỰC TẾ ẢNH SƠ ĐỒ ĐƯỢC IMPORT) ──
function ExtrudedWalls({
  walls,
  doors = [],
  width,
  height,
  wallHeight = 0.75,
  wallThickness = 0.08,
  isDimmed = false,
}: {
  walls: DetectedWall[]
  doors?: DetectedDoor[]
  width: number
  height: number
  wallHeight?: number
  wallThickness?: number
  isDimmed?: boolean
}) {
  const wallMatColor = isDimmed ? '#94a3b8' : '#f8fafc'
  const opacity = isDimmed ? 0.35 : 1
  const t = Math.max(0.015, wallThickness)
  const h = wallHeight
  const cY = h / 2

  // Thu thập các điểm nút góc tường (Corners) để render cột mộng góc liên kết liền mạch 100%
  const cornerJoints = useMemo(() => {
    const points: Array<{ x: number; z: number }> = []
    walls.forEach((wall) => {
      const p1 = toLocalCoords(wall.x1, wall.y1, width, height)
      const p2 = toLocalCoords(wall.x2, wall.y2, width, height)
      points.push({ x: p1.localX, z: p1.localZ }, { x: p2.localX, z: p2.localZ })
    })

    // Lọc các điểm giao nhau (nằm gần nhau <= 0.12m)
    const uniqueCorners: Array<{ x: number; z: number }> = []
    points.forEach((pt) => {
      const exists = uniqueCorners.some((c) => Math.hypot(c.x - pt.x, c.z - pt.z) < 0.1)
      if (!exists) uniqueCorners.push(pt)
    })
    return uniqueCorners
  }, [walls, width, height])

  return (
    <group>
      {/* 1. Các đoạn vách tường chính - Khóa khít góc bằng cách mở rộng chiều dài thêm t * 0.95 */}
      {walls.map((wall) => {
        const p1 = toLocalCoords(wall.x1, wall.y1, width, height)
        const p2 = toLocalCoords(wall.x2, wall.y2, width, height)

        const dx = p2.localX - p1.localX
        const dz = p2.localZ - p1.localZ
        const length = Math.sqrt(dx * dx + dz * dz)
        if (length < 0.05) return null

        const midX = (p1.localX + p2.localX) / 2
        const midZ = (p1.localZ + p2.localZ) / 2
        const angle = -Math.atan2(dz, dx)
        // Chiều dài vách cộng thêm t * 0.95 để 2 vách vuông góc lồng khít vào nhau không để lại khe hở
        const interlockedLength = length + t * 0.95
        const trimColor = isDimmed ? '#64748b' : '#94a3b8'

        return (
          <group key={wall.id} position={[midX, cY, midZ]} rotation={[0, angle, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[interlockedLength, h, t]} />
              <meshStandardMaterial
                color={wallMatColor}
                roughness={0.7}
                transparent={isDimmed}
                opacity={opacity}
              />
            </mesh>
            {/* Gờ nẹp kiến trúc mặt trên vách tường tiệp màu tường */}
            <mesh position={[0, h / 2 + 0.005, 0]}>
              <boxGeometry args={[interlockedLength, 0.01, t * 1.02]} />
              <meshStandardMaterial color={trimColor} roughness={0.5} />
            </mesh>
          </group>
        )
      })}

      {/* 2. Cột mộng góc tường liên kết liền mạch (Corner Joint Posts) */}
      {cornerJoints.map((corner, idx) => (
        <group key={`corner-joint-${idx}`} position={[corner.x, cY, corner.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[t * 1.05, h, t * 1.05]} />
            <meshStandardMaterial
              color={wallMatColor}
              roughness={0.7}
              transparent={isDimmed}
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, h / 2 + 0.005, 0]}>
            <boxGeometry args={[t * 1.06, 0.01, t * 1.06]} />
            <meshStandardMaterial color={isDimmed ? '#64748b' : '#94a3b8'} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* 3. Cửa đi tượng trưng mờ mờ, tối giản và thanh thoát (không làm mái / không kéo dài) */}
      {doors.map((door) => {
        const pos = toLocalCoords(door.x, door.y, width, height)
        const isHoriz = door.orientation === 'horizontal'
        // Chiều rộng cửa gọn gàng chuẩn hóa (0.5m), không bị kéo dài
        const doorWidth3D = 0.52
        const doorRotation = isHoriz ? 0 : Math.PI / 2

        return (
          <group key={door.id} position={[pos.localX, 0, pos.localZ]} rotation={[0, doorRotation, 0]}>
            {/* 1. Vệt sàn mờ tượng trưng cho lối qua cửa */}
            <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[doorWidth3D, t * 1.4]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent
                opacity={0.3}
                depthWrite={false}
              />
            </mesh>

            {/* 2. Khối kính mờ mờ tượng trưng cho cánh cửa hé mở, nhẹ nhàng không che tầm nhìn */}
            <mesh position={[0, h * 0.32, 0]}>
              <boxGeometry args={[doorWidth3D * 0.85, h * 0.64, t * 0.3]} />
              <meshStandardMaterial
                color="#67e8f9"
                transparent
                opacity={0.16}
                roughness={0.1}
                metalness={0.1}
              />
            </mesh>

            {/* 3. Khung viền mỏng tinh tế cho lối cửa */}
            <lineSegments position={[0, h * 0.32, 0]}>
              <edgesGeometry args={[new BoxGeometry(doorWidth3D * 0.85, h * 0.64, t * 0.3)]} />
              <lineBasicMaterial color="#38bdf8" transparent opacity={0.35} />
            </lineSegments>
          </group>
        )
      })}
    </group>
  )
}

// Single Floor Plane Component
function FloorPlane({
  floor,
  elevation,
  isIsolated,
  isDimmed,
  showPlan,
  showWalls,
  wallHeight,
  wallThickness = 0.08,
}: {
  floor: BuildingOverview['floors'][number]
  elevation: number
  isIsolated: boolean
  isDimmed: boolean
  showPlan: boolean
  showWalls: boolean
  wallHeight: number
  wallThickness?: number
}) {
  const [texture, setTexture] = useState<Texture>()
  const width = Math.max(6, (floor.mapWidth ?? 1200) / 100)
  const height = Math.max(4, (floor.mapHeight ?? 760) / 100)
  const draftPolygons = floor.mapRevision?.editorState?.polygons

  const [walls, setWalls] = useState<DetectedWall[]>([])
  const [doors, setDoors] = useState<DetectedDoor[]>([])

  useEffect(() => {
    const draftWalls = floor.mapRevision?.editorState?.walls
    const draftDoors = floor.mapRevision?.editorState?.doors
    // A 2.5D wall layer is shown only from a server-side revision.  Never
    // infer geometry in the browser or restore an old browser cache: before
    // the user presses Analyze, the source plan must remain a flat image.
    if (Array.isArray(draftWalls) && draftWalls.length > 0) {
      setWalls(draftWalls)
      if (Array.isArray(draftDoors) && draftDoors.length > 0) {
        setDoors(draftDoors)
      } else {
        setDoors([])
      }
      return
    }

    setWalls([])
    setDoors([])
  }, [floor.id, floor.mapRevision?.version, floor.mapImageUrl])

  useEffect(() => {
    if (!floor.mapImageUrl) {
      setTexture(undefined)
      return
    }
    let active = true

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = floor.mapImageUrl
    img.onload = () => {
      if (!active) return
      const tex = new CanvasTexture(img)
      tex.colorSpace = SRGBColorSpace
      tex.needsUpdate = true
      setTexture(tex)
    }
    img.onerror = () => {
      const loader = new TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(floor.mapImageUrl!, (loaded) => {
        if (!active) return
        loaded.colorSpace = SRGBColorSpace
        loaded.needsUpdate = true
        setTexture(loaded)
      })
    }

    return () => {
      active = false
    }
  }, [floor.mapImageUrl])

  return (
    <group position={[0, elevation, 0]} visible={!isDimmed || isIsolated}>
      {/* Floor Plan Surface / Architectural Tiled Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        {showPlan && texture ? (
          <meshBasicMaterial
            key={`tex-${texture.id}`}
            map={texture}
            side={DoubleSide}
            toneMapped={false}
            transparent={isDimmed}
            opacity={isDimmed ? 0.25 : 1}
          />
        ) : (
          <meshStandardMaterial
            key="clay-floor"
            color="#f1f5f9"
            roughness={0.7}
            side={DoubleSide}
            transparent={isDimmed}
            opacity={isDimmed ? 0.25 : 1}
          />
        )}
      </mesh>

      {/* Blueprint Grid Slab Base */}
      <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 0.4, height + 0.4]} />
        <meshStandardMaterial
          color="#0f0c22"
          roughness={0.9}
          transparent={isDimmed}
          opacity={isDimmed ? 0.2 : 0.95}
        />
      </mesh>

      {/* Glass balustrade / border around floor slab */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[width + 0.35, 0.24, height + 0.35]} />
        <meshStandardMaterial
          color="#a78bfa"
          transparent
          opacity={0.12}
          roughness={0.1}
          wireframe
        />
      </mesh>

      {/* ── 3D EXTRACTED PARTITION WALLS (CUBICASA5K POLYGONS OR LINE WALLS) ── */}
      {showWalls && (
        draftPolygons?.wall && draftPolygons.wall.length > 0 ? (
          <CubiCasaExtrudedArchitecture
            polygons={draftPolygons}
            width={width}
            height={height}
            wallHeight={wallHeight}
            isDimmed={isDimmed}
          />
        ) : walls.length > 0 ? (
          <ExtrudedWalls
            walls={walls}
            doors={doors}
            width={width}
            height={height}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
            isDimmed={isDimmed}
          />
        ) : null
      )}

      {/* Floating Floor Level Tag */}
      <Html position={[-width / 2 - 0.2, 0.4, -height / 2]} distanceFactor={15} transform>
        <div
          style={{
            color: '#e2e8f0',
            background: isIsolated
              ? 'rgba(139, 92, 246, 0.95)'
              : 'rgba(15, 12, 34, 0.88)',
            border: isIsolated
              ? '1px solid #c084fc'
              : '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.7)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Tầng {floor.floorNumber} · {floor.name}
        </div>
      </Html>
    </group>
  )
}

// 3D Interactive Node Component
function InteractiveNode({
  node,
  floor,
  elevation,
  isSelected,
  planeWidth,
  planeHeight,
  onSelect,
}: {
  node: OverviewNode
  floor: BuildingOverview['floors'][number]
  elevation: number
  isSelected: boolean
  planeWidth: number
  planeHeight: number
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const { localX, localZ } = toLocalCoords(
    node.x,
    node.y,
    planeWidth,
    planeHeight,
    floor.mapWidth,
    floor.mapHeight,
  )

  const color = getNodeColor(node.type, isSelected)
  const radius = isSelected ? 0.32 : hovered ? 0.28 : 0.22

  return (
    <group position={[localX, elevation + 0.16, localZ]}>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[0.38, 0.54, 32]} />
          <meshBasicMaterial color="#38bdf8" side={DoubleSide} />
        </mesh>
      )}

      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.2 : hovered ? 0.8 : 0.45}
          roughness={0.2}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Html position={[0, 0.45, 0]} center distanceFactor={14}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.94)',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            Node {node.type} ({Math.round(node.x)}%, {Math.round(node.y)}%)
          </div>
        </Html>
      )}
    </group>
  )
}

// ── 3D ARCHITECTURAL ROOM BLOCK (KHỐI PHÒNG 3D NỔI THEO KHU VỰC - HƯỚNG 2) ──
function ArchitecturalRoomBlock3D({
  poi,
  floor,
  elevation,
  planeWidth,
  planeHeight,
  isSelected,
  onSelect,
  isStore = false,
  roomHeight = 0.8,
  roomScale = 1.0,
}: {
  poi: { id: string; name: string; category?: string; status?: string; x?: number; y?: number }
  floor: BuildingOverview['floors'][number]
  elevation: number
  planeWidth: number
  planeHeight: number
  isSelected: boolean
  onSelect: () => void
  isStore?: boolean
  roomHeight?: number
  roomScale?: number
}) {
  const [hovered, setHovered] = useState(false)
  const icon = getPoiCategoryIcon(poi.category ?? (isStore ? 'STORE' : 'OTHER'))
  const { localX, localZ } = toLocalCoords(
    poi.x ?? 50,
    poi.y ?? 50,
    planeWidth,
    planeHeight,
    floor.mapWidth,
    floor.mapHeight,
  )

  const theme = useMemo(() => {
    const cat = (poi.category ?? (isStore ? 'STORE' : 'CUSTOM')).toUpperCase()
    switch (cat) {
      case 'STORE':
        return {
          fill: '#f59e0b',
          glow: '#fbbf24',
          label: 'Gian hàng',
          tagBg: '#b45309',
        }
      case 'RESTROOM':
        return {
          fill: '#0d9488',
          glow: '#2dd4bf',
          label: 'WC',
          tagBg: '#0f766e',
        }
      case 'ELEVATOR':
        return {
          fill: '#7c3aed',
          glow: '#a78bfa',
          label: 'Thang máy',
          tagBg: '#6d28d9',
        }
      case 'EXIT':
        return {
          fill: '#059669',
          glow: '#34d399',
          label: 'Thoát hiểm',
          tagBg: '#047857',
        }
      case 'INFO':
        return {
          fill: '#0284c7',
          glow: '#38bdf8',
          label: 'Thông tin',
          tagBg: '#0369a1',
        }
      default:
        return {
          fill: '#3b82f6',
          glow: '#60a5fa',
          label: 'Phòng',
          tagBg: '#1d4ed8',
        }
    }
  }, [poi.category, isStore])

  const blockW = Math.max(0.7, 1.25 * roomScale)
  const blockD = Math.max(0.7, 1.25 * roomScale)
  const blockH = Math.max(0.25, roomHeight)
  const scale = isSelected ? 1.05 : hovered ? 1.03 : 1.0

  return (
    <group position={[localX, elevation, localZ]} scale={[scale, scale, scale]}>
      {/* 3D Extruded Architectural Room Volume */}
      <mesh
        position={[0, blockH / 2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[blockW, blockH, blockD]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : theme.fill}
          emissive={isSelected ? '#0284c7' : theme.glow}
          emissiveIntensity={isSelected ? 0.9 : hovered ? 0.55 : 0.22}
          transparent
          opacity={0.82}
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* Crisp Architectural Wireframe Edge Outlines */}
      <lineSegments position={[0, blockH / 2, 0]}>
        <edgesGeometry args={[new BoxGeometry(blockW, blockH, blockD)]} />
        <lineBasicMaterial
          color={isSelected ? '#38bdf8' : hovered ? '#ffffff' : theme.glow}
        />
      </lineSegments>

      {/* Entrance Doorway Cutout Indicator */}
      <mesh position={[0, (blockH * 0.65) / 2, blockD / 2 + 0.01]}>
        <planeGeometry args={[blockW * 0.38, blockH * 0.65]} />
        <meshBasicMaterial color="#0b0f19" side={DoubleSide} />
      </mesh>

      {/* Ground Projection Halo when selected */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[blockW * 1.35, blockD * 1.35]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Floating 3D Room Title Badge */}
      <Html position={[0, blockH + 0.42, 0]} center distanceFactor={13}>
        <div
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          style={{
            background: isSelected
              ? 'rgba(2, 132, 199, 0.96)'
              : hovered
                ? 'rgba(30, 27, 75, 0.96)'
                : 'rgba(15, 23, 42, 0.90)',
            border: isSelected
              ? '1.5px solid #38bdf8'
              : `1px solid ${theme.glow}`,
            color: '#ffffff',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            boxShadow: isSelected
              ? '0 0 16px rgba(56, 189, 248, 0.65)'
              : '0 4px 12px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            backdropFilter: 'blur(4px)',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: '12px' }}>{icon}</span>
          <span>{poi.name}</span>
          <span
            style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: 3,
              background: theme.tagBg,
              opacity: 0.95,
            }}
          >
            {theme.label}
          </span>
        </div>
      </Html>
    </group>
  )
}

const InteractivePoiMarker = ArchitecturalRoomBlock3D

// 3D Walkway Edges Component
function WalkwayEdges({
  edges,
  nodesMap,
  floorsMap,
  floorElevations,
  selectedElement,
}: {
  edges: OverviewEdge[]
  nodesMap: Map<string, OverviewNode>
  floorsMap: Map<string, BuildingOverview['floors'][number]>
  floorElevations: Map<string, number>
  selectedElement: SelectedElement | null
}) {
  const selectedNodeId = selectedElement?.type === 'node' ? selectedElement.id : null

  return (
    <group>
      {edges.map((edge) => {
        const fromNode = nodesMap.get(edge.fromNodeId)
        const toNode = nodesMap.get(edge.toNodeId)
        const floor = floorsMap.get(edge.floorId)
        const elevation = floorElevations.get(edge.floorId) ?? 0

        if (!fromNode || !toNode || !floor) return null

        const planeWidth = Math.max(6, (floor.mapWidth ?? 1200) / 100)
        const planeHeight = Math.max(4, (floor.mapHeight ?? 760) / 100)

        const from = toLocalCoords(
          fromNode.x,
          fromNode.y,
          planeWidth,
          planeHeight,
          floor.mapWidth,
          floor.mapHeight,
        )
        const to = toLocalCoords(
          toNode.x,
          toNode.y,
          planeWidth,
          planeHeight,
          floor.mapWidth,
          floor.mapHeight,
        )

        const isHighlighted =
          selectedNodeId === edge.fromNodeId || selectedNodeId === edge.toNodeId

        return (
          <Line
            key={edge.id}
            points={[
              new Vector3(from.localX, elevation + 0.12, from.localZ),
              new Vector3(to.localX, elevation + 0.12, to.localZ),
            ]}
            color={isHighlighted ? '#ec4899' : '#0284c7'}
            lineWidth={isHighlighted ? 4 : 2}
            transparent
            opacity={isHighlighted ? 1 : 0.75}
          />
        )
      })}
    </group>
  )
}

// 3D Elevator Shaft / Vertical Links
function ElevatorShafts({
  links,
  nodesMap,
  floorsMap,
  floorElevations,
  selectedElement,
  onSelect,
}: {
  links: BuildingOverview['verticalLinks']
  nodesMap: Map<string, OverviewNode>
  floorsMap: Map<string, BuildingOverview['floors'][number]>
  floorElevations: Map<string, number>
  selectedElement: SelectedElement | null
  onSelect: (link: BuildingOverview['verticalLinks'][number]) => void
}) {
  return (
    <group>
      {links.map((link, idx) => {
        const fromNode = nodesMap.get(link.nodeIdFrom)
        const toNode = nodesMap.get(link.nodeIdTo)
        if (!fromNode || !toNode) return null

        const fromFloor = floorsMap.get(fromNode.floorId)
        const toFloor = floorsMap.get(toNode.floorId)
        if (!fromFloor || !toFloor) return null

        const elevFrom = floorElevations.get(fromNode.floorId) ?? 0
        const elevTo = floorElevations.get(toNode.floorId) ?? 0

        const planeWidth = Math.max(6, (fromFloor.mapWidth ?? 1200) / 100)
        const planeHeight = Math.max(4, (fromFloor.mapHeight ?? 760) / 100)

        const from = toLocalCoords(
          fromNode.x,
          fromNode.y,
          planeWidth,
          planeHeight,
          fromFloor.mapWidth,
          fromFloor.mapHeight,
        )

        const height = Math.abs(elevTo - elevFrom)
        const midY = (elevFrom + elevTo) / 2
        const isSelected = selectedElement?.type === 'link' && selectedElement.id === (link.id ?? `link-${idx}`)

        return (
          <group key={link.id ?? `link-${idx}`} position={[from.localX, midY, from.localZ]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation()
                onSelect(link)
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto'
              }}
            >
              <cylinderGeometry args={[0.35, 0.35, Math.max(0.5, height), 16]} />
              <meshStandardMaterial
                color={isSelected ? '#f43f5e' : '#a855f7'}
                emissive={isSelected ? '#ec4899' : '#7c3aed'}
                emissiveIntensity={isSelected ? 1.0 : 0.6}
                transparent
                opacity={isSelected ? 0.75 : 0.4}
                roughness={0.1}
              />
            </mesh>

            <mesh>
              <cylinderGeometry args={[0.08, 0.08, Math.max(0.5, height), 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ── 3D Glowing Navigation Route Tube across floors ──
function RouteSpline3D({
  steps,
  floorsMap,
  floorElevations,
}: {
  steps: SimulatedRouteStep[]
  floorsMap: Map<string, BuildingOverview['floors'][number]>
  floorElevations: Map<string, number>
}) {
  const points = useMemo(() => {
    if (steps.length < 2) return []

    const pts: Vector3[] = []
    steps.forEach((step, idx) => {
      const floor = floorsMap.get(step.floorId)
      if (!floor) return
      const elevation = floorElevations.get(step.floorId) ?? 0
      const planeWidth = Math.max(6, (floor.mapWidth ?? 1200) / 100)
      const planeHeight = Math.max(4, (floor.mapHeight ?? 760) / 100)

      const coords = toLocalCoords(
        step.x,
        step.y,
        planeWidth,
        planeHeight,
        floor.mapWidth,
        floor.mapHeight,
      )

      const currentPt = new Vector3(coords.localX, elevation + 0.18, coords.localZ)

      if (idx > 0) {
        const prevStep = steps[idx - 1]
        if (prevStep.floorId !== step.floorId) {
          const prevElev = floorElevations.get(prevStep.floorId) ?? 0
          const prevFloor = floorsMap.get(prevStep.floorId)
          if (prevFloor) {
            const prevW = Math.max(6, (prevFloor.mapWidth ?? 1200) / 100)
            const prevH = Math.max(4, (prevFloor.mapHeight ?? 760) / 100)
            const prevCoords = toLocalCoords(
              prevStep.x,
              prevStep.y,
              prevW,
              prevH,
              prevFloor.mapWidth,
              prevFloor.mapHeight,
            )

            const midY = (prevElev + elevation) / 2 + 0.18
            const midX = (prevCoords.localX + coords.localX) / 2
            const midZ = (prevCoords.localZ + coords.localZ) / 2
            pts.push(new Vector3(midX, midY, midZ))
          }
        }
      }

      pts.push(currentPt)
    })

    return pts
  }, [steps, floorsMap, floorElevations])

  const curve = useMemo(() => {
    if (points.length < 2) return null
    return new CatmullRomCurve3(points, false, 'catmullrom', 0.2)
  }, [points])

  if (!curve || points.length < 2) return null

  const startPt = points[0]
  const endPt = points[points.length - 1]

  return (
    <group>
      {/* 3D Glowing Route Tube (Electric Royal Blue matching the photo) */}
      <mesh>
        <tubeGeometry args={[curve, 140, 0.14, 12, false]} />
        <meshStandardMaterial
          color="#1d4ed8"
          emissive="#38bdf8"
          emissiveIntensity={2.2}
          roughness={0.1}
          toneMapped={false}
        />
      </mesh>

      {/* Start Radar Beacon (Pulsing ground radar aura) */}
      <group position={[startPt.x, startPt.y, startPt.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <ringGeometry args={[0.35, 0.8, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#2563eb" emissive="#60a5fa" emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* Destination Teardrop 3D Pin (matching the photo) */}
      <group position={[endPt.x, endPt.y, endPt.z]}>
        <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <sphereGeometry args={[0.4, 24, 24]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#2563eb" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0.92, 0.3]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.48, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.24, 0.56, 24]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#2563eb" emissiveIntensity={0.7} />
        </mesh>
      </group>
    </group>
  )
}

export function BuildingOverviewScene({
  overview,
  explodeFactor,
  selectedFloorId,
  visibleLayers,
  selectedElement,
  onSelectElement,
  cameraPreset,
  onCameraPresetHandled,
  simulatedRoute,
  wallHeight = 0.75,
  wallThickness = 0.08,
}: SceneProps) {
  const sortedFloors = useMemo(() => {
    return [...overview.floors].sort((a, b) => a.floorNumber - b.floorNumber)
  }, [overview.floors])

  const defaultFloorHeight = overview.building.defaultFloorHeight || 4

  const floorElevations = useMemo(() => {
    const map = new Map<string, number>()
    const minElev = sortedFloors[0]?.elevation ?? 0
    sortedFloors.forEach((f, idx) => {
      const baseline = (f.elevation ?? idx * defaultFloorHeight) - minElev
      map.set(f.id, baseline * explodeFactor)
    })
    return map
  }, [sortedFloors, defaultFloorHeight, explodeFactor])

  const floorsMap = useMemo(() => new Map(overview.floors.map((f) => [f.id, f])), [overview.floors])
  const nodesMap = useMemo(() => new Map((overview.nodes ?? []).map((n) => [n.id, n])), [overview.nodes])

  const resolvedPois = useMemo(() => {
    return (overview.pois ?? []).map((poi) => {
      const node = nodesMap.get(poi.nodeId)
      return {
        ...poi,
        x: poi.x ?? node?.x ?? 50,
        y: poi.y ?? node?.y ?? 50,
      }
    })
  }, [overview.pois, nodesMap])

  const resolvedStores = useMemo(() => {
    return (overview.stores ?? []).map((store) => {
      const node = store.nodeId ? nodesMap.get(store.nodeId) : undefined
      return {
        ...store,
        x: store.x ?? node?.x ?? 50,
        y: store.y ?? node?.y ?? 50,
      }
    })
  }, [overview.stores, nodesMap])

  const maxDim = useMemo(() => {
    return Math.max(
      ...overview.floors.map((f) =>
        Math.max((f.mapWidth ?? 1200) / 100, (f.mapHeight ?? 760) / 100),
      ),
      8,
    )
  }, [overview.floors])

  const highestElevation = useMemo(() => {
    return Math.max(0, ...Array.from(floorElevations.values()))
  }, [floorElevations])

  const cameraDistance = maxDim * 1.5

  return (
    <Canvas
      shadows
      camera={{
        position: [cameraDistance * 0.95, highestElevation + 12, cameraDistance * 0.95],
        fov: 40,
      }}
      onPointerMissed={() => onSelectElement(null)}
    >
      <color attach="background" args={['#090717']} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[18, 30, 18]} intensity={1.4} castShadow />
      <directionalLight position={[-18, 20, -18]} intensity={0.5} />
      <pointLight position={[0, highestElevation + 10, 0]} intensity={0.4} />

      <CameraController
        preset={cameraPreset}
        onHandled={onCameraPresetHandled}
        highestElevation={highestElevation}
        maxDimension={maxDim}
      />

      {/* 3D Floors with Extruded Partition Walls */}
      {sortedFloors.map((floor) => {
        const isIsolated = selectedFloorId === floor.id
        const isDimmed = selectedFloorId !== 'all' && selectedFloorId !== floor.id
        const elevation = floorElevations.get(floor.id) ?? 0

        return (
          <FloorPlane
            key={floor.id}
            floor={floor}
            elevation={elevation}
            isIsolated={isIsolated}
            isDimmed={isDimmed}
            showPlan={visibleLayers.plans}
            showWalls={visibleLayers.walls}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
          />
        )
      })}

      {/* 3D Glowing Cross-Floor Navigation Ribbon/Tube */}
      {simulatedRoute && simulatedRoute.length >= 2 && (
        <RouteSpline3D
          steps={simulatedRoute}
          floorsMap={floorsMap}
          floorElevations={floorElevations}
        />
      )}

      {/* 3D Walkway Edges */}
      {visibleLayers.edges && overview.edges && (
        <WalkwayEdges
          edges={
            selectedFloorId === 'all'
              ? overview.edges
              : overview.edges.filter((e) => e.floorId === selectedFloorId)
          }
          nodesMap={nodesMap}
          floorsMap={floorsMap}
          floorElevations={floorElevations}
          selectedElement={selectedElement}
        />
      )}

      {/* 3D Elevator Shafts */}
      {visibleLayers.verticalLinks && overview.verticalLinks && (
        <ElevatorShafts
          links={overview.verticalLinks}
          nodesMap={nodesMap}
          floorsMap={floorsMap}
          floorElevations={floorElevations}
          selectedElement={selectedElement}
          onSelect={(link) =>
            onSelectElement({
              type: 'link',
              id: link.id ?? 'elevator-link',
              data: link,
            })
          }
        />
      )}

      {/* 3D Nodes */}
      {visibleLayers.nodes &&
        (overview.nodes ?? []).map((node) => {
          if (selectedFloorId !== 'all' && selectedFloorId !== node.floorId) return null
          const floor = floorsMap.get(node.floorId)
          if (!floor) return null
          const elevation = floorElevations.get(node.floorId) ?? 0
          const planeWidth = Math.max(6, (floor.mapWidth ?? 1200) / 100)
          const planeHeight = Math.max(4, (floor.mapHeight ?? 760) / 100)
          const isSelected = selectedElement?.type === 'node' && selectedElement.id === node.id

          return (
            <InteractiveNode
              key={node.id}
              node={node}
              floor={floor}
              elevation={elevation}
              isSelected={isSelected}
              planeWidth={planeWidth}
              planeHeight={planeHeight}
              onSelect={() =>
                onSelectElement({
                  type: 'node',
                  id: node.id,
                  data: node,
                  floorName: floor.name,
                })
              }
            />
          )
        })}

      {/* 3D POIs & Zoned Room Blocks */}
      {(visibleLayers.pois || visibleLayers.walls) &&
        resolvedPois.map((poi) => {
          if (selectedFloorId !== 'all' && selectedFloorId !== poi.floorId) return null
          const floor = floorsMap.get(poi.floorId)
          if (!floor) return null
          const elevation = floorElevations.get(poi.floorId) ?? 0
          const planeWidth = Math.max(6, (floor.mapWidth ?? 1200) / 100)
          const planeHeight = Math.max(4, (floor.mapHeight ?? 760) / 100)
          const isSelected = selectedElement?.type === 'poi' && selectedElement.id === poi.id

          return (
            <InteractivePoiMarker
              key={poi.id}
              poi={poi}
              floor={floor}
              elevation={elevation}
              planeWidth={planeWidth}
              planeHeight={planeHeight}
              isSelected={isSelected}
              roomHeight={wallHeight}
              roomScale={wallThickness / 0.08}
              onSelect={() =>
                onSelectElement({
                  type: 'poi',
                  id: poi.id,
                  data: poi,
                  floorName: floor.name,
                })
              }
            />
          )
        })}

      {/* 3D Stores & Zoned Room Blocks */}
      {(visibleLayers.pois || visibleLayers.walls) &&
        resolvedStores.map((store) => {
          if (selectedFloorId !== 'all' && selectedFloorId !== store.floorId) return null
          const floor = floorsMap.get(store.floorId)
          if (!floor) return null
          const elevation = floorElevations.get(store.floorId) ?? 0
          const planeWidth = Math.max(6, (floor.mapWidth ?? 1200) / 100)
          const planeHeight = Math.max(4, (floor.mapHeight ?? 760) / 100)
          const isSelected = selectedElement?.type === 'store' && selectedElement.id === store.id

          return (
            <InteractivePoiMarker
              key={store.id}
              poi={store}
              floor={floor}
              elevation={elevation}
              planeWidth={planeWidth}
              planeHeight={planeHeight}
              isSelected={isSelected}
              isStore
              roomHeight={wallHeight}
              roomScale={wallThickness / 0.08}
              onSelect={() =>
                onSelectElement({
                  type: 'store',
                  id: store.id,
                  data: store,
                  floorName: floor.name,
                })
              }
            />
          )
        })}

      {/* Architectural ground grid */}
      <gridHelper args={[55, 55, '#6366f1', '#181438']} position={[0, -0.2, 0]} />
    </Canvas>
  )
}
