import { apiClient } from './client'
import type {
  CreateStorePayload,
  Store,
  UpdateStorePayload,
} from '../types/store'

export async function getStoresByFloor(floorId: string) {
  const { data } = await apiClient.get<Store[]>(`/floors/${floorId}/stores`)
  return data
}

export async function getStoresByOwner(ownerId: string) {
  const { data } = await apiClient.get<Store[]>(`/owners/${ownerId}/stores`)
  return data
}

export async function getStore(storeId: string) {
  const { data } = await apiClient.get<Store>(`/stores/${storeId}`)
  return data
}

export async function createStore(payload: CreateStorePayload) {
  const formData = new FormData()

  formData.append('ownerId', payload.ownerId)
  formData.append('buildingId', payload.buildingId)
  formData.append('floorId', payload.floorId)
  formData.append('name', payload.name)
  formData.append('description', payload.description)
  formData.append('category', payload.category)
  formData.append('status', payload.status)

  if (payload.logoFile) {
    formData.append('logo', payload.logoFile)
  }

  payload.galleryFiles?.forEach((file) => {
    formData.append('galleryImages', file)
  })

  const { data } = await apiClient.post<Store>('/stores', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

export async function updateStore(
  storeId: string,
  payload: UpdateStorePayload,
) {
  const formData = new FormData()

  if (payload.name !== undefined) {
    formData.append('name', payload.name)
  }

  if (payload.category !== undefined) {
    formData.append('category', payload.category)
  }

  if (payload.description !== undefined) {
    formData.append('description', payload.description)
  }

  if (payload.status !== undefined) {
    formData.append('status', payload.status)
  }

  if (payload.logoUrl !== undefined) {
    formData.append('logoUrl', payload.logoUrl ?? '')
  }

  if (payload.logoFile) {
    formData.append('logo', payload.logoFile)
  }

  if (payload.galleryImageUrls) {
    formData.append(
      'galleryImageUrls',
      JSON.stringify(payload.galleryImageUrls),
    )
  }

  payload.galleryFiles?.forEach((file) => {
    formData.append('galleryImages', file)
  })

  const { data } = await apiClient.patch<Store>(`/stores/${storeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}
