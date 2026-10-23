import { apiClient } from './client'
import type { QrCode } from '../types/qr'

export async function getBuildingQrCodes(buildingId: string) { const { data } = await apiClient.get<QrCode[]>(`/buildings/${buildingId}/qr-codes`); return data }
export async function createQrCode(buildingId: string, payload: Omit<QrCode, 'id' | 'buildingId' | 'code'>) { const { data } = await apiClient.post<QrCode>(`/buildings/${buildingId}/qr-codes`, payload); return data }
export async function deleteQrCode(id: string) { await apiClient.delete(`/qr-codes/${id}`) }
