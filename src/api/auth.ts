import { apiClient } from './client'

type TokenPair = { accessToken: string; refreshToken: string; tokenType: 'Bearer' }

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<TokenPair>('/auth/login', { email, password })
  return data
}

export function saveSession(tokens: TokenPair) {
  window.localStorage.setItem('spotway.accessToken', tokens.accessToken)
  window.localStorage.setItem('spotway.refreshToken', tokens.refreshToken)
  const payload = JSON.parse(atob(tokens.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
  if (payload.role) window.localStorage.setItem('spotway.role', payload.role.toLowerCase())
}

export function clearSession() {
  window.localStorage.removeItem('spotway.accessToken')
  window.localStorage.removeItem('spotway.refreshToken')
  window.localStorage.removeItem('spotway.role')
}
