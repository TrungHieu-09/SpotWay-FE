import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const method = error.config?.method?.toUpperCase?.() ?? 'REQUEST'
    const url = error.config?.url ?? ''
    const message =
      error.response?.data?.message ??
      (status === 404
        ? `Không tìm thấy dữ liệu cho ${method} ${url}. Dữ liệu mock trong localStorage có thể đã cũ, hãy tải lại trang để đồng bộ.`
        : error.message) ??
      'Request failed'
    return Promise.reject(new Error(message))
  },
)

