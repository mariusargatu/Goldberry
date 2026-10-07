import { cva } from 'class-variance-authority'
import { cn } from '../cn'
import { Icon } from './Icon'

type StepStatus = 'done' | 'active' | 'upcoming'

const markerStyles = cva(
  'flex size-8 shrink-0 items-center justify-center rounded-full text-label-md',
  {
    variants: {
      status: {
        done: 'bg-surface-container-high text-primary',
        active: 'bg-primary font-bold text-on-primary shadow-sm',
        upcoming: 'bg-surface-container text-on-surface-variant',
      },
    },
  },
)

const labelStyles = cva('text-label-md sm:text-label-lg', {
  variants: {
    status: {
      done: 'text-primary',
      active: 'font-bold text-primary',
      upcoming: 'font-medium text-on-surface-variant',
    },
  },
})

function statusOf(index: number, currentIndex: number): StepStatus {
  if (index < currentIndex) return 'done'
  if (index === currentIndex) return 'active'
  return 'upcoming'
}

type StepperProps<Step extends string> = {
  steps: readonly Step[]
  /** The active step. Earlier steps render as done. */
  current: Step
  label: string
  className?: string
}

/** Numbered progress steps. Labels sit under the markers on small screens. */
export function Stepper<Step extends string>({
  steps,
  current,
  label,
  className,
}: StepperProps<Step>) {
  const currentIndex = steps.indexOf(current)
  return (
    <ol
      aria-label={label}
      className={cn(
        'grid gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:gap-space-md sm:p-space-lg',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const status = statusOf(index, currentIndex)
        return (
          <li
            key={step}
            aria-current={status === 'active' ? 'step' : undefined}
            className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left"
          >
            <span className={markerStyles({ status })}>
              {status === 'done' ? (
                <Icon name="check" size={18} label="Done" />
              ) : (
                index + 1
              )}
            </span>
            <span className={labelStyles({ status })}>{step}</span>
          </li>
        )
      })}
    </ol>
  )
}
