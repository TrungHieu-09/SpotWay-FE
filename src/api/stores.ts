import { apiClient } from './client'
import { storeFromDto, storeStatusToDto, type StoreDto } from './storeMapper'
import type { CreateStorePayload, Store, UpdateStorePayload } from '../types/store'

export type CreateStoreInput = {
  floorId: string
  nodeId: string
  name: string
  description?: string
}

type UploadInfo = { signedUrl: string; publicUrl: string }

/** Uploads one image to the store's storage folder and returns its public URL. */
async function uploadStoreImage(storeId: string, file: File): Promise<string> {
  const { data } = await apiClient.post<UploadInfo>(`/stores/${storeId}/upload-url`, { filename: file.name })
  const response = await fetch(data.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/png' },
    body: file,
  })
  if (!response.ok) throw new Error(`Tải ảnh lên thất bại: ${response.statusText}`)
  return data.publicUrl
}

async function uploadAll(storeId: string, files: File[] | undefined) {
  return Promise.all((files ?? []).map((file) => uploadStoreImage(storeId, file)))
}

const MAX_GALLERY = 5

export async function createStore(input: CreateStoreInput | CreateStorePayload): Promise<Store> {
  const payload = input as CreateStorePayload
  const { data } = await apiClient.post<StoreDto>('/stores', {
    floorId: payload.floorId,
    nodeId: payload.nodeId ?? undefined,
    ownerId: payload.ownerUserId ?? undefined,
    name: payload.name,
    description: payload.description,
  })
  // BE creates stores as PENDING; activate / add images right after, as they need the new id.
  const logoUrl = payload.logoFile ? await uploadStoreImage(data.id, payload.logoFile) : undefined
  const images = (await uploadAll(data.id, payload.galleryFiles)).slice(0, MAX_GALLERY)
  const patch: Record<string, unknown> = {}
  if (payload.status) patch.status = storeStatusToDto(payload.status)
  if (logoUrl) patch.logoUrl = logoUrl
  if (images.length) patch.images = images
  if (Object.keys(patch).length === 0) return storeFromDto(data)
  const { data: updated } = await apiClient.patch<StoreDto>(`/stores/${data.id}`, patch)
  return storeFromDto(updated)
}

export async function updateStore(storeId: string, payload: UpdateStorePayload): Promise<Store> {
  const patch: Record<string, unknown> = {}
  if (payload.name !== undefined) patch.name = payload.name
  if (payload.description !== undefined) patch.description = payload.description
  if (payload.status !== undefined) patch.status = storeStatusToDto(payload.status)
  if (payload.ownerUserId !== undefined) patch.ownerId = payload.ownerUserId
  if (payload.nodeId !== undefined) patch.nodeId = payload.nodeId
  if (payload.logoFile) patch.logoUrl = await uploadStoreImage(storeId, payload.logoFile)
  else if (payload.logoUrl !== undefined) patch.logoUrl = payload.logoUrl
  if (payload.galleryImageUrls !== undefined || payload.galleryFiles?.length) {
    const uploaded = await uploadAll(storeId, payload.galleryFiles)
    patch.images = [...(payload.galleryImageUrls ?? []), ...uploaded].slice(0, MAX_GALLERY)
  }
  const { data } = await apiClient.patch<StoreDto>(`/stores/${storeId}`, patch)
  return storeFromDto(data)
}

export async function deleteStore(storeId: string): Promise<void> {
  await apiClient.delete(`/stores/${storeId}`)
}

export async function getStore(storeId: string): Promise<Store> {
  const { data } = await apiClient.get<StoreDto>(`/stores/${storeId}`)
  return storeFromDto(data)
}

export async function getStoresByFloor(floorId: string): Promise<Store[]> {
  const { data } = await apiClient.get<StoreDto[]>(`/floors/${encodeURIComponent(floorId)}/stores`)
  return Array.isArray(data) ? data.map(storeFromDto) : []
}

export async function getStoresByOwner(ownerId: string): Promise<Store[]> {
  const { data } = await apiClient.get<StoreDto[]>(`/owners/${encodeURIComponent(ownerId)}/stores`)
  return Array.isArray(data) ? data.map(storeFromDto) : []
}

export async function updateStoreStatus(storeId: string, status: 'ACTIVE' | 'PENDING' | 'CLOSED' | 'active' | 'inactive') {
  const value = status === 'active' ? 'ACTIVE' : status === 'inactive' ? 'CLOSED' : status
  const { data } = await apiClient.patch<StoreDto>(`/stores/${storeId}`, { status: value })
  return storeFromDto(data)
}
