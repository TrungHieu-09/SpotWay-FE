export type BuildingStatus = 'draft' | 'active'

export type Building = {
  id: string
  name: string
  address: string
  status: BuildingStatus
  floorCount: number
  createdAt: string
  planImageUrl: string
}

export type CreateBuildingPayload = {
  name: string
  address: string
  planImage?: File
}

