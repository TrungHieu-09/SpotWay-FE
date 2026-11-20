import { apiClient } from './client'
import type {
  CreateServiceContractPayload,
  RenewalUnit,
  ServiceContract,
  UpdateServiceContractPayload,
} from '../types/contract'

/** Every call goes to the real backend; errors are thrown so the UI can show them. */

/** Scans travel inside the request body, so uploads get more time than the default 30 s. */
const UPLOAD_TIMEOUT_MS = 180_000

export async function getAdminContracts(): Promise<ServiceContract[]> {
  const { data } = await apiClient.get<ServiceContract[]>('/admin/contracts')
  return Array.isArray(data) ? data : []
}

/** Full contract including the scanned pages (the list leaves them out). */
export async function getAdminContract(id: string): Promise<ServiceContract> {
  const { data } = await apiClient.get<ServiceContract>(`/admin/contracts/${id}`)
  return data
}

export async function createAdminContract(payload: CreateServiceContractPayload): Promise<ServiceContract> {
  const { data } = await apiClient.post<ServiceContract>('/admin/contracts', payload, { timeout: UPLOAD_TIMEOUT_MS })
  return data
}

export async function updateAdminContract(id: string, payload: UpdateServiceContractPayload): Promise<ServiceContract> {
  const { data } = await apiClient.patch<ServiceContract>(`/admin/contracts/${id}`, payload, { timeout: UPLOAD_TIMEOUT_MS })
  return data
}

export async function deleteAdminContract(id: string): Promise<void> {
  await apiClient.delete(`/admin/contracts/${id}`)
}

export async function getOwnerContracts(): Promise<ServiceContract[]> {
  const { data } = await apiClient.get<ServiceContract[]>('/tenant/contracts')
  return Array.isArray(data) ? data : []
}

export async function getOwnerContract(id: string): Promise<ServiceContract> {
  const { data } = await apiClient.get<ServiceContract>(`/tenant/contracts/${id}`)
  return data
}

export async function submitContractRenewalRequest(
  contractId: string,
  amount: number,
  unit: RenewalUnit,
  note: string,
): Promise<void> {
  await apiClient.post(`/tenant/contracts/${contractId}/renew-request`, { amount, unit, ...(note ? { note } : {}) })
}
