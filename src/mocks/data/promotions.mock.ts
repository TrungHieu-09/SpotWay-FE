import type { Promotion } from '../../types/promotion'
import { loadFromStorage, MOCK_STORAGE_KEYS } from '../persist'

const seed: Promotion[] = [
  { id: 'promotion-1', storeId: 'store-1', title: 'Ưu đãi cuối tuần', description: 'Giảm giá bộ sưu tập mới.', discountText: 'Giảm 20%', startDate: '2026-10-01', endDate: '2026-12-31', status: 'published' },
  { id: 'promotion-2', storeId: 'store-2', title: 'Combo trưa', description: 'Áp dụng tại quầy Bếp Saigon.', discountText: 'Combo từ 49.000đ', startDate: '2026-10-10', endDate: '2026-11-30', status: 'draft' },
]

export const promotions = loadFromStorage<Promotion[]>(MOCK_STORAGE_KEYS.promotions, seed)
