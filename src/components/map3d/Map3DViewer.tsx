/* oxlint-disable react/set-state-in-effect react-hooks/exhaustive-deps react/immutability */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Empty, Segmented, Space, Spin, Switch, Typography } from 'antd'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { Floor } from '../../types/floor'
import type { FloorGeometry, Point, Room, RoomType } from '../../types/geometry'
import type { Node } from '../../types/node'
import type { Poi, PoiType } from '../../types/poi'
import type { RouteResult } from '../../types/route'
import {
  logWorldCoordinateCheck,
  toWorld,
  type WorldCoordinate,
} from '../../utils/worldCoordinates'
import { designTokens } from '../../theme/theme'

const { Text: AntText } = Typography

type FocusTarget = {
  floorId: string
  x: number
  y: number
  nonce: number
}

export type Map3DViewerProps = {
  floors: Floor[]
  geometriesByFloorId: Record<string, FloorGeometry>
  nodesByFloorId?: Record<string, Node[]>
  selectedFloorId?: string
  route: RouteResult | null
  focusTarget?: FocusTarget
  onSelectFloor?: (floorId: string) => void
}

type SceneProps = Map3DViewerProps & {
  stacked: boolean
  onDefaultCamera: (callback: () => void) => void
}

type FloorSceneProps = {
  floor: Floor
  geometry: FloorGeometry
  nodes: Node[]
  route: RouteResult | null
  elevation: number
  isSelected: boolean
  stacked: boolean
  onSelectFloor?: (floorId: string) => void
}

const roomColorByType: Record<RoomType, string> = {
  store: designTokens.blue400,
  corridor: designTokens.surfaceMuted,
  atrium: designTokens.gold100,
  office: designTokens.blue300,
  toilet: designTokens.blue200,
  service: designTokens.successBg,
  other: designTokens.border,
}

const poiColorByType: Record<PoiType, string> = {
  entrance: designTokens.blue600,
  shop: designTokens.blue500,
  store: designTokens.blue500,
  service: designTokens.success,
  elevator: designTokens.warning,
  toilet: designTokens.blue700,
  exit: designTokens.danger,
  custom: designTokens.ink500,
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    )
  } catch {
    return false
  }
}

function roomCenter(room: Room) {
  const total = room.polygon.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  )

  return {
    x: total.x / room.polygon.length,
    y: total.y / room.polygon.length,
  }
}

function makeShape(room: Room, geometry: FloorGeometry) {
  const shape = new THREE.Shape()
  room.polygon.forEach((point, index) => {
    const worldPoint = toWorld(point.x, point.y, geometry)
    if (index === 0) {
      shape.moveTo(worldPoint.x, -worldPoint.z)
    } else {
      shape.lineTo(worldPoint.x, -worldPoint.z)
    }
  })
  shape.closePath()
  return shape
}

function makeWallTransform(
  start: Point,
  end: Point,
  geometry: FloorGeometry,
  elevation: number,
) {
  const startWorld = toWorld(start.x, start.y, geometry, elevation)
  const endWorld = toWorld(end.x, end.y, geometry, elevation)
  const center = {
    x: (startWorld.x + endWorld.x) / 2,
    z: (startWorld.z + endWorld.z) / 2,
  }
  const length = Math.hypot(endWorld.x - startWorld.x, endWorld.z - startWorld.z)
  const angle = Math.atan2(endWorld.z - startWorld.z, endWorld.x - startWorld.x)

  return { center, length, angle }
}

function midpoint(left: THREE.Vector3, right: THREE.Vector3) {
  return new THREE.Vector3(
    (left.x + right.x) / 2,
    (left.y + right.y) / 2,
    (left.z + right.z) / 2,
  )
}

function routeDirectionQuaternion(fromPoint: THREE.Vector3, toPoint: THREE.Vector3) {
  const direction = new THREE.Vector3(
    toPoint.x - fromPoint.x,
    0,
    toPoint.z - fromPoint.z,
  ).normalize()

  return new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  )
}

function shouldShowPoi(type: PoiType, camera: THREE.Camera, position: WorldCoordinate) {
  if (['entrance', 'elevator', 'exit'].includes(type)) {
    return true
  }

  return camera.position.distanceTo(new THREE.Vector3(position.x, position.y, position.z)) < 32
}

