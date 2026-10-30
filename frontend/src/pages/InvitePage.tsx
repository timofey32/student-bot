import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar } from '../components/ui/Avatar'
import LoadingScreen from '../components/ui/LoadingScreen'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'

export function InvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register, loading: authLoading, user } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const inviteToken = searchParams.get('invite') || searchParams.get('token')
  const tgInitData = searchParams.get('tgWebAppData')

  const [step, setStep] = useState<'check' | 'register' | 'name'>('check')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    username: '',
    password: '',
  })

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  // Handle Telegram Web App init data
  useEffect(() => {
    if (tgInitData && !authLoading) {
      login(tgInitData).catch(console.error)
    }
  }, [tgInitData, login, authLoading])

  // Check invite token validity
  useEffect(() => {
    if (inviteToken) {
      checkInvite(inviteToken)
    } else {
      setStep('register')
    }
  }, [inviteToken])

  const checkInvite = async (token: string) => {
    setLoading(true)
    try {
      const res = await api.get(`/groups/invite/${token}`)
      if (res.data.success) {
        setStep('name')
      } else {
        toastError('Пригласительная ссылка недействительна')
        setStep('register')
      }
    } catch {
      toastError('Ошибка проверки приглашения')
      setStep('register')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toastError('Введите имя и фамилию')
      return
    }

    setLoading(true)
    try {
      if (tgInitData) {
        await login(tgInitData)
      } else {
        // For web registration, we need a telegramId
        // This is a simplified flow - in production you'd have proper web auth
        const telegramId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        await register({
          telegramId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          username: formData.username || undefined,
          inviteToken: inviteToken || undefined,
        })
      }
      toastSuccess('Добро пожаловать!')
      navigate('/')
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  if (loading && step === 'check') {
    return <LoadingScreen text="Проверка приглашения..." />
  }

  if (authLoading) {
    return <LoadingScreen text="Авторизация в Telegram..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-h1">Student Bot</h1>
          <p className="text-text-muted mt-1">Управление учебной группой</p>
        </div>

        {/* Invite info */}
        {inviteToken && step !== 'register' && (
          <div className="card p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Приглашение в группу</p>
                <p className="text-body-sm text-text-muted">Введите ваши данные для вступления</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Имя"
            placeholder="Иван"
            value={formData.firstName}
            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
            autoFocus
            icon={User}
          />
          <Input
            label="Фамилия"
            placeholder="Иванов"
            value={formData.lastName}
            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
            icon={User}
          />
          <Input
            label="Отчество (необязательно)"
            placeholder="Иванович"
            value={formData.middleName}
            onChange={e => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
            icon={User}
          />
          {!tgInitData && (
            <Input
              label="Username (необязательно)"
              placeholder="@username"
              value={formData.username}
              onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
              icon={Mail}
            />
          )}

          <Button type="submit" fullWidth loading={loading} className="mt-2">
            {tgInitData ? 'Войти через Telegram' : 'Зарегистрироваться'}
          </Button>
        </form>

        {/* Telegram login button */}
        {!tgInitData && (
          <div className="mt-6 text-center">
            <p className="text-text-muted text-body-sm mb-3">Или войдите через Telegram</p>
            <a
              href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'your_bot'}?start=webapp`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.033-1.61-4.033-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.21 0 1.59-.015 2.87-.015 3.26 0 .318.21.69.825.57C20.565 21.797 24 17.297 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Telegram
            </a>
          </div>
        )}

        <p className="text-center text-caption text-text-muted mt-6">
          Входя, вы соглашаетесь с <a href="#" className="text-primary hover:underline">политикой конфиденциальности</a>
        </p>
      </div>
    </div>
  )
}

export default InvitePage
