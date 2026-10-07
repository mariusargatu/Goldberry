import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../cn'

const cardStyles = cva('rounded-xl shadow-sm', {
  variants: {
    tone: {
      lowest: 'bg-surface-container-lowest',
      low: 'bg-surface-container-low',
    },
    padding: {
      md: 'p-space-md',
      lg: 'p-space-lg',
    },
  },
  defaultVariants: { tone: 'lowest', padding: 'lg' },
})

type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardStyles>

export function Card({ tone, padding, className, ...props }: CardProps) {
  return (
    <div className={cn(cardStyles({ tone, padding }), className)} {...props} />
  )
}