function FloorTextureMesh({ src, geometry, elevation }: {
  src: string
  geometry: FloorGeometry
  elevation: number
}) {
  const texture = useLoader(THREE.TextureLoader, src)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = true
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  return (
    <mesh position={[0, elevation - 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[geometry.realWidthM, geometry.realHeightM]} />
      <meshBasicMaterial map={texture} transparent opacity={0.82} />
    </mesh>
  )
}

function RoomLabel({
  room,
  geometry,
  elevation,
}: {
  room: Room
  geometry: FloorGeometry
  elevation: number
}) {
  const { camera } = useThree()
  const [visible, setVisible] = useState(true)
  const center = useMemo(() => roomCenter(room), [room])
  const centerWorld = toWorld(center.x, center.y, geometry, elevation + 0.18)

  useFrame(() => {
    const distance = camera.position.distanceTo(
      new THREE.Vector3(centerWorld.x, centerWorld.y, centerWorld.z),
    )
    setVisible(distance < 72)
  })

  if (!visible) {
    return null
  }

  return (
    <Html
      center
      distanceFactor={30}
      position={[centerWorld.x, centerWorld.y + 0.34, centerWorld.z]}
    >
      <span className="map3d-label map3d-room-label">{room.name}</span>
    </Html>
  )
}

function FloorTexturePlane({ floor, geometry, elevation }: {
  floor: Floor
  geometry: FloorGeometry
  elevation: number
}) {
  const mapImageUrl = floor.mapImageUrl?.trim()

  return (
    <>
      <mesh position={[0, elevation - 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[geometry.realWidthM, geometry.realHeightM]} />
        <meshStandardMaterial color={designTokens.surface} roughness={0.74} />
      </mesh>
      <mesh position={[0, elevation - 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[geometry.realWidthM + 1.2, geometry.realHeightM + 1.2]} />
        <meshStandardMaterial color={designTokens.blue100} transparent opacity={0.36} />
      </mesh>
      {mapImageUrl ? (
        <FloorTextureMesh
          src={mapImageUrl}
          geometry={geometry}
          elevation={elevation}
        />
      ) : null}
    </>
  )
}

function RoomMesh({ room, geometry, elevation }: {
  room: Room
  geometry: FloorGeometry
  elevation: number
}) {
  const shape = useMemo(() => makeShape(room, geometry), [geometry, room])

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, elevation + 0.005, 0]}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={roomColorByType[room.type]}
          transparent
          opacity={0.34}
          roughness={0.72}
        />
      </mesh>
      {room.polygon.map((point, index) => {
        const nextPoint = room.polygon[(index + 1) % room.polygon.length]
        const wall = makeWallTransform(point, nextPoint, geometry, elevation)
        return (
          <mesh
            key={`${room.id}-wall-${index}`}
            position={[
              wall.center.x,
              elevation + geometry.wallHeight / 2,
              wall.center.z,
            ]}
            rotation={[0, -wall.angle, 0]}
          >
            <boxGeometry args={[wall.length, geometry.wallHeight, 0.18]} />
            <meshStandardMaterial color={designTokens.ink900} transparent opacity={0.36} roughness={0.58} />
          </mesh>
        )
      })}
      <RoomLabel room={room} geometry={geometry} elevation={elevation} />
    </group>
  )
}

function PoiPin({ poi, geometry, elevation }: {
  poi: Poi
  geometry: FloorGeometry
  elevation: number
}) {
  const { camera } = useThree()
  const [visible, setVisible] = useState(true)
  const world = toWorld(poi.x, poi.y, geometry, elevation + 0.22)

  useFrame(() => {
    setVisible(shouldShowPoi(poi.type, camera, world))
  })

  if (!visible) {
    return null
  }

  return (
    <group position={[world.x, world.y, world.z]}>
      <mesh position={[0, 0.85, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.24, 0.78, 18]} />
        <meshStandardMaterial color={poiColorByType[poi.type]} />
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.32, 24, 16]} />
        <meshStandardMaterial color={poiColorByType[poi.type]} />
      </mesh>
      <Html center distanceFactor={18} position={[0, 1.9, 0]}>
        <span className="map3d-label">{poi.name}</span>
      </Html>
    </group>
  )
}

