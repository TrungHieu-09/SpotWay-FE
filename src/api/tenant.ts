import { apiClient } from './client'
import type { TenantOverview, Invoice, User, Plan } from '../types/auth'

export type CreateStaffPayload = {
  name: string
  email: string
  role: 'building_manager' | 'store_owner'
}

export async function getTenantOverview() {
  const { data } = await apiClient.get<TenantOverview>('/tenant/overview')
  return data
}

export async function getTenantUsers() {
  const { data } = await apiClient.get<User[]>('/tenant/users')
  return data
}

export async function createTenantUser(payload: CreateStaffPayload) {
  const { data } = await apiClient.post<User & { temporaryPassword: string }>('/tenant/users', payload)
  return data
}

export async function updateTenantUser(userId: string, status: User['status'], resetPassword = false) {
  const { data } = await apiClient.patch<User & { temporaryPassword?: string }>(`/tenant/users/${userId}`, { status, resetPassword })
  return data
}

export async function deleteTenantUser(userId: string) {
  await apiClient.delete(`/tenant/users/${userId}`)
}

export async function renewTenantSubscription(planId: string, months: number) {
  const { data } = await apiClient.post<TenantOverview>('/tenant/subscription/renew', { planId, months })
  return data
}

export async function getTenantInvoices() {
  const { data } = await apiClient.get<Invoice[]>('/tenant/invoices')
  return data
}

export async function getTenantPlans() {
  const { data } = await apiClient.get<Plan[]>('/tenant/plans')
  return data
}
