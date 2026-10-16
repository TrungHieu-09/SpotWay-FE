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
