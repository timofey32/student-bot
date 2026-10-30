import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  icon?: LucideIcon
  className?: string
  dot?: boolean
  dotColor?: string
}

const variantClasses = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-caption',
}

export function Badge({ children, variant = 'neutral', size = 'md', icon, className, dot, dotColor }: BadgeProps) {
  const Icon = icon
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-badge font-medium', variantClasses[variant], sizeClasses[size], className)}>
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor)} />}
      {children}
    </span>
  )
}

// Attendance status badge
export function AttendanceBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: BadgeProps['variant']; dotColor: string }> = {
    PRESENT: { label: 'Присутствует', variant: 'success', dotColor: 'bg-success' },
    ABSENT: { label: 'Отсутствует', variant: 'danger', dotColor: 'bg-danger' },
    LATE: { label: 'Опоздал', variant: 'warning', dotColor: 'bg-warning' },
    EXCUSED: { label: 'Уважительная', variant: 'primary', dotColor: 'bg-primary' },
    PENDING: { label: 'Не ответил', variant: 'neutral', dotColor: 'bg-text-muted' },
  }

  const cfg = config[status] || config.PENDING

  return (
    <Badge variant={cfg.variant} dot dotColor={cfg.dotColor} size="sm">
      {cfg.label}
    </Badge>
  )
}

// Homework status badge
export function HomeworkStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    PENDING: { label: 'Не сдана', variant: 'neutral' },
    SUBMITTED: { label: 'Сдана', variant: 'primary' },
    CHECKED: { label: 'Проверяется', variant: 'warning' },
    ACCEPTED: { label: 'Зачтено', variant: 'success' },
    REJECTED: { label: 'Не зачтено', variant: 'danger' },
    LATE: { label: 'С опозданием', variant: 'warning' },
  }

  const cfg = config[status] || config.PENDING

  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
}

// Role badge
export function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    SUPER_ADMIN: { label: 'Главный админ', variant: 'primary' },
    ADMIN: { label: 'Админ', variant: 'primary' },
    STUDENT: { label: 'Студент', variant: 'success' },
    PARENT: { label: 'Родитель', variant: 'warning' },
  }

  const cfg = config[role] || config.STUDENT

  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
}