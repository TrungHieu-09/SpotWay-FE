import { apiClient } from './client'

type TokenPair = { accessToken: string; refreshToken: string; tokenType: 'Bearer' }

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<TokenPair>('/auth/login', { email, password })
  return data
}

export function saveSession(tokens: TokenPair) {
  window.sessionStorage.setItem('auth:token', tokens.accessToken)
  window.sessionStorage.setItem('spotway.accessToken', tokens.accessToken)
  window.sessionStorage.setItem('spotway.refreshToken', tokens.refreshToken)
  const payload = JSON.parse(atob(tokens.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
  if (payload.role) window.sessionStorage.setItem('spotway.role', payload.role.toLowerCase())
}

export function clearSession() {
  window.sessionStorage.removeItem('auth:token')
  window.sessionStorage.removeItem('spotway.accessToken')
  window.sessionStorage.removeItem('spotway.refreshToken')
  window.sessionStorage.removeItem('spotway.role')
  window.sessionStorage.removeItem('spotway.user')
}
