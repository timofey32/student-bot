import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, ApiResponse } from '@student-bot/shared'
import { api } from '../api/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (initData: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

interface RegisterData {
  telegramId: string
  firstName: string
  lastName: string
  middleName?: string
  username?: string
  avatarUrl?: string
  inviteToken?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<User>>('/auth/me')
      if (res.data.success && res.data.data) {
        setUser(res.data.data)
        localStorage.setItem('user_data', JSON.stringify(res.data.data))
      } else {
        setUser(null)
        localStorage.removeItem('user_data')
        localStorage.removeItem('auth_token')
      }
    } catch {
      setUser(null)
      localStorage.removeItem('user_data')
      localStorage.removeItem('auth_token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check for stored token
    const token = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user_data')

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        api.defaults.headers.common.Authorization = `Bearer ${token}`
        // Verify token is still valid
        refreshUser()
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [refreshUser])

  const login = async (initData: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/telegram', { initData })
      if (res.data.success && res.data.data) {
        const { token, user: userData } = res.data.data
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_data', JSON.stringify(userData))
        api.defaults.headers.common.Authorization = `Bearer ${token}`
        setUser(userData)
      } else {
        throw new Error(res.data.error || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/register', data)
      if (res.data.success && res.data.data) {
        const { token, user: userData } = res.data.data
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_data', JSON.stringify(userData))
        api.defaults.headers.common.Authorization = `Bearer ${token}`
        setUser(userData)
      } else {
        throw new Error(res.data.error || 'Registration failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('selected_group')
    delete api.defaults.headers.common.Authorization
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}