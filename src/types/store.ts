export type StoreStatus = 'active' | 'inactive'

export type Store = {
  id: string
  ownerUserId: string | null
  createdByUserId: string
  buildingId: string
  floorId: string
  roomId?: string | null
  nodeId?: string | null
  name: string
  logoUrl: string | null
  /** Real store images. Maximum 5 images. */
  galleryImageUrls: string[]
  description: string
  category: string
  openingHours: string
  status: StoreStatus
}

export type UpdateStorePayload = Partial<{
  name: string
  logoUrl: string | null
  logoFile: File
  galleryImageUrls: string[]
  galleryFiles: File[]
  description: string
  category: string
  openingHours?: string
  status: StoreStatus
  ownerUserId: string | null
  roomId?: string | null
  nodeId?: string | null
}>

export type CreateStorePayload = {
  ownerUserId?: string | null
  buildingId: string
  floorId: string
  roomId?: string | null
  nodeId?: string | null
  name: string
  description: string
  category: string
  openingHours?: string
  status: StoreStatus
  logoFile?: File
  galleryFiles?: File[]
}
