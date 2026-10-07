import type { ReactNode } from 'react'
import { cn } from '../cn'
import type { IconName } from '../icons'
import { Icon } from './Icon'

type MessagePanelProps = {
  icon: IconName
  title: string
  description?: string
  /** What exactly went wrong (e.g. the server's message), in small print under the description. */
  detail?: string
  /** Usually one or two buttons or links. */
  action?: ReactNode
  tone?: 'neutral' | 'error'
  /** Use 1 when the panel is the page's main content (it then provides the h1). */
  headingLevel?: 1 | 2
  /**
   * Live-region role. Set it only when the panel reports the outcome of
   * something the user did (a failed request, an empty search); static page
   * content should not be announced.
   */
  role?: 'status' | 'alert'
  className?: string
}

/** Centered panel for empty, error and not-found states. */
export function MessagePanel({
  icon,
  title,
  description,
  detail,
  action,
  tone = 'neutral',
  headingLevel = 2,
  role,
  className,
}: MessagePanelProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-space-md rounded-xl bg-surface-container-low px-space-lg py-space-xl text-center',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full',
          tone === 'error'
            ? 'bg-error-container text-on-error-container'
            : 'bg-surface-container-high text-primary',
        )}
      >
        <Icon name={icon} size={24} />
      </span>
      <div className="flex max-w-md flex-col gap-space-xs">
        <Heading className="text-headline-sm text-primary">{title}</Heading>
        {description && (
          <p className="text-body-md text-on-surface-variant">{description}</p>
        )}
        {detail && (
          <p className="font-mono text-code-sm text-on-surface-variant">
            {detail}
          </p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap justify-center gap-space-sm">
          {action}
        </div>
      )}
    </div>
  )
}
