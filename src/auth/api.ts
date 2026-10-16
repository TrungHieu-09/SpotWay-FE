import { apiClient } from '../api/client'
import type { LoginResponse, AuthUser } from '../types/auth'

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  })
  return data
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<AuthUser>('/auth/me')
  return data
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export async function changePassword(payload: { currentPassword?: string; newPassword: string }) {
  const { data } = await apiClient.post<AuthUser>('/auth/change-password', payload)
  return data
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<{ message: string; resetToken?: string }>('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword })
  return data
}
