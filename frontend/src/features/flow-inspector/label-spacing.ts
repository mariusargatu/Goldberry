import type { EdgeRoute, NodeBox, Point, Size } from './edge-routes'

const STEP = 4
const END_ROOM = 6

const GAP = 4

const overlaps = (one: NodeBox, other: NodeBox) =>
  one.x < other.x + other.width + GAP &&
  other.x < one.x + one.width + GAP &&
  one.y < other.y + other.height + GAP &&
  other.y < one.y + one.height + GAP

const boxAt = (point: Point, { width, height }: Size): NodeBox => ({
  x: point.x - width / 2,
  y: point.y - height / 2,
  width,
  height,
})

type Run = readonly [Point, Point]

const within = (value: number, a: number, b: number) =>
  value >= Math.min(a, b) - 0.5 && value <= Math.max(a, b) + 0.5

const lengthOf = ([start, end]: Run) =>
  Math.abs(start.x - end.x) + Math.abs(start.y - end.y)

function runsOf(route: EdgeRoute): Run[] {
  const { label, points } = route
  const runs = points.slice(1).flatMap((end, index): Run[] => {
    const start = points[index]
    return start ? [[start, end]] : []
  })
  const holds = ([start, end]: Run) =>
    within(label.x, start.x, end.x) && within(label.y, start.y, end.y)
  return [
    ...runs.filter(holds),
    ...runs
      .filter((run) => !holds(run))
      .sort((one, other) => lengthOf(other) - lengthOf(one)),
  ]
}

const BESIDE = 6

function placesOn(route: EdgeRoute, size: Size): Point[] {
  return [
    route.label,
    ...runsOf(route).flatMap((run, index) =>
      placesAlong(run, size, index === 0 ? route.label : midpointOf(run)),
    ),
  ]
}

const midpointOf = ([start, end]: Run): Point => ({
  x: (start.x + end.x) / 2,
  y: (start.y + end.y) / 2,
})

function placesAlong(run: Run, size: Size, from: Point): Point[] {
  const [start, end] = run
  const upright = Math.abs(start.x - end.x) < 0.5
  const half = (upright ? size.height : size.width) / 2 + END_ROOM
  const along = (point: Point) => (upright ? point.y : point.x)
  const low = Math.min(along(start), along(end)) + half
  const high = Math.max(along(start), along(end)) - half
  const here = along(from)
  const line = upright ? start.x : start.y
  const tries = Array.from({ length: 120 }, (_, index) => {
    const step = Math.ceil(index / 2) * STEP
    return index % 2 === 0 ? here + step : here - step
  }).filter((value) => value >= low && value <= high)
  const away = (upright ? size.width : size.height) / 2 + BESIDE
  const at = (value: number, aside: number): Point =>
    upright ? { x: line + aside, y: value } : { x: value, y: line + aside }
  return [0, away, -away].flatMap((aside) =>
    tries.map((value) => at(value, aside)),
  )
}

const linesOf = (route: EdgeRoute): NodeBox[] =>
  route.points.slice(1).flatMap((end, index) => {
    const start = route.points[index]
    if (!start) return []
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    return [
      {
        x: x - 1,
        y: y - 1,
        width: Math.abs(start.x - end.x) + 2,
        height: Math.abs(start.y - end.y) + 2,
      },
    ]
  })

export function spreadLabels(
  edges: ReadonlyMap<string, EdgeRoute>,
  sizeOf: (id: string) => Size | null,
  boxes: readonly NodeBox[],
): Map<string, EdgeRoute> {
  const options = new Map(
    [...edges].flatMap(([id, route]) => {
      const size = sizeOf(id)
      if (!size) return []
      const fixed = [
        ...boxes,
        ...[...edges].flatMap(([other, line]) =>
          other === id ? [] : linesOf(line),
        ),
      ]
      const all = placesOn(route, size)
      const clearOf = (obstacles: readonly NodeBox[]) => (point: Point) => {
        const box = boxAt(point, size)
        return obstacles.every((other) => !overlaps(box, other))
      }
      const strict = all.filter(clearOf(fixed))
      const places = strict.length > 0 ? strict : all.filter(clearOf(boxes))
      return [[id, { size, places, boxedIn: strict.length === 0 }] as const]
    }),
  )

  const freedom = (id: string) => {
    const option = options.get(id)
    if (!option) return Infinity
    return option.boxedIn ? 1e6 + option.places.length : option.places.length
  }
  const order = [...edges].sort(
    ([one], [other]) => freedom(one) - freedom(other),
  )
  const { routes } = order.reduce(
    (settled, [id, route]) => {
      const option = options.get(id)
      if (!option) {
        return { ...settled, routes: [...settled.routes, [id, route] as const] }
      }
      const { size, places } = option
      const free = (point: Point) => {
        const box = boxAt(point, size)
        return settled.taken.every((other) => !overlaps(box, other))
      }
      const label = places.find(free) ?? route.label
      return {
        taken: [...settled.taken, boxAt(label, size)],
        routes: [...settled.routes, [id, { ...route, label }] as const],
      }
    },
    {
      taken: [] as NodeBox[],
      routes: [] as (readonly [string, EdgeRoute])[],
    },
  )

  const settled = new Map(routes)
  return new Map(
    [...edges.keys()].flatMap((id) => {
      const route = settled.get(id)
      return route ? [[id, route] as const] : []
    }),
  )
}
