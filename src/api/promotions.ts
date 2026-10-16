import { apiClient } from './client'
import type { Promotion, PromotionPayload } from '../types/promotion'

export async function getStorePromotions(storeId: string) {
  const { data } = await apiClient.get<Promotion[]>(`/stores/${storeId}/promotions`)
  return data
}
export async function createStorePromotion(storeId: string, payload: PromotionPayload) {
  const { data } = await apiClient.post<Promotion>(`/stores/${storeId}/promotions`, payload)
  return data
}
export async function updatePromotion(id: string, payload: Partial<PromotionPayload>) {
  const { data } = await apiClient.patch<Promotion>(`/promotions/${id}`, payload)
  return data
}
export async function deletePromotion(id: string) { await apiClient.delete(`/promotions/${id}`) }