function NodeMarker({ node, geometry, elevation }: {
  node: Node
  geometry: FloorGeometry
  elevation: number
}) {
  const world = toWorld(node.x, node.y, geometry, elevation + 0.08)
  return (
    <mesh position={[world.x, world.y, world.z]}>
      <sphereGeometry args={[node.isElevatorLink ? 0.22 : 0.07, 16, 10]} />
      <meshStandardMaterial
        color={node.isElevatorLink ? designTokens.warning : designTokens.ink500}
        transparent
        opacity={node.isElevatorLink ? 0.92 : 0.34}
      />
    </mesh>
  )
}

function RouteLine({ route, geometry, floorId, elevation, muted }: {
  route: RouteResult
  geometry: FloorGeometry
  floorId: string
  elevation: number
  muted: boolean
}) {
  const [dashOffset, setDashOffset] = useState(0)
  const segment = route.segments.find((item) => item.floorId === floorId)
  const routeElevation = elevation + 0.16
  const points = useMemo(
    () =>
      segment?.points.map((point) => {
        const world = toWorld(point.x, point.y, geometry, routeElevation)
        return new THREE.Vector3(world.x, world.y, world.z)
      }) ?? [],
    [geometry, routeElevation, segment],
  )
  const routeCurve = useMemo(
    () =>
      points.length >= 2
        ? new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.04)
        : null,
    [points],
  )
  const floorSteps = route.steps.filter((step) => step.floorId === floorId)

  useFrame(() => {
    setDashOffset((value) => (value + 0.015) % 1)
  })

  if (!segment || points.length < 2) {
    return null
  }

  return (
    <group renderOrder={20}>
      {routeCurve ? (
        <>
          <mesh renderOrder={19}>
            <tubeGeometry args={[routeCurve, Math.max(24, points.length * 18), 0.12, 14, false]} />
            <meshBasicMaterial
              color={muted ? designTokens.ink400 : designTokens.warning}
              transparent
              opacity={muted ? 0.35 : 0.92}
            />
          </mesh>
          <mesh renderOrder={18}>
            <tubeGeometry args={[routeCurve, Math.max(24, points.length * 18), 0.22, 14, false]} />
            <meshBasicMaterial
              color={muted ? designTokens.borderStrong : designTokens.gold100}
              transparent
              opacity={muted ? 0.16 : 0.38}
            />
          </mesh>
        </>
      ) : null}
      <Line
        points={points}
        color={muted ? designTokens.ink500 : designTokens.blue600}
        lineWidth={muted ? 2 : 7}
        dashed
        dashScale={8}
        dashSize={0.35}
        gapSize={0.22}
        dashOffset={dashOffset}
        transparent
        opacity={muted ? 0.34 : 1}
      />
      {points.slice(0, -1).map((point, index) => {
        const nextPoint = points[index + 1]
        return (
          <mesh
            key={`${floorId}-route-arrow-${index}`}
            position={midpoint(point, nextPoint)}
            quaternion={routeDirectionQuaternion(point, nextPoint)}
            renderOrder={21}
          >
            <coneGeometry args={[0.2, 0.52, 18]} />
            <meshBasicMaterial
              color={muted ? designTokens.ink400 : designTokens.blue600}
              transparent
              opacity={muted ? 0.44 : 1}
            />
          </mesh>
        )
      })}
      {[points[0], points[points.length - 1]].map((point, index) => (
        <group key={`${floorId}-route-marker-${index}`} position={point}>
          <mesh renderOrder={22}>
            <sphereGeometry args={[index === 0 ? 0.3 : 0.36, 28, 18]} />
            <meshBasicMaterial
              color={index === 0 ? designTokens.success : designTokens.danger}
            />
          </mesh>
          <Html center distanceFactor={22} position={[0, 0.78, 0]}>
            <span className={`map3d-route-label ${index === 0 ? 'start' : 'end'}`}>
              {index === 0 ? 'Bắt đầu' : 'Kết thúc'}
            </span>
          </Html>
        </group>
      ))}
      {floorSteps.map((step) => {
        const world = toWorld(step.x, step.y, geometry, routeElevation + 0.42)
        return (
          <Html
            key={`${floorId}-route-step-${step.index}`}
            center
            distanceFactor={26}
            position={[world.x, world.y, world.z]}
          >
            <span className="map3d-route-step">{step.index}</span>
          </Html>
        )
      })}
    </group>
  )
}

