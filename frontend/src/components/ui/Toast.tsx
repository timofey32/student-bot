import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { IconButton } from './Button'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextType {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id'>) => string
  hide: (id: string) => void
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
}

const ToastContext = createContext<ToastContextType | null>(null)

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'text-success border-success/20',
  error: 'text-danger border-danger/20',
  warning: 'text-warning border-warning/20',
  info: 'text-primary border-primary/20',
}

const bgColors = {
  success: 'bg-success-muted',
  error: 'bg-danger-muted',
  warning: 'bg-warning-muted',
  info: 'bg-primary-muted',
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = icons[toast.type]
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 200)
    }, toast.duration ?? 5000)
    return () => clearTimeout(timer)
  }, [toast.duration, onClose])

  if (!visible) return null

  return (
    <div
      className={clsx(
        'toast flex items-start gap-3 animate-in',
        colors[toast.type],
        bgColors[toast.type]
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{toast.title}</p>
        {toast.message && <p className="text-body-sm opacity-80 mt-0.5">{toast.message}</p>}
      </div>
      <IconButton onClick={onClose} aria-label="Закрыть" className="flex-shrink-0 opacity-50 hover:opacity-100">
        <X className="w-4 h-4" />
      </IconButton>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const hide = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const helpers = useCallback(() => ({
    success: (title: string, message?: string) => show({ type: 'success', title, message }),
    error: (title: string, message?: string) => show({ type: 'error', title, message, duration: 7000 }),
    warning: (title: string, message?: string) => show({ type: 'warning', title, message }),
    info: (title: string, message?: string) => show({ type: 'info', title, message }),
  }), [show])

  return (
    <ToastContext.Provider value={{ toasts, show, hide, ...helpers() }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hide(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}