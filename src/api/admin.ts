import { apiClient } from './client'
import type { AdminOverview, AdminUser, TenantDetail } from '../types/admin'
import type { Plan, Tenant } from '../types/auth'

export type CreateTenantPayload = {
  name: string
  subdomain: string
  planId: string
  planExpiresAt: string
  ownerName: string
  ownerEmail: string
}

export type UpdateTenantPayload = Partial<Pick<Tenant, 'planId' | 'planExpiresAt' | 'status'>>

export type UpdateAdminUserPayload = { status?: 'active' | 'locked'; resetPassword?: boolean }

export async function getAdminOverview() {
  const { data } = await apiClient.get<AdminOverview>('/admin/overview')
  return data
}

export async function getAdminTenants() {
  const { data } = await apiClient.get<Tenant[]>('/admin/tenants')
  return data
}

export async function getAdminTenant(tenantId: string) {
  const { data } = await apiClient.get<TenantDetail>(`/admin/tenants/${tenantId}`)
  return data
}

export async function createAdminTenant(payload: CreateTenantPayload) {
  const { data } = await apiClient.post<TenantDetail>('/admin/tenants', payload)
  return data
}

export async function updateAdminTenant(tenantId: string, payload: UpdateTenantPayload) {
  const { data } = await apiClient.patch<TenantDetail>(`/admin/tenants/${tenantId}`, payload)
  return data
}

export async function getAdminPlans() {
  const { data } = await apiClient.get<Plan[]>('/admin/plans')
  return data
}

export async function createAdminPlan(payload: Omit<Plan, 'id'>) {
  const { data } = await apiClient.post<Plan>('/admin/plans', payload)
  return data
}

export async function updateAdminPlan(planId: string, payload: Partial<Omit<Plan, 'id'>>) {
  const { data } = await apiClient.patch<Plan>(`/admin/plans/${planId}`, payload)
  return data
}

export async function getAdminUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users')
  return data
}

export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload) {
  const { data } = await apiClient.patch<AdminUser & { temporaryPassword?: string }>(`/admin/users/${userId}`, payload)
  return data
}

export async function deleteAdminUser(userId: string) {
  await apiClient.delete(`/admin/users/${userId}`)
}
