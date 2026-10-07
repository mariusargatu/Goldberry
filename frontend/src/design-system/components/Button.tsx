import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../cn'
import type { IconName } from '../icons'
import { Icon } from './Icon'

export const buttonStyles = cva(
  'relative inline-flex items-center justify-center gap-2 text-label-lg font-semibold whitespace-nowrap transition-all active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary shadow-md hover:bg-on-surface-variant',
        secondary:
          'bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary',
        ghost:
          'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
      },
      size: {
        sm: 'h-9 rounded-lg px-space-md text-label-md',
        md: 'h-11 rounded-lg px-space-lg',
        lg: 'h-14 w-full rounded-xl px-space-lg font-bold',
        icon: 'size-10 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonStyles> & {
    /** Leading icon. */
    icon?: IconName
  }

export function Button({
  variant,
  size,
  icon,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'icon' ? 20 : 18} />}
      {children}
    </button>
  )
}
