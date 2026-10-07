import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { ErrorBoundary } from '../../app/AppErrorBoundary'
import { cn, Icon, type IconName } from '../../design-system'
import { titleOf } from './flow-copy'
import type { FlowView } from './flow-probe'
import { moveWords, movesOf, NextLine } from './NextMoves'
import {
  PageRow,
  ProgressBar,
  progressWords,
  ROW_LABEL,
} from './ProgressReadout'
import { isFastPace } from './step-model'
import { Tooltip } from './Tooltip'
import { useDrawerHeight, type DrawerHeight } from './useDrawerHeight'
import { useFlowView } from './useFlowView'

const loadGraphView = () => import('./FlowGraphView')
const FlowGraphView = lazy(loadGraphView)
const preloadGraphView = () => {
  loadGraphView().catch(() => undefined)
}

const ANNOUNCE_GAP_MS = 1000

const MODEL_HEIGHT = '60svh'

const IN_SIGHT_MARGIN = 16

const SIDEBAR_QUERY = '(min-width: 64rem)'

function useWideScreen(): boolean {
  return useSyncExternalStore(
    (changed) => {
      const query = matchMedia(SIDEBAR_QUERY)
      query.addEventListener('change', changed)
      return () => query.removeEventListener('change', changed)
    },
    () => matchMedia(SIDEBAR_QUERY).matches,
  )
}

function useReservedSpace(
  drawer: RefObject<HTMLElement | null>,
  height: DrawerHeight,
  side = false,
) {
  useLayoutEffect(() => {
    const element = drawer.current
    if (!element) return
    const root = document.documentElement
    const publish = () => {
      const beside = element.dataset.placement === 'side'
      root.style.setProperty(
        '--flow-inspector-height',
        beside ? '0px' : `${element.offsetHeight}px`,
      )
      root.style.setProperty(
        '--flow-inspector-width',
        beside ? `${element.offsetWidth}px` : '0px',
      )
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--flow-inspector-height')
      root.style.removeProperty('--flow-inspector-width')
    }
  }, [drawer, height, side])
}

function shopStepOf(view: FlowView): HTMLElement | null {
  const events = view.next.exits
    .filter((exit) => exit.shown && exit.status === 'possible')
    .map((exit) => exit.event)
  for (const event of events) {
    const element = document.querySelector<HTMLElement>(
      `main [data-flow-event="${CSS.escape(event)}"]`,
    )
    if (element && element.getClientRects().length > 0) return element
  }
  return null
}

function useStepInSight(
  view: FlowView,
  drawer: RefObject<HTMLElement | null>,
  height: DrawerHeight,
) {
  const step = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const element = step.current
    step.current = null

    if (drawer.current?.dataset.placement === 'side') return
    const top = drawer.current?.getBoundingClientRect().top
    if (!element || top === undefined) return
    const covered = element.getBoundingClientRect().bottom - top
    if (covered <= -IN_SIGHT_MARGIN) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollBy({
      top: covered + IN_SIGHT_MARGIN,
      behavior: reduced ? 'instant' : 'smooth',
    })
  }, [drawer, height])

  return () => {
    const element = shopStepOf(view)
    const top = drawer.current?.getBoundingClientRect().top ?? innerHeight
    const box = element?.getBoundingClientRect()
    step.current = box && box.bottom > 0 && box.top < top ? element : null
  }
}

function useEscapeFromModel(
  height: DrawerHeight,
  drawer: RefObject<HTMLElement | null>,
  toStep: () => void,
) {
  const latest = useRef(toStep)
  useEffect(() => {
    latest.current = toStep
  })
  useEffect(() => {
    if (height !== 'model') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const { target } = event
      const forDrawer =
        target === document.body ||
        (target instanceof Node && drawer.current?.contains(target))
      if (forDrawer) latest.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [height, drawer])
}

function spokenWords(view: FlowView): string {
  const progress = `${progressWords(view.tested.length)}.`
  if (!view.pageId) return progress
  const moves = movesOf(view).map(moveWords).join(', ')
  return `${progress} Page: ${titleOf(view.pageId)}. Next: ${moves}.`
}

function Announcer({ text }: { text: string }) {
  const [spoken, setSpoken] = useState(text)
  const spokenAt = useRef(0)
  useEffect(() => {
    if (text === spoken) return
    const wait = Math.max(0, spokenAt.current + ANNOUNCE_GAP_MS - Date.now())
    const timer = setTimeout(() => {
      spokenAt.current = Date.now()
      setSpoken(text)
    }, wait)
    return () => clearTimeout(timer)
  }, [text, spoken])
  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {spoken}
    </p>
  )
}

function IconButton({
  icon,
  label,
  expanded,
  stretch = false,
  onClick,
  onIntent,
  ref,
}: {
  icon: IconName
  label: string
  expanded: boolean
  stretch?: boolean
  onClick: () => void

  onIntent?: () => void
  ref?: Ref<HTMLButtonElement>
}) {
  const [tipHidden, setTipHidden] = useState(false)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setTipHidden(true)
      }}
      onPointerLeave={() => setTipHidden(false)}
      onBlur={() => setTipHidden(false)}
      aria-label={label}
      aria-expanded={expanded}
      data-tip={tipHidden ? 'hidden' : undefined}
      className={cn(
        'insp-tip-anchor flex size-8 shrink-0 items-center justify-center rounded-insp text-insp-muted transition-colors ease-out-expo hover:bg-insp-raised hover:text-insp-text active:bg-insp-border',
        stretch
          ? 'after:absolute after:inset-0 pointer-coarse:w-11'
          : 'relative pointer-coarse:size-11',
      )}
    >
      <Icon name={icon} size={20} />
      <Tooltip className={cn(stretch && 'right-space-md sm:right-space-lg')}>
        {label}
      </Tooltip>
    </button>
  )
}

