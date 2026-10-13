import type { FloorGeometry, Point } from '../types/geometry'

export type WorldCoordinate = {
  x: number
  y: number
  z: number
}

export type WorldDebugSample = {
  label: string
  x: number
  y: number
}

export function toWorld(
  x: number,
  y: number,
  geometry: Pick<FloorGeometry, 'realWidthM' | 'realHeightM'>,
  elevation = 0,
): WorldCoordinate {
  return {
    x: (x / 100 - 0.5) * geometry.realWidthM,
    y: elevation,
    z: (y / 100 - 0.5) * geometry.realHeightM,
  }
}

export function fromWorld(
  coordinate: Pick<WorldCoordinate, 'x' | 'z'>,
  geometry: Pick<FloorGeometry, 'realWidthM' | 'realHeightM'>,
): Point {
  return {
    x: ((coordinate.x / geometry.realWidthM) + 0.5) * 100,
    y: ((coordinate.z / geometry.realHeightM) + 0.5) * 100,
  }
}

export function getWorldCorners(
  geometry: Pick<FloorGeometry, 'realWidthM' | 'realHeightM'>,
  elevation = 0,
) {
  return {
    topLeft: toWorld(0, 0, geometry, elevation),
    topRight: toWorld(100, 0, geometry, elevation),
    bottomRight: toWorld(100, 100, geometry, elevation),
    bottomLeft: toWorld(0, 100, geometry, elevation),
  }
}

export function logWorldCoordinateCheck(
  geometry: FloorGeometry,
  sample?: WorldDebugSample,
) {
  if (!import.meta.env.DEV) {
    return
  }

  const corners = getWorldCorners(geometry)
  const rows: Record<string, WorldCoordinate> = {
    'Ảnh: góc trên trái (0%, 0%)': corners.topLeft,
    'Ảnh: góc trên phải (100%, 0%)': corners.topRight,
    'Ảnh: góc dưới phải (100%, 100%)': corners.bottomRight,
    'Ảnh: góc dưới trái (0%, 100%)': corners.bottomLeft,
  }

  if (sample) {
    rows[`POI: ${sample.label} (${sample.x}%, ${sample.y}%)`] = toWorld(
      sample.x,
      sample.y,
      geometry,
    )
  }

  console.info(
    `[3D coordinate check] ${geometry.floorId}: x ảnh -> world x, y ảnh -> world z`,
  )
  console.table(rows)
}
