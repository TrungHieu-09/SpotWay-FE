import { apiClient } from './client'

export type CreateStoreInput = {
  floorId: string
  nodeId: string
  name: string
  description?: string
}

export async function createStore(input: CreateStoreInput) {
  const { data } = await apiClient.post('/stores', input)
  return data
}

export async function updateStoreStatus(storeId: string, status: 'ACTIVE' | 'PENDING' | 'CLOSED') {
  const { data } = await apiClient.patch(`/stores/${storeId}`, { status })
  return data
}
