import type { Point } from './geometry'

export type RouteStepType = 'walk' | 'elevator' | 'arrive'

export type RouteStep = {
  index: number
  type: RouteStepType
  floorId: string
  nodeId: string
  x: number
  y: number
  /** 0-360 degrees. 0 points to the top of the floor plan, clockwise positive. */
  bearing: number
  /** Distance in meters for this step. */
  distance: number
  instruction: string
}

export type RouteSegment = {
  floorId: string
  points: Point[]
}

export type RouteResult = {
  buildingId: string
  fromNodeId: string
  toNodeId: string
  totalDistance: number
  estimatedSeconds: number
  steps: RouteStep[]
  segments: RouteSegment[]
}

export type Destination = {
  nodeId: string
  label: string
  floorId: string
  floorName: string
  type: string
}
