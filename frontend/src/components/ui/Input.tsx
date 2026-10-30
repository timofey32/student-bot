import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react'
import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, iconPosition = 'left', fullWidth = true, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`
    const Icon = icon

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && <label htmlFor={id} className="label">{label}</label>}
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={clsx(
              'input',
              Icon && iconPosition === 'left' && 'pl-10',
              Icon && iconPosition === 'right' && 'pr-10',
              error && 'input-error',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={clsx(error && errorId, hint && hintId)}
            {...props}
          />
          {Icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
        </div>
        {error && <p id={errorId} className="mt-1.5 text-caption text-danger" role="alert">{error}</p>}
        {hint && !error && <p id={hintId} className="mt-1.5 text-caption text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, fullWidth = true, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && <label htmlFor={id} className="label">{label}</label>}
        <textarea
          ref={ref}
          id={id}
          className={clsx('input resize-y min-h-[100px]', error && 'input-error', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={clsx(error && errorId, hint && hintId)}
          {...props}
        />
        {error && <p id={errorId} className="mt-1.5 text-caption text-danger" role="alert">{error}</p>}
        {hint && !error && <p id={hintId} className="mt-1.5 text-caption text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, fullWidth = true, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && <label htmlFor={id} className="label">{label}</label>}
        <select
          ref={ref}
          id={id}
          className={clsx('input appearance-none bg-no-repeat bg-right pr-10', error && 'input-error', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={clsx(error && errorId, hint && hintId)}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} className="mt-1.5 text-caption text-danger" role="alert">{error}</p>}
        {hint && !error && <p id={hintId} className="mt-1.5 text-caption text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'