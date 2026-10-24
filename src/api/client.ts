import axios, { type InternalAxiosRequestConfig } from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

type TokenPair = {
  accessToken: string
  refreshToken: string
}

type RetriableRequest = InternalAxiosRequestConfig & { _spotwayRetried?: boolean }

let refreshInFlight: Promise<TokenPair> | null = null

function clearSession() {
  window.localStorage.removeItem('spotway.accessToken')
  window.localStorage.removeItem('spotway.refreshToken')
  window.localStorage.removeItem('spotway.role')
  window.localStorage.removeItem('auth:token')
}

async function refreshAccessToken() {
  const refreshToken = window.localStorage.getItem('spotway.refreshToken')
  if (!refreshToken) {
    throw new Error('Phiên đăng nhập đã hết hạn')
  }

  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<{ success?: boolean; data?: TokenPair }>(`${apiBaseUrl}/auth/refresh`, {
        refreshToken,
      })
      .then((response) => {
        const tokens = response.data.data
        if (!response.data.success || !tokens?.accessToken || !tokens.refreshToken) {
          throw new Error('Không thể làm mới phiên đăng nhập')
        }
        window.localStorage.setItem('spotway.accessToken', tokens.accessToken)
        window.localStorage.setItem('spotway.refreshToken', tokens.refreshToken)
        return tokens
      })
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const token =
    window.localStorage.getItem('spotway.accessToken') ||
    window.localStorage.getItem('auth:token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as { success?: boolean; data?: unknown; error?: { message?: string } }
    if (body.success === true) return { ...response, data: body.data }
    return response
  },
  async (error) => {
    const request = error.config as RetriableRequest | undefined
    const isRefreshRequest = request?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && request && !request._spotwayRetried && !isRefreshRequest) {
      request._spotwayRetried = true
      try {
        const tokens = await refreshAccessToken()
        request.headers.Authorization = `Bearer ${tokens.accessToken}`
        return apiClient.request(request)
      } catch {
        clearSession()
        if (window.location.pathname !== '/login') window.location.assign('/login')
      }
    }
    const message = error.response?.data?.error?.message ?? error.response?.data?.message ?? error.message ?? 'Request failed'
    return Promise.reject(new Error(message))
  },
)

