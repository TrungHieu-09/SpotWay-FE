import { apiClient } from './client'

export type MaintenanceReport = {
  floorId: string
  graphVersion: number
  blockedEdges: Array<{ id: string; fromNodeId: string; toNodeId: string }>
  /** Node có mọi edge đều bị chặn nên không thể đi qua. */
  blockedNodeIds: string[]
  changedEdges?: number
}

export type MaintenanceSelection = { nodeIds?: string[]; edgeIds?: string[] }

export async function getMaintenanceReport(floorId: string) {
  const { data } = await apiClient.get<MaintenanceReport>(`/floors/${floorId}/maintenance`)
  return data
}

/** Chặn edge (hoặc mọi edge quanh các node) để tìm đường tránh chúng. */
export async function blockMaintenance(floorId: string, selection: MaintenanceSelection) {
  const { data } = await apiClient.post<MaintenanceReport>(`/floors/${floorId}/maintenance/block`, selection)
  return data
}

export async function unblockMaintenance(floorId: string, selection: MaintenanceSelection) {
  const { data } = await apiClient.post<MaintenanceReport>(`/floors/${floorId}/maintenance/unblock`, selection)
  return data
}
