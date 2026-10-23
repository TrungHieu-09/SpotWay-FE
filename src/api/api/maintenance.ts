import { apiClient } from './client'
import type { MaintenanceZone } from '../types/maintenance'

export async function getMaintenanceZones(floorId: string) { const { data } = await apiClient.get<MaintenanceZone[]>(`/floors/${floorId}/maintenance-zones`); return data }
export async function createMaintenanceZone(floorId: string, payload: Omit<MaintenanceZone, 'id' | 'floorId' | 'createdAt'>) { const { data } = await apiClient.post<MaintenanceZone>(`/floors/${floorId}/maintenance-zones`, payload); return data }
export async function updateMaintenanceZone(id: string, payload: Partial<Omit<MaintenanceZone, 'id' | 'floorId' | 'createdAt'>>) { const { data } = await apiClient.patch<MaintenanceZone>(`/maintenance-zones/${id}`, payload); return data }
export async function deleteMaintenanceZone(id: string) { await apiClient.delete(`/maintenance-zones/${id}`) }
