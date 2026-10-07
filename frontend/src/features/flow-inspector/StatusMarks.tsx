import type { CSSProperties } from 'react'
import { cn } from '../../design-system'
import type { FlowStatus } from '../../flows/analysis/classify'
import { DOT_CLASSES, STATUS_LABELS } from './status-styles'

export function StatusDot({
  status,
  drawnAs = status,
}: {
  status: FlowStatus
  drawnAs?: FlowStatus
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-full',
          DOT_CLASSES[drawnAs],
          drawnAs === 'active' && 'live-dot',
        )}
      />
      <span className="sr-only">{STATUS_LABELS[status]}: </span>
    </>
  )
}

export const START_DROP = 10

export function StartMark({
  arm,
  className,
  style,
}: {
  arm: number
  className?: string
  style?: CSSProperties
}) {
  const corner = 5
  return (
    <svg
      aria-hidden
      width={arm + 4}
      height={START_DROP + 8}
      viewBox={`-4 ${-START_DROP - 4} ${arm + 4} ${START_DROP + 8}`}
      className={cn('shrink-0', className)}
      style={style}
    >
      <circle cy={-START_DROP} r={3.5} fill="currentColor" />
      <path
        d={`M0,${-START_DROP + 3} V${-corner} Q0,0 ${corner},0 H${arm - 5}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
      />
      <path d={`M${arm},0 l-7,-3.75 v7.5 Z`} fill="currentColor" />
    </svg>
  )
}

export function StartMarkDown({
  arm,
  className,
  style,
}: {
  arm: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden
      width={8}
      height={arm + 8}
      viewBox={`-4 -8 8 ${arm + 8}`}
      className={cn('shrink-0', className)}
      style={style}
    >
      <circle cy={-4} r={3.5} fill="currentColor" />
      <path
        d={`M0,-1 V${arm - 5}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
      />
      <path d={`M0,${arm} l-3.75,-7 h7.5 Z`} fill="currentColor" />
    </svg>
  )
}
