export type Point = { x: number; y: number }

export type Size = { width: number; height: number }

export type NodeBox = Point & Size

export type EdgeRoute = {
  points: readonly Point[]
  label: Point

  back?: boolean
}

const TRUNK = 20

const MIN_OVERLAP = 16

export const BACK_DROP = 40

export const LABEL_HEIGHT = 22
export const LABEL_TALL = 42

export const LOOP_HEIGHT = 22
const LOOP_LEG = 0.15

export type Side = 'left' | 'right' | 'top' | 'bottom'

export function facingSides(from: NodeBox, to: NodeBox): [Side, Side] {
  const sameColumn =
    Math.min(from.x + from.width, to.x + to.width) > Math.max(from.x, to.x)
  if (!sameColumn) return to.x > from.x ? ['right', 'left'] : ['left', 'right']
  return to.y > from.y ? ['bottom', 'top'] : ['top', 'bottom']
}

function sideSpan(box: NodeBox, across: boolean): [number, number] {
  return across ? [box.y, box.height] : [box.x, box.width]
}

export function lanePorts(
  from: NodeBox,
  to: NodeBox,
  sides: [Side, Side] = facingSides(from, to),
  offset = 0,
): { ports: [number, number]; straight: boolean } {
  const across = sides[0] === 'left' || sides[0] === 'right'
  const [start, startSize] = sideSpan(from, across)
  const [endStart, endSize] = sideSpan(to, across)
  const low = Math.max(start, endStart)
  const high = Math.min(start + startSize, endStart + endSize)
  const straight = high - low >= MIN_OVERLAP + 2 * Math.abs(offset)
  return {
    ports: straight
      ? [(low + high) / 2 + offset, (low + high) / 2 + offset]
      : [start + startSize / 2 + offset, endStart + endSize / 2 + offset],
    straight,
  }
}

export function orthogonal(
  from: NodeBox,
  to: NodeBox,
  {
    sides = facingSides(from, to),
    offset = 0,
    ports = lanePorts(from, to, sides, offset).ports,
    hub = 0,
    stagger = 0,
  }: {
    sides?: [Side, Side]
    offset?: number
    ports?: readonly [number, number]
    hub?: number
    stagger?: number
  } = {},
): EdgeRoute {
  const [exit, entry] = sides
  const across = exit === 'left' || exit === 'right'

  const main = (point: Point) => (across ? point.x : point.y)
  const side = (point: Point) => (across ? point.y : point.x)
  const at = (along: number, sideways: number): Point =>
    across ? { x: along, y: sideways } : { x: sideways, y: along }
  const begin = at(edgeOf(from, exit), ports[0])
  const finish = at(edgeOf(to, entry), ports[1])
  if (Math.abs(side(begin) - side(finish)) < 1) {
    return {
      points: [begin, finish],
      label: at((main(begin) + main(finish)) / 2, side(begin)),
    }
  }
  const way = Math.sign(main(finish) - main(begin)) || 1
  const turn =
    (hub > 0
      ? main(begin) + way * TRUNK
      : hub < 0
        ? main(finish) - way * TRUNK
        : (main(begin) + main(finish)) / 2) +
    way * stagger
  const first = { along: (main(begin) + turn) / 2, at: side(begin) }
  const last = { along: (turn + main(finish)) / 2, at: side(finish) }
  const firstLonger =
    Math.abs(turn - main(begin)) > Math.abs(main(finish) - turn)
  const run = hub > 0 ? last : hub < 0 ? first : firstLonger ? first : last
  return {
    points: [begin, at(turn, side(begin)), at(turn, side(finish)), finish],
    label: at(run.along, run.at),
  }
}

function edgeOf(box: NodeBox, which: Side): number {
  return which === 'left'
    ? box.x
    : which === 'right'
      ? box.x + box.width
      : which === 'top'
        ? box.y
        : box.y + box.height
}

export function linkUnder(
  from: NodeBox,
  to: NodeBox,
  floor: number,
  spread = 0,
  drop = BACK_DROP,
): EdgeRoute {
  const way = Math.sign(to.x - from.x)
  const start = {
    x: from.x + from.width * (0.5 + way / 4) - way * spread,
    y: from.y + from.height,
  }
  const end = {
    x: to.x + to.width * (0.5 - way / 4) + way * spread,
    y: to.y + to.height,
  }
  const depth = floor + drop
  return {
    points: [start, { x: start.x, y: depth }, { x: end.x, y: depth }, end],
    label: { x: (start.x + end.x) / 2, y: depth },
    back: true,
  }
}

export function dropInto(from: NodeBox, to: NodeBox): EdgeRoute {
  const forward = to.x > from.x
  const x = from.x + from.width / 2
  const y = to.y + to.height / 2
  const into = forward ? to.x : to.x + to.width
  const past = forward ? from.x + from.width : from.x
  return {
    points: [
      { x, y: from.y + from.height },
      { x, y },
      { x: into, y },
    ],
    label: { x: (past + into) / 2, y },
  }
}

export function loopOn(box: NodeBox, height = LOOP_HEIGHT): EdgeRoute {
  const top = box.y - height
  const out = box.x + box.width * (1 - LOOP_LEG)
  const back = box.x + box.width * LOOP_LEG
  return {
    points: [
      { x: out, y: box.y },
      { x: out, y: top },
      { x: back, y: top },
      { x: back, y: box.y },
    ],
    label: { x: box.x + box.width / 2, y: top },
    back: true,
  }
}

export function loopAfter(box: NodeBox, reach = LOOP_HEIGHT): EdgeRoute {
  const edge = box.x + box.width
  const beyond = edge + reach
  const out = box.y + box.height * (1 - LOOP_LEG)
  const back = box.y + box.height * LOOP_LEG
  return {
    points: [
      { x: edge, y: out },
      { x: beyond, y: out },
      { x: beyond, y: back },
      { x: edge, y: back },
    ],
    label: { x: beyond, y: box.y + box.height / 2 },
    back: true,
  }
}

export const hubOf = (start: number, end: number) => Math.sign(start - end)

export function boundsOf(
  boxes: readonly NodeBox[],
  edges: ReadonlyMap<string, EdgeRoute>,
): NodeBox {
  const corners = [
    ...boxes.flatMap((box) => [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
    ]),
    ...[...edges.values()].flatMap(({ points, label }) => [
      ...points,
      { x: label.x, y: label.y - LABEL_HEIGHT / 2 },
      { x: label.x, y: label.y + LABEL_HEIGHT / 2 },
    ]),
  ]
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}
