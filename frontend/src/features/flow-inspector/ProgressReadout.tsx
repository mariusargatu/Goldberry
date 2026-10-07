import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { cn } from '../../design-system'
import { MODEL } from './flow-api'
import { reasonOf, titleOf } from './flow-copy'
import type { FlowView } from './flow-probe'
import { gateOf, pageProgressOf } from './step-model'
import { Tooltip } from './Tooltip'

export function progressWords(visited: number): string {
  return visited === MODEL.transitions
    ? `All ${MODEL.transitions} flows visited`
    : `${visited} of ${MODEL.transitions} flows visited`
}

export function ProgressBar({
  visited,
  className,
  vertical = false,
}: {
  visited: number
  className?: string
  vertical?: boolean
}) {
  const share = visited / MODEL.transitions
  return (
    <span
      role="img"
      aria-label={progressWords(visited)}
      className={cn('insp-tip-anchor relative block', className)}
      style={{ '--fill-at': `${share * 100}%` } as CSSProperties}
    >
      <span className="progress-track h-full">
        <span
          className={cn('progress-fill', vertical && 'origin-top')}
          style={{
            transform: vertical ? `scaleY(${share})` : `scaleX(${share})`,
          }}
        />
      </span>
      <Tooltip
        className={
          vertical ? 'top-0 right-full bottom-auto pr-2 pb-0' : 'progress-tip'
        }
      >
        {progressWords(visited)}
      </Tooltip>
    </span>
  )
}

export const ROW_LABEL = 'w-14 shrink-0 text-insp-sm text-insp-muted sm:w-16'

function useCurrentInSight(pageId: string | null) {
  const list = useRef<HTMLUListElement>(null)
  useLayoutEffect(() => {
    const row = list.current
    const current = row?.querySelector('[aria-current]')
    if (!row || !current || row.scrollWidth <= row.clientWidth) return
    const view = row.getBoundingClientRect()
    const box = current.getBoundingClientRect()
    if (box.left >= view.left && box.right <= view.right - 24) return
    row.scrollLeft += box.left + box.width / 2 - (view.left + view.width / 2)
  }, [pageId])
  return list
}

export function PageRow({ view, side }: { view: FlowView; side: boolean }) {
  const list = useCurrentInSight(view.pageId)
  const pages = useMemo(() => {
    const impossible = new Set([
      ...view.impossible,
      ...view.next.exits
        .filter((exit) => exit.status === 'impossible')
        .map((exit) => exit.edgeId),
    ])
    return pageProgressOf(new Set(view.tested), impossible)
  }, [view.tested, view.impossible, view.next])
  return (
    <dl className={side ? 'block' : 'flex items-baseline'}>
      <dt className={side ? 'sr-only' : cn(ROW_LABEL, 'max-sm:sr-only')}>
        <span className="sr-only">Explored</span>
      </dt>
      <dd className="min-w-0 flex-1">
        <ul
          ref={list}
          onScroll={(event) =>
            event.currentTarget.toggleAttribute(
              'data-scrolled',
              event.currentTarget.scrollLeft > 0,
            )
          }
          className={cn(
            'text-insp-sm',
            side
              ? '-mx-2 flex flex-col gap-1'
              : 'page-row -ml-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5',
          )}
        >
          {pages.map((page) => {
            const current = page.pageId === view.pageId
            const blocked = page.blockedBy
            const complete = page.tested === page.total
            return (
              <li
                key={page.pageId}
                aria-current={current || undefined}
                className={cn(
                  'relative px-2',
                  side
                    ? 'grid grid-cols-[1fr_auto] items-baseline gap-x-3'
                    : 'flex items-baseline gap-x-1.5 whitespace-nowrap max-sm:shrink-0',
                )}
              >
                {current && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-1 size-1.5 -translate-y-1/2 rounded-full bg-flow-now"
                  />
                )}
                <span
                  className={
                    current ? 'font-medium text-insp-text' : 'text-insp-muted'
                  }
                >
                  {titleOf(page.pageId)}
                </span>
                <span
                  className={cn(
                    'tabular-nums',
                    complete
                      ? 'text-flow-visited'
                      : current
                        ? 'text-insp-text'
                        : 'text-insp-muted',
                  )}
                >
                  <span aria-hidden>
                    {page.tested}/{page.total}
                  </span>
                  <span className="sr-only">
                    {page.tested} of {page.total} visited
                  </span>
                </span>
                {blocked && (
                  <span
                    className={cn(
                      'text-insp-muted',

                      side && 'col-span-2',
                    )}
                  >
                    {reasonOf(blocked.id, gateOf(blocked), view.bagEmpty)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </dd>
    </dl>
  )
}
