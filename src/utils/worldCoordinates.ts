import type { FloorGeometry, Point } from '../types/geometry'

export type WorldCoordinate = {
  x: number
  y: number
  z: number
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