function FloorScene({
  floor,
  geometry,
  nodes,
  route,
  elevation,
  isSelected,
  stacked,
  onSelectFloor,
}: FloorSceneProps) {
  return (
    <group
      onClick={(event) => {
        event.stopPropagation()
        if (stacked && !isSelected) {
          onSelectFloor?.(floor.id)
        }
      }}
    >
      <FloorTexturePlane floor={floor} geometry={geometry} elevation={elevation} />
      {geometry.rooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          geometry={geometry}
          elevation={elevation}
        />
      ))}
      {floor.pois.map((poi) => (
        <PoiPin key={poi.id} poi={poi} geometry={geometry} elevation={elevation} />
      ))}
      {nodes.map((node) => (
        <NodeMarker key={node.id} node={node} geometry={geometry} elevation={elevation} />
      ))}
      {route ? (
        <RouteLine
          route={route}
          geometry={geometry}
          floorId={floor.id}
          elevation={elevation}
          muted={!isSelected}
        />
      ) : null}
    </group>
  )
}

function CameraRig({
  selectedGeometry,
  focusTarget,
  onDefaultCamera,
}: {
  selectedGeometry?: FloorGeometry
  focusTarget?: FocusTarget
  onDefaultCamera: (callback: () => void) => void
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  function getDefaultCameraPose() {
    const width = selectedGeometry?.realWidthM ?? 60
    const height = selectedGeometry?.realHeightM ?? 38
    const fov = THREE.MathUtils.degToRad(
      'fov' in camera && typeof camera.fov === 'number' ? camera.fov : 48,
    )
    const radius = Math.hypot(width, height) / 2
    const distance = (radius / Math.sin(fov / 2)) * 1.08
    const tiltFromGround = THREE.MathUtils.degToRad(56)
    const horizontalDistance = distance * Math.cos(tiltFromGround)

    return {
      distance,
      position: new THREE.Vector3(
        0,
        distance * Math.sin(tiltFromGround),
        horizontalDistance,
      ),
      target: new THREE.Vector3(0, 0, 0),
    }
  }

  function resetCamera() {
    const pose = getDefaultCameraPose()
    camera.position.copy(pose.position)
    if ('near' in camera && 'far' in camera) {
      camera.near = Math.max(0.1, pose.distance / 200)
      camera.far = Math.max(500, pose.distance * 5)
      camera.updateProjectionMatrix()
    }
    controlsRef.current?.target.copy(pose.target)
    controlsRef.current?.update()
  }

  useEffect(() => {
    onDefaultCamera(resetCamera)
    resetCamera()
  }, [selectedGeometry?.floorId])

  useEffect(() => {
    if (!selectedGeometry || !focusTarget) {
      return
    }

    const world = toWorld(focusTarget.x, focusTarget.y, selectedGeometry, 0)
    controlsRef.current?.target.set(world.x, 0.4, world.z)
    camera.position.set(world.x + 12, 18, world.z + 14)
    controlsRef.current?.update()
  }, [focusTarget?.nonce])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={Math.PI * 0.12}
      minDistance={8}
      maxDistance={Math.max(95, getDefaultCameraPose().distance * 1.8)}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
    />
  )
}

