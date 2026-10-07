import { useId, type ComponentProps } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../cn'
import type { IconName } from '../icons'
import { Icon } from './Icon'

const inputStyles = cva(
  // A white field with an outline at 80% (3.1:1 on white) reads as a field without looking boxed in.
  'w-full rounded-lg bg-surface-container-lowest px-space-md py-3 text-primary ring-1 ring-outline/80 transition-all hover:ring-on-surface-variant placeholder:text-on-surface-variant focus:shadow-sm focus:ring-2 focus:ring-primary focus:outline-hidden',
  {
    variants: {
      mono: { true: 'font-mono text-code-sm', false: 'text-body-md' },
      invalid: {
        true: 'ring-2 ring-error hover:ring-error focus:ring-error',
        false: '',
      },
    },
    defaultVariants: { mono: false, invalid: false },
  },
)

type TextFieldProps = Omit<ComponentProps<'input'>, 'size'> & {
  label: string
  /** Monospace input, for card numbers and codes. */
  mono?: boolean
  error?: string
  hint?: string
  leadingIcon?: IconName
}

export function TextField({
  label,
  mono = false,
  error,
  hint,
  leadingIcon,
  id,
  className,
  'aria-describedby': describedByProp,
  'aria-invalid': ariaInvalidProp,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const message = error ?? hint
  const messageId = message ? `${inputId}-message` : undefined
  const describedBy =
    [describedByProp, messageId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className="text-label-sm tracking-wider text-on-surface-variant uppercase"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            size={18}
            className="pointer-events-none absolute left-space-md text-on-surface-variant"
          />
        )}
        <input
          {...inputProps}
          id={inputId}
          aria-invalid={error ? true : ariaInvalidProp}
          aria-describedby={describedBy}
          className={cn(
            inputStyles({ mono, invalid: Boolean(error) }),
            leadingIcon && 'pl-11',
          )}
        />
      </div>
      {message && (
        <p
          id={messageId}
          className={cn(
            'text-body-sm',
            error ? 'text-error' : 'text-on-surface-variant',
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
