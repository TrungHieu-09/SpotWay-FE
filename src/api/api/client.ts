import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('auth:token')
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const method = error.config?.method?.toUpperCase?.() ?? 'REQUEST'
    const url = error.config?.url ?? ''
    if (status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('auth:token')
      window.dispatchEvent(new Event('auth:expired'))
    }
    const responseData: unknown = error.response?.data
    const responseMessage =
      typeof responseData === 'object' && responseData !== null &&
      'message' in responseData && typeof responseData.message === 'string'
        ? responseData.message
        : undefined
    const message =
      responseMessage ??
      (status === 404
        ? `Không tìm thấy dữ liệu cho ${method} ${url}. Dữ liệu mock trong localStorage có thể đã cũ, hãy tải lại trang để đồng bộ.`
        : error.message) ??
      'Request failed'
    const apiError = new Error(message)
    if (typeof responseData === 'object' && responseData !== null && 'code' in responseData) {
      Object.assign(apiError, { code: responseData.code })
    }
    return Promise.reject(apiError)
  },
)

