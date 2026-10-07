import {
  facingSides,
  LABEL_HEIGHT,
  lanePorts,
  type NodeBox,
  type Side,
} from './edge-routes'

export const PORT_STEP = LABEL_HEIGHT + 4

const slotOf = (labelHeight: number) =>
  Math.max(PORT_STEP, labelHeight + PORT_STEP - LABEL_HEIGHT)

export const laneOf = (a: string, b: string) => [a, b].sort().join('>')

type SideLink = { source: string; target: string; labelHeight: number }

export function sideRoomOf(
  id: string,
  links: readonly SideLink[],
  columnOf: (id: string) => number,
): number {
  const laneSize = (link: SideLink) =>
    links.filter(
      (other) =>
        laneOf(other.source, other.target) === laneOf(link.source, link.target),
    ).length
  const otherEnd = (link: SideLink) =>
    link.source === id ? link.target : link.target === id ? link.source : null
  return Math.max(
    0,
    ...[-1, 1].map((way) => {
      const onSide = links.filter((link) => {
        const other = otherEnd(link)
        return (
          other !== null && Math.sign(columnOf(other) - columnOf(id)) === way
        )
      })
      const leaving = onSide.filter(
        (link) => laneSize(link) === 1 && link.source === id,
      )
      const slots = [
        ...onSide
          .filter((link) => !leaving.includes(link))
          .map((link) => slotOf(link.labelHeight)),
        ...(leaving.length > 0
          ? [Math.max(...leaving.map((link) => slotOf(link.labelHeight)))]
          : []),
      ]
      return slots.length > 1
        ? slots.reduce((sum, slot) => sum + slot, LABEL_HEIGHT)
        : 0
    }),
  )
}

export function dropCandidates<L extends SideLink & { id: string }>(
  links: readonly L[],
  columnOf: (id: string) => number,
  isLeaf: (id: string) => boolean,
  isLast: (id: string) => boolean,
): L[] {
  const meetsNearSide = (link: L, id: string) =>
    link.target === id
      ? columnOf(link.source) < columnOf(id)
      : link.source === id && columnOf(link.target) < columnOf(id)
  const fits = links.filter(
    (link) =>
      columnOf(link.target) === columnOf(link.source) + 1 &&
      isLeaf(link.source) &&
      isLeaf(link.target) &&
      isLast(link.source) &&
      links.every(
        (other) =>
          other === link ||
          (laneOf(other.source, other.target) !==
            laneOf(link.source, link.target) &&
            !meetsNearSide(other, link.target)),
      ),
  )
  return fits.filter((link) =>
    fits.every(
      (other) =>
        other === link ||
        (other.source !== link.source && other.target !== link.target),
    ),
  )
}

const DROP_LEG = 24
const DROP_CLEAR = 8

export function dropsClear(
  from: { y: number; height: number },
  to: { y: number; height: number },
  labelHeight: number,
): boolean {
  const bottom = from.y + from.height
  const run = to.y + to.height / 2
  return (
    to.y >= bottom &&
    run >= bottom + DROP_LEG &&
    run - labelHeight / 2 >= bottom + DROP_CLEAR
  )
}

type PortEnd = {
  on: string

  at: number
  fixed: boolean

  exit: boolean

  single: boolean

  toward: number

  within: readonly [number, number]

  slot: number
}

type Placed = { end: PortEnd; index: number; at: number }

const fans = (a: PortEnd, b: PortEnd) =>
  a.exit && a.single && b.exit && b.single

const spacing = (a: PortEnd, b: PortEnd) => (a.slot + b.slot) / 2

function portPast(
  end: PortEnd,
  taken: readonly Placed[],
  place = end.at,
  tries = 0,
): number {
  const way = Math.sign(end.toward - end.at) || 1
  const blocking = taken.filter((other) => {
    const gap = Math.abs(other.at - place)
    if (gap < 0.5 && fans(other.end, end)) return false
    const inTheWay =
      way * (other.at - place) > 0 && way * (end.toward - other.at) > 0
    return gap < spacing(end, other.end) - 0.5 || inTheWay
  })
  if (blocking.length === 0 || tries > taken.length) return place
  const past = blocking.map((other) => other.at + way * spacing(end, other.end))
  return portPast(
    end,
    taken,
    way > 0 ? Math.max(...past) : Math.min(...past),
    tries + 1,
  )
}

