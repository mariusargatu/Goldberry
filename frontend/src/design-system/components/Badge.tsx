import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../cn'

const badgeStyles = cva(
  'inline-flex items-center justify-center whitespace-nowrap',
  {
    variants: {
      variant: {
        count:
          'h-[18px] min-w-[18px] rounded-full bg-primary px-1 text-label-sm leading-none font-semibold text-on-primary',
        edition:
          'rounded bg-secondary-fixed/50 px-1.5 py-0.5 font-mono text-code-sm font-bold tracking-wider text-secondary uppercase',
        pill: 'rounded-full bg-surface-container px-2.5 py-0.5 text-label-md text-on-surface-variant',
        tag: 'rounded bg-surface-container px-2 py-0.5 font-mono text-code-sm text-on-surface-variant uppercase',
      },
    },
    defaultVariants: { variant: 'pill' },
  },
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeStyles>

export function Badge({ variant, className, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />
}
