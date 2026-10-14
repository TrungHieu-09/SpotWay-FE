import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  timeout: 10_000,
})

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('spotway.accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as { success?: boolean; data?: unknown; error?: { message?: string } }
    if (body.success === true) return { ...response, data: body.data }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      window.localStorage.removeItem('spotway.accessToken')
      window.localStorage.removeItem('spotway.refreshToken')
      window.localStorage.removeItem('spotway.role')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    const message = error.response?.data?.error?.message ?? error.response?.data?.message ?? error.message ?? 'Request failed'
    return Promise.reject(new Error(message))
  },
)

