import type { Poi } from './poi'

export type Floor = {
  id: string
  buildingId: string
  name: string
  level: number
  mapImageUrl: string
  mapWidth: number
  mapHeight: number
  pois: Poi[]
}

export type CreateFloorPayload = {
  buildingId: string
  name: string
  level: number
  mapImageUrl?: string
  mapWidth?: number
  mapHeight?: number
}

