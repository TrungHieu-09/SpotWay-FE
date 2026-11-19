import { create } from 'zustand'
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  exchangeOAuthCode,
  login as loginRequest,
  logout as logoutRequest,
  updateProfile as updateProfileRequest,
} from './api'
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
  loginWithOAuth: (code: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (name: string) => Promise<AuthUser>
  changePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>
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
      const currentToken = window.localStorage.getItem('spotway.accessToken') ?? token
      saveToken(currentToken, user.role, user)
      set({ user, token: currentToken, error: null })
    } catch (error) {
      // Only an answered 401/403 means the session is dead; a BE restart or lost connection keeps the cached user.
      const status = (error as { status?: number; response?: { status?: number } })?.status ?? (error as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        saveToken(null)
        set({ user: null, token: null })
      }
    } finally {
      set({ isInitializing: false })
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

  async loginWithOAuth(code) {
    set({ isLoading: true, error: null })
    try {
      const result = await exchangeOAuthCode(code)
      saveToken(result.token)
      const user = await getCurrentUser()
      saveToken(result.token, user.role, user)
      set({ user, token: result.token })
    } catch (error) {
      saveToken(null)
      set({ user: null, token: null })
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

  async updateProfile(name) {
    const cleanName = name.trim()
    const merged = await updateProfileRequest({ name: cleanName })
    const token =
      window.localStorage.getItem(AUTH_TOKEN_KEY) ??
      window.localStorage.getItem('spotway.accessToken')
    saveToken(token, merged.role, merged)
    set({ user: merged })
    return merged
  },

  async changePassword(currentPassword, newPassword) {
    await changePasswordRequest({ currentPassword, newPassword })
    saveToken(null)
    set({ user: null, token: null })
  },

  clearSession() {
    saveToken(null)
    set({ user: null, token: null })
  },
}))

window.addEventListener('auth:expired', () => {
  useAuthStore.getState().clearSession()
})
