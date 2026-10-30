import { clsx } from 'clsx'

interface LoadingScreenProps {
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingScreen({ text = 'Загрузка...', className, size = 'md' }: LoadingScreenProps) {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4', className)}>
      <div
        className={clsx(
          'rounded-full border-primary border-t-transparent animate-spin',
          sizes[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-body-sm text-text-muted">{text}</p>}
    </div>
  )
}