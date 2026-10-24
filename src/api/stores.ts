import { apiClient } from './client'
import type { CreateStorePayload, Store, UpdateStorePayload } from '../types/store'

export type CreateStoreInput = {
  floorId: string
  nodeId: string
  name: string
  description?: string
}

export async function createStore(input: CreateStoreInput | CreateStorePayload): Promise<Store> {
  const { data } = await apiClient.post<Store>('/stores', input)
  return data
}

export async function updateStore(storeId: string, payload: UpdateStorePayload): Promise<Store> {
  const { data } = await apiClient.put<Store>(`/stores/${storeId}`, payload)
  return data
}

export async function deleteStore(storeId: string): Promise<void> {
  await apiClient.delete(`/stores/${storeId}`)
}

export async function getStore(storeId: string): Promise<Store> {
  const { data } = await apiClient.get<Store>(`/stores/${storeId}`)
  return data
}

export async function getStoresByFloor(floorId: string): Promise<Store[]> {
  const { data } = await apiClient.get<Store[]>(`/stores?floorId=${encodeURIComponent(floorId)}`)
  return data
}

export async function getStoresByOwner(ownerId: string): Promise<Store[]> {
  const { data } = await apiClient.get<Store[]>(`/stores?ownerId=${encodeURIComponent(ownerId)}`)
  return data
}

export async function updateStoreStatus(storeId: string, status: 'ACTIVE' | 'PENDING' | 'CLOSED' | 'active' | 'inactive') {
  const { data } = await apiClient.patch(`/stores/${storeId}`, { status })
  return data
}
