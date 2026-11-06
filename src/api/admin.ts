import { apiClient } from './client'
import type { AdminOverview, AdminUser, CreateAdminUserPayload } from '../types/admin'

export async function getAdminOverview() {
  const { data } = await apiClient.get<AdminOverview>('/admin/overview')
  return data
}

export async function getAdminUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users')
  return data
}

/** Admin hands out an account: email + password + role. A Building Owner gets a workspace automatically. */
export async function createAdminUser(payload: CreateAdminUserPayload) {
  const { data } = await apiClient.post<AdminUser>('/admin/users', payload)
  return data
}

/** Without `newPassword` the BE generates a temporary one and returns it as `temporaryPassword`. */
export async function resetAdminUserPassword(userId: string, newPassword?: string) {
  const { data } = await apiClient.post<AdminUser & { temporaryPassword?: string }>(
    `/admin/users/${userId}/reset-password`,
    newPassword ? { newPassword } : {},
  )
  return data
}

export async function deleteAdminUser(userId: string) {
  await apiClient.delete(`/admin/users/${userId}`)
}
