/** The header's bag link (AppLayout), where added pieces fly to. */
export const BAG_LINK_ID = 'site-bag'

/** How long a piece takes to reach the bag. */
const FLY_TO_BAG_MS = 540

/** Names the flight among the page's animations, so the bag can find it. */
const FLIGHT_ID = 'fly-to-bag'

/**
 * How far, at least, the arc swings sideways. On a phone the bag sits almost
 * straight above the button, and a curve through the midpoint would read as a
 * straight zip up the screen.
 */
const MIN_SWING = 120

type Point = { x: number; y: number }

/** Points along the arc; enough for a smooth curve at any screen size. */
const ARC_STEPS = 24

function centerOf(element: Element): Point {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** A point on the quadratic Bézier curve from `start` to `end` at `t` (0..1). */
function onCurve(start: Point, control: Point, end: Point, t: number): Point {
  const along = (a: number, b: number, c: number) =>
    (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
  return {
    x: along(start.x, control.x, end.x),
    y: along(start.y, control.y, end.y),
  }
}

/**
 * Flies a thumbnail of the piece from `from` (the Add button) to the header
 * bag along a short arc, shrinking into it. The thumbnail is a fixed-position
 * element of its own, animated with the Web Animations API, so the page never
 * reflows; it removes itself when done. Nothing flies for people who ask for
 * less motion: the button and the bag's count already confirm the add.
 */
export function flyToBag(from: Element, imageUrl: string): void {
  const bag = document.getElementById(BAG_LINK_ID)
  if (!bag || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  const start = centerOf(from)
  const end = centerOf(bag)
  // Above the bag and swung left, away from it (the bag is top right): a toss
  // that peaks just over the bag, then drops in.
  const swing = Math.max(0, MIN_SWING - Math.abs(end.x - start.x) / 2)
  const control = { x: (start.x + end.x) / 2 - swing, y: end.y - 60 }

  const thumb = document.createElement('img')
  thumb.src = imageUrl
  thumb.alt = ''
  // Centered on (0, 0), so the animated translate is the thumbnail's center.
  // Transparent at rest: only the animation shows it.
  thumb.className =
    'pointer-events-none fixed top-0 left-0 z-50 -mt-7 -ml-7 size-14 rounded-xl object-cover opacity-0 shadow-xl ring-2 ring-secondary-container'
  document.body.append(thumb)

  const path = Array.from({ length: ARC_STEPS + 1 }, (_, step) => {
    const { x, y } = onCurve(start, control, end, step / ARC_STEPS)
    return { translate: `${x}px ${y}px` }
  })
  // The path eases in and out; the size is a second animation, keyed to plain
  // time: grow in on lift-off, carry the piece, shrink into the bag.
  const size = [
    { scale: 0.4, opacity: 0 },
    { scale: 1, opacity: 1, offset: 0.15 },
    { scale: 0.7, opacity: 1, offset: 0.7 },
    { scale: 0.2, opacity: 0 },
  ]
  thumb.animate(path, {
    duration: FLY_TO_BAG_MS,
    easing: 'cubic-bezier(0.5, 0, 0.3, 1)',
  })
  const flight = thumb.animate(size, { duration: FLY_TO_BAG_MS, id: FLIGHT_ID })
  const remove = () => thumb.remove()
  flight.addEventListener('finish', remove)
  flight.addEventListener('cancel', remove)
}

/**
 * Settles when the piece now flying to the bag lands (or its flight is cut
 * short); undefined when nothing is flying, e.g. with reduced motion.
 */
export function landingInBag(): Promise<void> | undefined {
  const flight = document
    .getAnimations()
    .findLast((animation) => animation.id === FLIGHT_ID)
  const land = () => undefined
  return flight?.finished.then(land, land)
}
