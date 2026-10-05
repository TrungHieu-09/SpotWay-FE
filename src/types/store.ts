export type StoreStatus = 'active' | 'inactive'

export type Store = {
  id: string
  floorId: string
  name: string
  logoUrl: string | null
  /** Real store images. Maximum 5 images. */
  galleryImageUrls: string[]
  description: string
  category: string
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
  status: StoreStatus
}>
