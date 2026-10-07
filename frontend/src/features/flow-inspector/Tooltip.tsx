import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../design-system'

export function Tooltip({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden
      onClick={(event) => event.stopPropagation()}
      className={cn('insp-tip', className)}
      style={style}
    >
      <span className="block w-max max-w-72 rounded-insp border border-insp-border bg-insp-bar px-2 py-1 text-insp-sm font-medium text-insp-text">
        {children}
      </span>
    </span>
  )
}
