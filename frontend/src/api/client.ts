import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { ApiResponse } from '@student-bot/shared'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      localStorage.removeItem('selected_group')
      delete api.defaults.headers.common.Authorization

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/invite')) {
        window.location.href = '/invite'
      }
    }
    return Promise.reject(error)
  }
)

// Helper functions
export async function get<T>(url: string, params?: any) {
  const res = await api.get<T>(url, { params })
  return res
}

export async function post<T>(url: string, data?: any) {
  const res = await api.post<T>(url, data)
  return res
}

export async function patch<T>(url: string, data?: any) {
  const res = await api.patch<T>(url, data)
  return res
}

export async function put<T>(url: string, data?: any) {
  const res = await api.put<T>(url, data)
  return res
}

export async function del<T>(url: string) {
  const res = await api.delete<T>(url)
  return res
}

// Upload file
export async function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<ApiResponse<{ url: string; fileName: string }>>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
      }
    },
  })
  return res
}