function Map3DScene({
  floors,
  geometriesByFloorId,
  nodesByFloorId,
  selectedFloorId,
  route,
  focusTarget,
  onSelectFloor,
  stacked,
  onDefaultCamera,
}: SceneProps) {
  const selectedGeometry = selectedFloorId
    ? geometriesByFloorId[selectedFloorId]
    : undefined
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId)
  const visibleFloors = stacked
    ? floors
    : floors.filter((floor) => floor.id === selectedFloorId)
  const selectedIndex = Math.max(
    0,
    floors.findIndex((floor) => floor.id === selectedFloorId),
  )

  useEffect(() => {
    if (!selectedGeometry || !selectedFloor) {
      return
    }

    const samplePoi =
      selectedFloor.pois.find((poi) => poi.name === 'Main Entrance') ??
      selectedFloor.pois[0]
    logWorldCoordinateCheck(
      selectedGeometry,
      samplePoi
        ? {
            label: samplePoi.name,
            x: samplePoi.x,
            y: samplePoi.y,
          }
        : undefined,
    )
  }, [selectedFloor?.id, selectedGeometry?.floorId])

  return (
    <>
      <ambientLight intensity={0.84} />
      <hemisphereLight args={[designTokens.blue50, designTokens.blue100, 0.82]} />
      <directionalLight position={[18, 30, 14]} intensity={1.18} castShadow />
      <gridHelper args={[96, 32, designTokens.blue200, designTokens.border]} position={[0, -0.08, 0]} />
      <CameraRig
        selectedGeometry={selectedGeometry}
        focusTarget={focusTarget}
        onDefaultCamera={onDefaultCamera}
      />
      {visibleFloors.map((floor) => {
        const geometry = geometriesByFloorId[floor.id]
        if (!geometry) {
          return null
        }

        const floorIndex = floors.findIndex((item) => item.id === floor.id)
        return (
          <FloorScene
            key={floor.id}
            floor={floor}
            geometry={geometry}
            nodes={nodesByFloorId?.[floor.id] ?? []}
            route={route}
            elevation={stacked ? (floorIndex - selectedIndex) * 5.8 : 0}
            isSelected={floor.id === selectedFloorId}
            stacked={stacked}
            onSelectFloor={onSelectFloor}
          />
        )
      })}
    </>
  )
}

export default function Map3DViewer({
  floors,
  geometriesByFloorId,
  nodesByFloorId,
  selectedFloorId,
  route,
  focusTarget,
  onSelectFloor,
}: Map3DViewerProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)
  const [stacked, setStacked] = useState(false)
  const resetCameraRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    setWebglSupported(hasWebGL())
  }, [])

  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId)
  const selectedGeometry = selectedFloorId
    ? geometriesByFloorId[selectedFloorId]
    : undefined

  if (webglSupported === null) {
    return (
      <div className="map3d-host map3d-empty">
        <Spin />
      </div>
    )
  }

  if (!webglSupported) {
    return (
      <div className="map3d-host map3d-empty">
        <Alert
          type="warning"
          showIcon
          message="Trình duyệt hiện tại không hỗ trợ WebGL nên chưa thể xem 3D."
        />
      </div>
    )
  }

  if (!selectedFloor || !selectedGeometry) {
    return (
      <div className="map3d-host map3d-empty">
        <Empty description="Chọn tầng có dữ liệu geometry để xem 3D" />
      </div>
    )
  }

  return (
    <div className="map3d-shell">
      <div className="map3d-toolbar">
        <Space>
          <Segmented
            value={selectedFloorId}
            onChange={(floorId) => onSelectFloor?.(String(floorId))}
            options={floors.map((floor) => ({
              value: floor.id,
              label: floor.name,
            }))}
          />
        </Space>
        <Space>
          {route ? (
            <span className="map3d-route-status">
              Đang hiển thị chỉ đường 3D
            </span>
          ) : null}
          <AntText type="secondary">Xếp chồng tầng</AntText>
          <Switch checked={stacked} onChange={setStacked} />
          <Button onClick={() => resetCameraRef.current()}>
            Về camera mặc định
          </Button>
        </Space>
      </div>
      <div className="map3d-host">
        <Canvas camera={{ position: [0, 42, 32], fov: 48 }} shadows>
          <color attach="background" args={[designTokens.surfaceMuted]} />
          <Map3DScene
            floors={floors}
            geometriesByFloorId={geometriesByFloorId}
            nodesByFloorId={nodesByFloorId}
            selectedFloorId={selectedFloorId}
            route={route}
            focusTarget={focusTarget}
            onSelectFloor={onSelectFloor}
            stacked={stacked}
            onDefaultCamera={(callback) => {
              resetCameraRef.current = callback
            }}
          />
        </Canvas>
      </div>
    </div>
  )
}
