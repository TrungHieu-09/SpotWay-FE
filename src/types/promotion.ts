export type PromotionStatus = 'draft' | 'published'

export type Promotion = {
  id: string
  storeId: string
  title: string
  description: string
  discountText: string
  imageUrl?: string
  startDate: string
  endDate: string
  status: PromotionStatus
}

export type PromotionPayload = Omit<Promotion, 'id' | 'storeId'>
