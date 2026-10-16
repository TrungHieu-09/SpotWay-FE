import { apiClient } from './client'

export type DetectedWall = { id: string; x1: number; y1: number; x2: number; y2: number; confidence?: number }

export type DetectedDoor = {
  id: string
  floorId: string
  x: number
  y: number
  width: number
  orientation: 'horizontal' | 'vertical'
  swingAngle?: number
}

export type CubiCasaPolygon = {
  outer: [number, number][]
  holes?: [number, number][][]
}

export type CubiCasaPolygons = {
  wall?: CubiCasaPolygon[]
  door?: CubiCasaPolygon[]
  window?: CubiCasaPolygon[]
  floor?: CubiCasaPolygon[]
}

export type FloorPlanRevision = {
  id: string
  floorId: string
  version: number
  createdAt: string
  publishedAt: string | null
  editorState: {
    walls?: DetectedWall[]
    doors?: DetectedDoor[]
    polygons?: CubiCasaPolygons
    openings?: unknown[]
    labels?: unknown[]
    symbols?: unknown[]
    warnings?: string[]
    needsReview?: boolean
  }
}

export async function analyzeFloorPlan(floorId: string) {
  const { data } = await apiClient.post<FloorPlanRevision>(`/floors/${floorId}/analysis`, undefined, {
    timeout: 120_000,
  })
  return data
}

export async function getLatestFloorPlanRevision(floorId: string) {
  const { data } = await apiClient.get<FloorPlanRevision | null>(`/floors/${floorId}/map-revisions/latest`)
  return data
}

export async function saveFloorPlanRevision(floorId: string, editorState: Record<string, unknown>) {
  const { data } = await apiClient.post<FloorPlanRevision>(`/floors/${floorId}/map-revisions`, { editorState })
  return data
}

