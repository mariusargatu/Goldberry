// What Bombadil may do on its own, never through the model: click the
// header links, the bag's quantities and Remove, and the other links, and
// scroll. A loose action may change only what the page lets the model read
// back (the path, the history, the stored bag), so it never touches a door:
// adding to the bag, the View bag and Check out links, or the checkout's
// buttons and fields. In checkout it may only follow a link out; the model
// owns Back and Reload.
import type { Cell, JSON } from '@antithesishq/bombadil'
import {
  type ActionTemplate,
  actions,
  extract,
  getFingerprint,
  weighted,
} from '@antithesishq/bombadil/browser'
import {
  clickablePoint,
  inViewport,
  isVisible,
} from '@antithesishq/bombadil/browser/dom'
import { OFF_LIMITS } from '../../pages/doors.ts'

const NEVER = OFF_LIMITS.join(', ')
const CLICK_WEIGHT = 6
const SCROLL_WEIGHT = 1
const SCROLL_DISTANCE: [number, number] = [100, 800]

interface Point {
  readonly x: number
  readonly y: number
}

interface Target {
  readonly fingerprint: JSON
  readonly point: Point
}

/** An extractor's cell, read as the shape its extractor returns. */
const typed = <T>(cell: Cell<JSON>): Cell<T> => cell as unknown as Cell<T>

/**
 * What a loose click may press: the visible links and buttons in the header
 * and main, never a door or an off-limits element; in checkout, links only.
 */
function looseTargets(document: Document, window: Window): Target[] {
  const inCheckout = window.location.pathname === '/checkout'
  const clickable = inCheckout ? 'a[href]' : 'a[href], button:not(:disabled)'
  return [...document.querySelectorAll('header, main')]
    .flatMap((root) => [...root.querySelectorAll(clickable)])
    .filter(
      (element) =>
        element.closest(NEVER) === null && isVisible(window, element),
    )
    .flatMap((element) => {
      const point = clickablePoint(element)
      return point === null || !inViewport(window, point)
        ? []
        : [{ fingerprint: getFingerprint(element) as JSON, point }]
    })
}

const targets = typed<Target[]>(
  extract(
    (state): JSON =>
      looseTargets(state.document, state.window) as unknown as JSON,
  ),
)

const viewportCentre = typed<Point>(
  extract((state): JSON => ({
    x: Math.round(state.window.innerWidth / 2),
    y: Math.round(state.window.innerHeight / 2),
  })),
)

/** Whether Bombadil's last action was its own, not the model's or a wait. */
export const lastWasLoose = extract((state): JSON => {
  const last = state.lastAction
  return last !== null && typeof last === 'object' && !('Custom' in last)
})

const clicks = actions(() =>
  targets.current.map(
    ({ fingerprint, point }) =>
      ({ Click: { fingerprint, point } }) as unknown as ActionTemplate,
  ),
)

const scroll = actions((): ActionTemplate[] => {
  const origin = viewportCentre.current
  return [
    { ScrollDown: { origin, distance: SCROLL_DISTANCE } },
    { ScrollUp: { origin, distance: SCROLL_DISTANCE } },
  ]
})

/** Bombadil's own actions this run allows, or null when there are none. */
export const looseActions = () =>
  weighted(
    targets.current.length > 0
      ? [
          [CLICK_WEIGHT, clicks],
          [SCROLL_WEIGHT, scroll],
        ]
      : [[SCROLL_WEIGHT, scroll]],
  )
