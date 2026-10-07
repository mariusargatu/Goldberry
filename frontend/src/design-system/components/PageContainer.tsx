import type { HTMLAttributes } from 'react'
import { cn } from '../cn'

export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-7xl px-gutter-mobile md:px-gutter',
        className,
      )}
      {...props}
    />
  )
}
