import { create } from 'zustand'
import { changePassword as changePasswordRequest, getCurrentUser, login as loginRequest, logout as logoutRequest } from './api'
import type { AuthUser, Role } from '../types/auth'

export const AUTH_TOKEN_KEY = 'auth:token'

type AuthState = {
  user: AuthUser | null
  token: string | null
  isInitializing: boolean
  isLoading: boolean
  error: string | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>
  clearSession: () => void
}

function saveToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

export function roleLabel(role: Role) {
  return {
    admin: 'Quản trị viên',
    building_owner: 'Chủ tòa nhà',
    building_manager: 'Quản lý tòa nhà',
    store_owner: 'Chủ gian hàng',
  }[role]
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: window.localStorage.getItem(AUTH_TOKEN_KEY),
  isInitializing: true,
  isLoading: false,
  error: null,

  async initialize() {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      set({ isInitializing: false })
      return
    }

    try {
      const user = await getCurrentUser()
      set({ user, token, error: null })
    } catch {
      saveToken(null)
      set({ user: null, token: null })
    } finally {
      set({ isInitializing: false })
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: null })
    try {
      const result = await loginRequest(email, password)
      saveToken(result.token)
      set({ user: result.user, token: result.token })
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
    set({ user })
  },

  clearSession() {
    saveToken(null)
    set({ user: null, token: null })
  },
}))

window.addEventListener('auth:expired', () => {
  useAuthStore.getState().clearSession()
})