function FailureMessage({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-insp-failure">
      <Icon name="error" size={16} />
      {children}
    </p>
  )
}

export function FlowInspectorFailed() {
  const band = useRef<HTMLElement>(null)
  useReservedSpace(band, 'minimized')
  return createPortal(
    <aside
      ref={band}
      data-theme="inspector"
      aria-label="Flow inspector"
      className="fixed inset-x-0 bottom-0 z-50 flex min-h-10 items-center rounded-t-insp border-t border-insp-border px-space-md py-2 text-insp-sm sm:px-space-lg"
    >
      <FailureMessage>
        The flow inspector stopped. Reload the page to try again.
      </FailureMessage>
    </aside>,
    document.body,
  )
}

function DrawerBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-insp-border">
      <ErrorBoundary
        label="Flow inspector model failed"
        fallback={
          <div className="p-space-lg text-insp-md">
            <FailureMessage>
              The model could not load. Reload the page to try again.
            </FailureMessage>
          </div>
        }
      >
        <Suspense
          fallback={
            <p className="p-space-lg text-insp-md text-insp-muted">
              Loading the model…
            </p>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

function Overview({ view, side }: { view: FlowView; side: boolean }) {
  return (
    <>
      <div className={cn('px-space-md pb-3', side ? 'pt-3' : 'sm:px-space-lg')}>
        <PageRow view={view} side={side} />
      </div>
      <div
        className={cn(
          'border-t border-insp-border px-space-md pt-2.5 pb-3',
          !side && 'sm:px-space-lg',
        )}
      >
        <NextLine view={view} side={side} />
      </div>
    </>
  )
}

export function FlowInspector() {
  const [height, setHeight] = useDrawerHeight()
  const view = useFlowView()
  const open = height !== 'minimized'
  const model = height === 'model'

  const side = useWideScreen()
  const drawer = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  useReservedSpace(drawer, height, side)
  const noteStepInSight = useStepInSight(view, drawer, height)
  const grow = (next: DrawerHeight) => {
    noteStepInSight()
    setHeight(next)
  }
  useEscapeFromModel(height, drawer, () => {
    const focusInDrawer = drawer.current?.contains(document.activeElement)
    setHeight('step')
    if (focusInDrawer) toggle.current?.focus()
  })

  return createPortal(
    <aside
      ref={drawer}
      data-theme="inspector"

      data-pace={isFastPace(view.steps) ? 'fast' : undefined}
      aria-label="Flow inspector"
      data-placement={side ? 'side' : 'bottom'}

      className={cn(
        'fixed z-50 flex flex-col',
        side
          ? [
              'inset-y-0 right-0 border-l border-insp-border',
              !open ? 'w-11' : model ? 'min-w-76' : 'w-76 overflow-y-auto',
            ]
          : 'inset-x-0 bottom-0 overflow-x-clip rounded-t-insp border-t border-insp-border',
      )}
      style={model && !side ? { maxHeight: MODEL_HEIGHT } : undefined}
    >
      <h2 className="sr-only">Flow inspector</h2>

      <div
        className={cn(
          'relative flex shrink-0 gap-2',
          side && !open
            ? 'min-h-0 flex-1 flex-col-reverse items-center justify-end py-2'
            : side
              ? 'h-20 items-center border-b border-insp-border px-space-md'
              : 'h-10 items-center px-space-md sm:gap-3 sm:px-space-lg',

          !open && !side && 'pointer-coarse:h-11',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1',
            side && !open ? 'flex-col items-center pt-1' : 'items-center',
          )}
        >
          {open && (
            <span aria-hidden className={ROW_LABEL}>
              Explored
            </span>
          )}
          <ProgressBar
            visited={view.tested.length}
            vertical={side && !open}
            className={cn(
              side && !open
                ? 'min-h-12 w-1 flex-1'
                : ['min-w-12 flex-1', open ? 'h-1.5' : 'h-1 max-sm:h-1.5'],
            )}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {open && (
            <IconButton
              ref={toggle}
              icon={model ? 'close_fullscreen' : 'account_tree'}
              label={model ? 'Hide the model' : 'Show the model'}
              expanded={model}
              onClick={() => (model ? setHeight('step') : grow('model'))}
              onIntent={model ? undefined : preloadGraphView}
            />
          )}
          <IconButton
            icon={
              side
                ? open
                  ? 'keyboard_arrow_right'
                  : 'keyboard_arrow_left'
                : open
                  ? 'keyboard_arrow_down'
                  : 'keyboard_arrow_up'
            }
            label={open ? 'Minimize flow inspector' : 'Open flow inspector'}
            expanded={open}
            stretch={!open}
            onClick={() => (open ? setHeight('minimized') : grow('step'))}
          />
        </div>
      </div>
      {height === 'step' && (
        <Overview view={view} side={side} />
      )}
      {model && (
        <DrawerBody>
          <FlowGraphView reading={side ? 'down' : 'across'} />
        </DrawerBody>
      )}
      <Announcer text={spokenWords(view)} />
    </aside>,
    document.body,
  )
}
