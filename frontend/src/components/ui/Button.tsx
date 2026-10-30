import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, disabled, children, ...props }, ref) => {
    const baseClasses = 'btn'
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      success: 'btn-success',
    }
    const sizeClasses = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
      icon: 'btn-icon',
    }

    return (
      <button
        ref={ref}
        className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size={size === 'sm' || size === 'icon' ? 'sm' : 'md'} />}
        {!loading && children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// IconButton variant
export function IconButton({ className, ...props }: ButtonProps) {
  return <Button className={clsx('btn-icon', className)} size="icon" {...props} />
}