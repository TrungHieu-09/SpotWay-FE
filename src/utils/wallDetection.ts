export interface DetectedWall {
  id: string
  floorId: string
  x1: number
  y1: number
  x2: number
  y2: number
  isDoorway?: boolean
}

export interface DetectedDoor {
  id: string
  floorId: string
  x: number
  y: number
  width: number
  orientation: 'horizontal' | 'vertical'
  swingAngle?: number
}

export interface DetectionResult {
  walls: DetectedWall[]
  doors: DetectedDoor[]
}
