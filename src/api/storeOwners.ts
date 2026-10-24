import { apiClient } from './client'
import type { User } from '../types/auth'

export type StoreOwnerSummary = User & { storeCount: number }
export async function getStoreOwners() { const { data } = await apiClient.get<StoreOwnerSummary[]>('/store-owners'); return data }
export async function createStoreOwner(payload: Pick<User, 'name' | 'email'>) { const { data } = await apiClient.post<StoreOwnerSummary & { temporaryPassword: string }>('/store-owners', payload); return data }
export async function updateStoreOwner(id: string, status: User['status']) { const { data } = await apiClient.patch<StoreOwnerSummary>(`/store-owners/${id}`, { status }); return data }
export async function resetStoreOwnerPassword(id: string) { const { data } = await apiClient.post<StoreOwnerSummary & { temporaryPassword: string }>(`/store-owners/${id}/reset-password`); return data }
export async function deleteStoreOwner(id: string) { await apiClient.delete(`/store-owners/${id}`) }