function placeSide(
  side: readonly { end: PortEnd; index: number }[],
): (Placed & { stagger: number })[] {
  const fixed = side
    .filter(({ end }) => end.fixed)
    .map(({ end, index }) => ({ end, index, at: end.at }))
  const free = side
    .filter(({ end }) => !end.fixed)
    .toSorted(
      (a, b) =>
        Math.abs(a.end.toward - a.end.at) - Math.abs(b.end.toward - b.end.at),
    )
  const placed = free.reduce<(Placed & { way: number; moved: boolean })[]>(
    (done, { end, index }) => {
      const place = portPast(end, [...fixed, ...done])
      const [least, most] = end.within
      return [
        ...done,
        {
          end,
          index,
          at: Math.min(Math.max(place, least), most),
          way: Math.sign(end.toward - end.at) || 1,
          moved: Math.abs(place - end.at) >= 0.5,
        },
      ]
    },
    [],
  )
  const staggerOf = (one: (typeof placed)[number]) => {
    const group = placed.filter((other) => other.moved && other.way === one.way)
    return one.moved ? (group.length - 1 - group.indexOf(one)) * 8 : 0
  }
  return [
    ...fixed.map((one) => ({ ...one, stagger: 0 })),
    ...placed.map((one) => ({ ...one, stagger: staggerOf(one) })),
  ]
}

function assignPorts(ends: readonly PortEnd[]): {
  at: number[]
  stagger: number[]
} {
  const sides = ends.reduce(
    (groups, end, index) =>
      new Map([
        ...groups,
        [end.on, [...(groups.get(end.on) ?? []), { end, index }]],
      ]),
    new Map<string, { end: PortEnd; index: number }[]>(),
  )
  const placed = new Map(
    [...sides.values()]
      .flatMap((side) => placeSide(side))
      .map((one) => [one.index, one] as const),
  )
  return {
    at: ends.map((end, index) => placed.get(index)?.at ?? end.at),
    stagger: ends.map((_, index) => placed.get(index)?.stagger ?? 0),
  }
}

type PortArrow = {
  id: string
  source: string
  target: string
  from: NodeBox
  to: NodeBox
  labelHeight: number
}

export type Placement = {
  sides: [Side, Side]
  ports: [number, number]

  stagger: number
}

const isAcross = (side: Side) => side === 'left' || side === 'right'

function portRoom(
  box: NodeBox,
  side: Side,
  labelHeight: number,
): readonly [number, number] {
  const [start, length] = isAcross(side)
    ? [box.y, box.height]
    : [box.x, box.width]
  const inset = Math.min(labelHeight / 2, length / 2)
  return [start + inset, start + length - inset]
}

function laneOffsets(lane: readonly PortArrow[]): Map<string, number> {
  const slots = lane.map((arrow) => slotOf(arrow.labelHeight))
  const centres = slots.reduce<number[]>(
    (all, slot, index) => [
      ...all,
      index === 0
        ? 0
        : (all[index - 1] ?? 0) + ((slots[index - 1] ?? 0) + slot) / 2,
    ],
    [],
  )
  const middle = ((centres[0] ?? 0) + (centres.at(-1) ?? 0)) / 2
  return new Map(
    lane.map((arrow, index) => [arrow.id, (centres[index] ?? 0) - middle]),
  )
}

export function placePorts<A extends PortArrow>(
  arrows: readonly A[],
): (A & Placement)[] {
  const lanes = arrows.reduce(
    (all, arrow) =>
      new Map([
        ...all,
        [
          laneOf(arrow.source, arrow.target),
          [...(all.get(laneOf(arrow.source, arrow.target)) ?? []), arrow],
        ],
      ]),
    new Map<string, A[]>(),
  )
  const offsets = new Map(
    [...lanes.values()].flatMap((lane) => [...laneOffsets(lane)]),
  )
  const planned = arrows.map((arrow) => {
    const lane = lanes.get(laneOf(arrow.source, arrow.target)) ?? []
    const index = lane.indexOf(arrow) - (lane.length - 1) / 2
    const sides = facingSides(arrow.from, arrow.to)
    const { ports, straight } = lanePorts(
      arrow.from,
      arrow.to,
      sides,
      offsets.get(arrow.id) ?? 0,
    )
    return { arrow, sides, index, ports, single: lane.length === 1, straight }
  })
  const ends: PortEnd[] = planned.flatMap(
    ({ arrow, sides, ports, single, straight }) => [
      {
        on: `${arrow.source}:${sides[0]}`,
        at: ports[0],
        fixed: straight || !single,
        exit: true,
        single,
        toward: ports[1],
        within: portRoom(arrow.from, sides[0], arrow.labelHeight),
        slot: slotOf(arrow.labelHeight),
      },
      {
        on: `${arrow.target}:${sides[1]}`,
        at: ports[1],
        fixed: straight || !single,
        exit: false,
        single,
        toward: ports[0],
        within: portRoom(arrow.to, sides[1], arrow.labelHeight),
        slot: slotOf(arrow.labelHeight),
      },
    ],
  )
  const placed = assignPorts(ends)
  return planned.map(({ arrow, sides, index, single, straight }, n) => {
    const ports: [number, number] = [
      placed.at[2 * n] ?? 0,
      placed.at[2 * n + 1] ?? 0,
    ]

    const lane =
      straight || single ? 0 : -Math.sign(ports[1] - ports[0]) * index * 8
    const moved =
      (placed.stagger[2 * n] ?? 0) - (placed.stagger[2 * n + 1] ?? 0)
    return { ...arrow, sides, ports, stagger: lane + moved }
  })
}
