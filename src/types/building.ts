export type BuildingStatus = 'draft' | 'active'

export type Building = {
  id: string
  tenantId: string
  name: string
  address: string
  status: BuildingStatus
  floorCount: number
  createdAt: string
  planImageUrl: string | null
}

export type CreateBuildingPayload = {
  name: string
  address: string
  floors: CreateBuildingFloorPayload[]
}

export type CreateBuildingFloorPayload = {
  name: string
  level: number
  mapImageUrl: string | null
  mapWidth?: number
  mapHeight?: number
}

export type UpdateBuildingPayload = Partial<Pick<Building, 'name' | 'address' | 'status'>>

