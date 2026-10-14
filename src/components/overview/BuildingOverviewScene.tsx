import { Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Texture, TextureLoader, type MeshStandardMaterial } from 'three'
import type { BuildingOverview } from '../../api/navigation'

type FloorPlaneProps = { floor: BuildingOverview['floors'][number] }

function FloorPlane({ floor }: FloorPlaneProps) {
  const [texture, setTexture] = useState<Texture>()
  const materialRef = useRef<MeshStandardMaterial>(null)
  const width = Math.max(4, (floor.mapWidth ?? 1200) / 100)
  const height = Math.max(3, (floor.mapHeight ?? 760) / 100)
  useEffect(() => {
    if (!floor.mapImageUrl) { setTexture(undefined); return }
    let active = true
    new TextureLoader().load(floor.mapImageUrl, (loaded) => { if (active) setTexture(loaded) }, undefined, () => { if (active) setTexture(undefined) })
    return () => { active = false }
  }, [floor.mapImageUrl])
  return <group position={[0, floor.elevation, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial ref={materialRef} map={texture} color={texture ? '#ffffff' : '#5b4b8a'} roughness={0.8} metalness={0.05} />
    </mesh>
    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[width + 0.25, height + 0.25]} /><meshStandardMaterial color="#17122d" /></mesh>
    <Html position={[-width / 2, 0.3, -height / 2]} distanceFactor={12} transform><div style={{ color: 'white', background: '#241b45cc', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Tầng {floor.floorNumber} · {floor.name}</div></Html>
  </group>
}

export function BuildingOverviewScene({ overview }: { overview: BuildingOverview }) {
  const highestElevation = Math.max(0, ...overview.floors.map((floor) => floor.elevation))
  return <Canvas shadows camera={{ position: [15, highestElevation + 13, 17], fov: 42 }}>
    <color attach="background" args={['#0b0b1a']} /><ambientLight intensity={1.2} /><directionalLight position={[10, 18, 10]} intensity={1.5} castShadow />
    {overview.floors.map((floor) => <FloorPlane key={floor.id} floor={floor} />)}
    <gridHelper args={[30, 30, '#5b4b8a', '#241b45']} position={[0, -0.15, 0]} /><OrbitControls makeDefault minDistance={6} maxDistance={45} />
  </Canvas>
}
