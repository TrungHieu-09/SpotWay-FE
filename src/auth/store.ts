import { create } from 'zustand'
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  verifyEmail as verifyEmailRequest,
  logout as logoutRequest,
  createWorkspace as createWorkspaceRequest,
  type CreateWorkspaceResult,
} from './api'
import type { AuthUser, RegisterResponse, Role } from '../types/auth'

export const AUTH_TOKEN_KEY = 'auth:token'

type AuthState = {
  user: AuthUser | null
  token: string | null
  isInitializing: boolean
  isLoading: boolean
  error: string | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<RegisterResponse>
  verifyEmail: (email: string, code: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>
  createWorkspace: (name: string, subdomain: string, orgType?: string) => Promise<CreateWorkspaceResult>
  clearSession: () => void
}

function saveToken(token: string | null, role?: string | null, user?: AuthUser | null) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    window.localStorage.setItem('spotway.accessToken', token)
    if (role) {
      window.localStorage.setItem('spotway.role', role)
    }
    if (user) {
      window.localStorage.setItem('spotway.user', JSON.stringify(user))
    }
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    window.localStorage.removeItem('spotway.accessToken')
    window.localStorage.removeItem('spotway.refreshToken')
    window.localStorage.removeItem('spotway.role')
    window.localStorage.removeItem('spotway.user')
  }
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem('spotway.user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed.name === 'Elena Rostova' || parsed.email === 'elena@metro.com') {
      window.localStorage.removeItem('spotway.user')
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function roleLabel(role: Role) {
  return {
    admin: 'Quản trị viên',
    building_owner: 'Chủ tòa nhà',
    building_manager: 'Quản lý tòa nhà',
    store_owner: 'Chủ gian hàng',
    guest: 'Khách / Người dùng mới',
  }[role]
}

const initialSavedUser = getStoredUser()

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSavedUser,
  token: window.localStorage.getItem(AUTH_TOKEN_KEY) ?? window.localStorage.getItem('spotway.accessToken'),
  isInitializing: !initialSavedUser && Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY) ?? window.localStorage.getItem('spotway.accessToken')),
  isLoading: false,
  error: null,

  async initialize() {
    const token =
      window.localStorage.getItem(AUTH_TOKEN_KEY) ??
      window.localStorage.getItem('spotway.accessToken')
    if (!token) {
      saveToken(null)
      set({ user: null, token: null, isInitializing: false })
      return
    }

    try {
      const user = await getCurrentUser()
      saveToken(token, user.role, user)
      set({ user, token, error: null })
    } catch {
      saveToken(null)
      set({ user: null, token: null })
    } finally {
      set({ isInitializing: false })
    }
  },

  async register(fullName, email, password) {
    set({ isLoading: true, error: null })
    try {
      const result = await registerRequest(fullName, email, password)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng ký thất bại'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async verifyEmail(email, code) {
    set({ isLoading: true, error: null })
    try {
      const result = await verifyEmailRequest(email, code)
      // Save token first so subsequent /auth/me call is authenticated
      saveToken(result.token, null, null)
      // Fetch full user profile (works with both MSW mock and real BE)
      let user: AuthUser = result.user
      if (!user?.id) {
        user = await getCurrentUser()
      }
      saveToken(result.token, user.role, user)
      set({ user, token: result.token, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xác thực mã thất bại'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: null })
    try {
      const result = await loginRequest(email, password)
      // Save token first so subsequent /auth/me call is authenticated
      saveToken(result.token, null, null)
      let user: AuthUser = result.user
      if (!user?.id || !user?.email) {
        user = await getCurrentUser()
      }
      saveToken(result.token, user.role, user)
      set({ user, token: result.token, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng nhập thất bại'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  async logout() {
    try {
      await logoutRequest()
    } finally {
      saveToken(null)
      set({ user: null, token: null, error: null })
    }
  },

  async changePassword(currentPassword, newPassword) {
    const user = await changePasswordRequest({ currentPassword, newPassword })
    saveToken(window.localStorage.getItem('spotway.accessToken'), user.role, user)
    set({ user })
  },

  async createWorkspace(name, subdomain, orgType) {
    set({ isLoading: true, error: null })
    try {
      const result = await createWorkspaceRequest({ name, subdomain, orgType })
      const token = result.accessToken || window.localStorage.getItem(AUTH_TOKEN_KEY) || window.localStorage.getItem('spotway.accessToken')
      const user = result.user
      saveToken(token, user.role, user)
      set({ user, token, error: null })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tạo workspace thất bại'
      set({ error: message })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  clearSession() {
    saveToken(null)
    set({ user: null, token: null })
  },
}))

window.addEventListener('auth:expired', () => {
  useAuthStore.getState().clearSession()
})
