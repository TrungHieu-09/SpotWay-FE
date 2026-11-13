import { apiClient } from './client'
import { promotionFromDto, promotionToDto, type PromotionDto } from './storeMapper'
import type { Promotion, PromotionPayload } from '../types/promotion'

export async function getStorePromotions(storeId: string) {
  const { data } = await apiClient.get<PromotionDto[]>(`/stores/${storeId}/promotions`)
  return (Array.isArray(data) ? data : []).map(promotionFromDto)
}
export async function createStorePromotion(storeId: string, payload: PromotionPayload): Promise<Promotion> {
  const { data } = await apiClient.post<PromotionDto>(`/stores/${storeId}/promotions`, promotionToDto(payload))
  return promotionFromDto(data)
}
export async function updatePromotion(id: string, payload: Partial<PromotionPayload>): Promise<Promotion> {
  const { data } = await apiClient.patch<PromotionDto>(`/promotions/${id}`, promotionToDto(payload))
  return promotionFromDto(data)
}
export async function deletePromotion(id: string) { await apiClient.delete(`/promotions/${id}`) }
