import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { EdgeRoute, Point } from './edge-routes'
import type { GraphLayout } from './layout'

export const MOVE_MS = 350

const CURVE = [0.37, 0, 0.63, 1] as const

export const MOVE_CURVE_CSS = `cubic-bezier(${CURVE.join(', ')})`

function bezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (time: number) => number {
  const along = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * (1 - t) * t ** 2 + t ** 3
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t ** 2
  return (time) => {
    if (time <= 0) return 0
    if (time >= 1) return 1

    const t = [0, 1, 2, 3, 4, 5].reduce((guess) => {
      const d = slope(x1, x2, guess)
      return Math.abs(d) < 1e-6
        ? guess
        : Math.min(1, Math.max(0, guess - (along(x1, x2, guess) - time) / d))
    }, time)
    return along(y1, y2, t)
  }
}

export const moveEase = bezier(...CURVE)

export const holdsStill = (fastPace: boolean): boolean =>
  fastPace || matchMedia('(prefers-reduced-motion: reduce)').matches

export type Morph = {
  moving: boolean

  entering: ReadonlySet<string>

  previous: GraphLayout | null
}

const NONE: ReadonlySet<string> = new Set()

export function useMorph(layout: GraphLayout, still: boolean): Morph {
  const [seen, setSeen] = useState<{
    layout: GraphLayout
    entering: ReadonlySet<string>
    previous: GraphLayout | null
  }>({ layout, entering: NONE, previous: null })
  const [moving, setMoving] = useState(false)
  if (seen.layout !== layout) {
    setSeen({
      layout,
      entering: new Set(
        [...layout.nodes.keys()].filter((id) => !seen.layout.nodes.has(id)),
      ),
      previous: seen.layout,
    })
    setMoving(!still)
  }
  useEffect(() => {
    if (!moving) return
    const timer = setTimeout(() => setMoving(false), MOVE_MS + 40)
    return () => clearTimeout(timer)
  }, [moving, seen])
  return still || !moving
    ? { moving, entering: still ? NONE : seen.entering, previous: null }
    : { moving, entering: seen.entering, previous: seen.previous }
}

export const HoldsStill = createContext(false)

const lerp = (from: Point, to: Point, share: number): Point => ({
  x: from.x + (to.x - from.x) * share,
  y: from.y + (to.y - from.y) * share,
})

function matched(
  from: readonly Point[],
  to: readonly Point[],
): [readonly Point[], readonly Point[]] {
  const pad = (points: readonly Point[], length: number) => {
    const [first] = points
    return first && points.length < length
      ? [...Array<Point>(length - points.length).fill(first), ...points]
      : points
  }
  const length = Math.max(from.length, to.length)
  return [pad(from, length), pad(to, length)]
}

export function useGlidingRoute(route: EdgeRoute): EdgeRoute {
  const still = useContext(HoldsStill)
  const [shown, setShown] = useState(route)

  const drawn = useRef(route)
  useEffect(() => {
    const from = drawn.current
    if (still || from === route) {
      drawn.current = route
      setShown(route)
      return
    }
    const [start, end] = matched(from.points, route.points)
    const began = performance.now()
    let frame = 0
    const step = (now: number) => {
      const time = Math.min(1, (now - began) / MOVE_MS)
      const share = moveEase(time)
      const current =
        time < 1
          ? {
              ...route,
              points: start.map((point, index) =>
                lerp(point, end[index] ?? point, share),
              ),
              label: lerp(from.label, route.label, share),
            }
          : route
      drawn.current = current
      setShown(current)
      if (time < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [route, still])
  return shown
}
