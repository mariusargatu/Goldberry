import { cn } from '../cn'
import { ICONS, type IconName } from '../icons'

type IconProps = {
  name: IconName
  size?: number
  /** Accessible label. Omit for decorative icons (hidden from assistive tech). */
  label?: string
  className?: string
}

export function Icon({ name, size = 20, label, className }: IconProps) {
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      className={cn('inline-block shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={ICONS[name]} />
    </svg>
  )
}
