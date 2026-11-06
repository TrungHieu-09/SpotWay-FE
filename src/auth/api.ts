import { apiClient } from '../api/client'
import type { LoginResponse, AuthUser, RegisterResponse } from '../types/auth'

// Normalize BE token format ({ accessToken, refreshToken }) → FE format ({ token, user })
// When running against real backend, verifyEmail & login return { accessToken, refreshToken, tokenType }
// but getCurrentUser is called separately to get user info
interface BeTokenResponse {
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  token?: string
  user?: AuthUser
}

function normalizeTokenResponse(raw: BeTokenResponse): LoginResponse {
  if (raw.token && raw.user) {
    // MSW mock format
    return { token: raw.token, user: raw.user }
  }
  // Real backend format — user will be fetched via /auth/me separately
  const token = raw.accessToken ?? raw.token ?? ''
  if (raw.refreshToken) {
    window.localStorage.setItem('spotway.refreshToken', raw.refreshToken)
  }
  // Return with a placeholder user that will be replaced by /auth/me call
  return {
    token,
    user: raw.user ?? ({} as AuthUser),
  }
}

export async function register(fullName: string, email: string, password: string) {
  const { data } = await apiClient.post<RegisterResponse>('/auth/register', {
    fullName,
    email,
    password,
  })
  return data
}

export async function verifyEmail(email: string, code: string) {
  const { data } = await apiClient.post<BeTokenResponse>('/auth/verify-email', {
    email,
    code,
  })
  return normalizeTokenResponse(data)
}

export async function resendOtp(email: string) {
  const { data } = await apiClient.post<RegisterResponse>('/auth/resend-otp', {
    email,
  })
  return data
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<BeTokenResponse>('/auth/login', {
    email,
    password,
  })
  return normalizeTokenResponse(data)
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<AuthUser>('/auth/me')
  return data
}

export async function logout() {
  const refreshToken = window.localStorage.getItem('spotway.refreshToken')
  await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {})
}

export interface CreateWorkspacePayload {
  name: string
  subdomain: string
  orgType?: string
}

export interface CreateWorkspaceResult {
  tenant: {
    id: string
    name: string
    subdomain: string
    status: string
  }
  user: AuthUser
  accessToken?: string
  refreshToken?: string
  tokenType?: string
}

export async function createWorkspace(payload: CreateWorkspacePayload) {
  const { data } = await apiClient.post<CreateWorkspaceResult>('/auth/workspace', payload)
  return data
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
