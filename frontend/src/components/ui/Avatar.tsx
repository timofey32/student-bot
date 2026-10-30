import { clsx } from 'clsx'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  status?: 'online' | 'offline' | 'busy'
}

const sizeClasses = {
  xs: 'avatar-xs',
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
}

const statusSize = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
}

const statusColors = {
  online: 'bg-success',
  offline: 'bg-text-muted',
  busy: 'bg-warning',
}

const sizeText = {
  xs: 'text-[9px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}

export function Avatar({ src, alt, name, size = 'md', className, status }: AvatarProps) {
  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={clsx('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={clsx('rounded-full object-cover ring-2 ring-background', sizeClasses[size])}
        />
      ) : (
        <div className={clsx('avatar flex items-center justify-center bg-primary-muted text-primary-light font-medium select-none ring-2 ring-background overflow-hidden', sizeClasses[size], sizeText[size])}>
          {initials || '?'}
        </div>
      )}
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
            statusSize[size],
            statusColors[status]
          )}
          aria-label={status}
        />
      )}
    </div>
  )
}