import {
  ancestorsOf,
  type FlowEdge,
  type FlowNode,
} from '../../flows/analysis/graph'
import {
  BY_ID,
  containerOf,
  EDGE_BY_ID,
  GRAPH,
  PAGE_LINKS,
  START_ID,
  type PageLink,
} from './graph-model'
import {
  BACK_DROP,
  boundsOf,
  LOOP_HEIGHT,
  facingSides,
  hubOf,
  LABEL_HEIGHT,
  linkUnder,
  dropInto,
  loopAfter,
  loopOn,
  orthogonal,
  type EdgeRoute,
  type NodeBox,
  type Point,
  type Side,
  type Size,
} from './edge-routes'
import {
  childrenOf,
  frameHeadOf,
  frameWidthOf,
  headOf,
  isExpandable,
  labelSizeOf,
  labelSizeOfLines,
  linesOf,
  moveOf,
  pageBoxSize,
  PAGES,
  tileSize,
} from './model-boxes'
import { spreadLabels } from './label-spacing'
import {
  flipAll,
  flipBox,
  flipPoint,
  flipRoute,
  turned,
  type Flow,
} from './layout-flow'
import {
  ROW_GAP,
  stackOf,
  type Frame,
  type GapAbove,
  type Laid,
} from './frame-stack'
import {
  dropCandidates,
  dropsClear,
  laneOf,
  placePorts,
  sideRoomOf,
} from './ports'

export type GraphLayout = {
  nodes: ReadonlyMap<string, NodeBox>

  absolute: ReadonlyMap<string, NodeBox>

  edges: ReadonlyMap<string, EdgeRoute>

  shared: ReadonlyMap<string, readonly string[]>

  initials: ReadonlyMap<string, Point>

  labels: ReadonlyMap<string, NodeBox>

  pageLinks: readonly (readonly [string, string])[]

  bounds: NodeBox
}

export const linkIdOf = (link: PageLink): string => `${link.from}>${link.to}`

const DRAWN = GRAPH.edges.filter(
  (edge): edge is FlowEdge & { target: string } =>
    edge.target !== null && !edge.fromRoot,
)

export const isLoop = (edge: FlowEdge): boolean => edge.event === 'RETRY'

const chainOf = (id: string): string[] =>
  ancestorsOf(id, BY_ID)
    .filter((node) => node.kind !== 'root')
    .map((node) => node.id)

const FRAME_PADDING = 20

export const INITIAL_ARM = 20

const INITIAL_ROOM = 16

const LOOP_ROOM = 20

const LABEL_MARGIN = 20

const LABEL_MARGIN_DOWN = 32

const RANK_GAP = 96

const START_GAP = 48

const START_SIZE = 8

const COLUMN_GAP = 72

const ARC_STEP = 30

const LEG_STEP = 14

const LOOPED_GAP = 68

const STACKED_LABEL_MARGIN = 8

const labelOfIds = (ids: readonly string[]): Size =>
  labelSizeOfLines(linesOf(ids.flatMap((id) => EDGE_BY_ID.get(id) ?? [])))

const LOOPED = new Set(DRAWN.filter(isLoop).map((edge) => edge.source))

function loopLabelOf(stateId: string, down: boolean): Size {
  const retry = DRAWN.find((edge) => isLoop(edge) && edge.source === stateId)
  return retry ? turned(labelSizeOf(retry), down) : { width: 0, height: 0 }
}

const loopHeightOf = (label: Size) =>
  Math.max(LOOP_HEIGHT, label.height / 2 + 6)

const loopReachOf = (label: Size) => loopHeightOf(label) + label.height / 2 + 4

const backDropOf = (labelHeight: number) =>
  Math.max(BACK_DROP, labelHeight / 2 + 12)

type SiblingEdge = {
  id: string
  source: string
  target: string
  words: string
  label: Size
}

function commonFrameOf(edge: FlowEdge & { target: string }) {
  const from = chainOf(edge.source)
  const to = chainOf(edge.target)
  let depth = 0
  while (from[depth] !== undefined && from[depth] === to[depth]) depth += 1
  return { container: from[depth - 1], source: from[depth], target: to[depth] }
}

function siblingEdges(down: boolean): {
  links: Map<string, SiblingEdge[]>
  shared: Map<string, string[]>
} {
  const links = new Map<string, SiblingEdge[]>()
  const shared = new Map<string, string[]>()
  for (const edge of DRAWN) {
    if (isLoop(edge)) continue
    const { container, source, target } = commonFrameOf(edge)
    if (!container || !source || !target) continue
    const siblings = links.get(container) ?? []
    const words = moveOf(edge)
    const twin = siblings.find(
      (link) =>
        link.source === source &&
        link.target === target &&
        (down || link.words === words),
    )
    if (twin) {
      const ids = [...(shared.get(twin.id) ?? [twin.id]), edge.id]
      shared.set(twin.id, ids)
      links.set(
        container,
        siblings.map((link) =>
          link === twin
            ? { ...link, label: turned(labelOfIds(ids), down) }
            : link,
        ),
      )
      continue
    }
    links.set(container, [
      ...siblings,
      {
        id: edge.id,
        source,
        target,
        words,
        label: turned(labelSizeOf(edge), down),
      },
    ])
  }
  return { links, shared }
}

function columnsOf(
  children: readonly FlowNode[],
  links: readonly SiblingEdge[],
): Map<string, number> {
  const order = new Map(children.map((child, index) => [child.id, index]))
  const isForward = (link: SiblingEdge) =>
    (order.get(link.source) ?? Infinity) < (order.get(link.target) ?? -1)
  return children.reduce((columns, child) => {
    const column = Math.max(
      0,
      ...links
        .filter((link) => link.target === child.id && isForward(link))
        .map((link) => (columns.get(link.source) ?? 0) + 1),
    )
    return new Map([...columns, [child.id, column]])
  }, new Map<string, number>())
}

function settleDrops(
  candidates: readonly {
    id: string
    source: string
    target: string
    labelHeight: number
  }[],
  laidWith: (drops: ReadonlySet<string>) => Laid[],
  gapAbove: GapAbove,
): { drops: Set<string>; laid: Laid[] } {
  const tried = laidWith(new Set(candidates.map((link) => link.id)))
  const { at } = stackOf(tried, gapAbove)
  const placed = (id: string) => ({
    y: at.get(id) ?? 0,
    height: tried.find((child) => child.id === id)?.height ?? 0,
  })
  const drops = new Set(
    candidates.flatMap((link) =>
      dropsClear(placed(link.source), placed(link.target), link.labelHeight)
        ? [link.id]
        : [],
    ),
  )
  return {
    drops,
    laid: drops.size === candidates.length ? tried : laidWith(drops),
  }
}

type FrameNotes = {
  down: boolean
  arcs: Map<string, { level: number; drop: number; reach: number }>
  initials: Map<string, Point>

  drops: Set<string>
}

function layoutFrame(
  node: FlowNode,
  links: ReadonlyMap<string, SiblingEdge[]>,
  notes: FrameNotes,
): Frame {
  const children = childrenOf(node.id)
  const { down } = notes

  const tile = (child: FlowNode, room: number): Size => {
    if (!down) return tileSize(child, room)
    const own = turned(tileSize(child, 0), true)
    return { width: own.width, height: Math.max(own.height, room) }
  }
  if (children.length === 0) {
    return { ...tile(node, 0), nodes: new Map(), row: 0 }
  }
  const inside = links.get(node.id) ?? []
  const columnOf = columnsOf(children, inside)
  const columnIn = (id: string) => columnOf.get(id) ?? 0
  const isUnder = (link: SiblingEdge) =>
    columnIn(link.source) > columnIn(link.target) &&
    (columnIn(link.source) - columnIn(link.target) > 1 ||
      childrenOf(link.source).length > 0 ||
      childrenOf(link.target).length > 0)
  const under = inside.filter(isUnder)

  const underTallest = Math.max(
    LABEL_HEIGHT,
    ...under.map((link) => link.label.height),
  )
  const arcStep = Math.max(ARC_STEP, underTallest + 8)
  const reach = backDropOf(underTallest)
  under.forEach((link, level) =>
    notes.arcs.set(link.id, { level, drop: level * arcStep, reach }),
  )

  const beside = inside
    .filter((link) => !isUnder(link))
    .map((link) => ({
      ...link,
      labelHeight: down ? LABEL_HEIGHT : link.label.height,
    }))
  const groups = new Map(
    children.flatMap((child) =>
      childrenOf(child.id).length > 0
        ? [[child.id, layoutFrame(child, links, notes)] as const]
        : [],
    ),
  )

  const laidWith = (drops: ReadonlySet<string>) => {
    const sideLinks = beside.filter((link) => !drops.has(link.id))
    return children.map((child) => ({
      id: child.id,
      column: columnIn(child.id),
      ...(groups.get(child.id) ?? {
        ...tile(child, sideRoomOf(child.id, sideLinks, columnIn)),
        nodes: new Map(),
        row: 0,
      }),
    }))
  }

  const candidates = down
    ? []
    : dropCandidates(
        beside,
        columnIn,
        (id) => !groups.has(id),
        (id) =>
          children.findLast((child) => columnIn(child.id) === columnIn(id))
            ?.id === id,
      )

  const gapAbove: GapAbove = (below, above) =>
    Math.max(
      ROW_GAP,

      LOOPED.has(below.id) && !down
        ? Math.max(LOOPED_GAP, loopReachOf(loopLabelOf(below.id, down)) + 8)
        : 0,
      ...beside
        .filter(
          (link) =>
            laneOf(link.source, link.target) === laneOf(above.id, below.id),
        )
        .map((link) => link.label.height + 2 * STACKED_LABEL_MARGIN),
    )
  const { drops, laid } = settleDrops(candidates, laidWith, gapAbove)
  drops.forEach((id) => notes.drops.add(id))
  const { columns, at, heightOf } = stackOf(laid, gapAbove)

  const gapBefore = (index: number) => {
    const crossing = beside.filter(
      (link) =>
        Math.min(columnIn(link.source), columnIn(link.target)) === index - 1 &&
        Math.max(columnIn(link.source), columnIn(link.target)) === index,
    )
    const stacked = crossing.reduce(
      (sum, link) => sum + link.label.width + STACKED_LABEL_MARGIN,
      2 * LABEL_MARGIN,
    )
    return Math.max(
      RANK_GAP,
      ...crossing.map(
        (link) =>
          link.label.width + 2 * (down ? LABEL_MARGIN_DOWN : LABEL_MARGIN),
      ),
      down && crossing.length > 1 ? stacked : 0,
    )
  }
  const contentHeight = Math.max(...columns.map(heightOf))
  const looped = children.filter((child) => LOOPED.has(child.id))
  const loopRoom =
    looped.length > 0 && !down
      ? Math.max(
          LOOP_ROOM,
          ...looped.map(
            (child) => loopReachOf(loopLabelOf(child.id, down)) - FRAME_PADDING,
          ),
        )
      : 0

  const head = frameHeadOf(node)
  const top = (down ? 0 : head) + FRAME_PADDING + loopRoom

  const underRoom =
    under.length > 0
      ? reach + (under.length - 1) * arcStep + underTallest / 2 + 8
      : 0
  const end = Math.max(FRAME_PADDING, underRoom)

  const span = down
    ? Math.max(contentHeight, frameWidthOf(node) - top - end)
    : contentHeight
  const shiftOf = (column: readonly Laid[], index: number) =>
    down ? (span - heightOf(column, index)) / 2 : 0

  const nodes = new Map<string, NodeBox>()
  let x = (down ? head : 0) + FRAME_PADDING + INITIAL_ROOM
  columns.forEach((column, index) => {
    if (index > 0) x += gapBefore(index)
    const shift = shiftOf(column, index)
    for (const child of column) {
      const y = top + shift + (at.get(child.id) ?? 0)
      nodes.set(child.id, { x, y, width: child.width, height: child.height })
      child.nodes.forEach((box, id) => nodes.set(id, box))
    }
    x += Math.max(...column.map((child) => child.width))
  })

  const lastRow = columns.at(-1) ?? []
  const loopUnder = down
    ? Math.max(
        0,
        ...lastRow
          .filter((child) => LOOPED.has(child.id))
          .map(
            (child) =>
              LOOP_HEIGHT +
              loopLabelOf(child.id, down).width / 2 +
              4 -
              FRAME_PADDING,
          ),
      )
    : 0
  x += loopUnder

  const { initialId } = node
  const initial = initialId ? nodes.get(initialId) : undefined
  if (initialId && initial) {
    notes.initials.set(node.id, {
      x: initial.x - INITIAL_ARM,

      y: initial.y + (down ? initial.height / 2 : 1 + headOf(initialId) / 2),
    })
  }

  const bottom = top + span + end
  return {
    width: down
      ? x + FRAME_PADDING
      : Math.max(x + FRAME_PADDING, frameWidthOf(node)),
    height: down ? Math.max(bottom, frameWidthOf(node)) : bottom,
    nodes,
    row: top,
  }
}

type PageEdge = {
  id: string
  from: string
  to: string
  label: Size | null
}

function pageEdges(down: boolean): PageEdge[] {
  return [
    ...PAGE_LINKS.map((link) => ({
      id: linkIdOf(link),
      from: link.from,
      to: link.to,
      label:
        link.from === START_ID ? null : turned(labelSizeOf(link.edge), down),
    })),
    ...DRAWN.flatMap((edge) => {
      const [from] = chainOf(edge.source)
      const [to] = chainOf(edge.target)
      return from && to && from !== to
        ? [{ id: edge.id, from, to, label: turned(labelSizeOf(edge), down) }]
        : []
    }),
  ]
}

function layersOf(
  edges: readonly PageEdge[],
  down: boolean,
): Map<string, number> {
  const shortest = shortestLayers(edges)
  return down ? longestLayers(edges, shortest) : shortest
}

function longestLayers(
  edges: readonly PageEdge[],
  shortest: ReadonlyMap<string, number>,
): Map<string, number> {
  const forward = edges.filter(
    (edge) =>
      edge.from !== edge.to &&
      (shortest.get(edge.to) ?? 0) >= (shortest.get(edge.from) ?? 0),
  )
  const reached = PAGES.reduce<Map<string, number>>(
    (layers) =>
      forward.reduce((next, edge) => {
        const from = next.get(edge.from)
        if (from === undefined) return next
        return from + 1 > (next.get(edge.to) ?? -1)
          ? new Map([...next, [edge.to, from + 1]])
          : next
      }, layers),
    new Map([[START_ID, 0]]),
  )
  const last = Math.max(...reached.values())
  return new Map([
    ...reached,
    ...PAGES.flatMap((page) =>
      reached.has(page.id) ? [] : [[page.id, last] as const],
    ),
  ])
}

function shortestLayers(edges: readonly PageEdge[]): Map<string, number> {
  const layers = new Map([[START_ID, 0]])
  let frontier = [START_ID]
  while (frontier.length > 0) {
    const reached = edges
      .filter((edge) => frontier.includes(edge.from) && !layers.has(edge.to))
      .map((edge) => edge.to)
    const depth = (layers.get(frontier[0] ?? START_ID) ?? 0) + 1
    for (const id of reached) layers.set(id, depth)
    frontier = [...new Set(reached)]
  }
  const last = Math.max(...layers.values())
  for (const page of PAGES) if (!layers.has(page.id)) layers.set(page.id, last)
  return layers
}

function placePages(
  sizes: ReadonlyMap<string, Size>,
  edges: readonly PageEdge[],
  layers: ReadonlyMap<string, number>,
): Map<string, Point> {
  const ids = [START_ID, ...PAGES.map((page) => page.id)]
  const columns = Array.from(
    { length: Math.max(...layers.values()) + 1 },
    (_, index) => ids.filter((id) => layers.get(id) === index),
  )
  const reached = new Set(edges.map((edge) => edge.to))
  const sizeOf = (id: string) => sizes.get(id) ?? { width: 0, height: 0 }
  const gapBefore = (index: number) =>
    Math.max(
      index === 1 ? START_GAP : RANK_GAP,
      ...edges
        .filter(
          (edge) =>
            layers.get(edge.from) === index - 1 &&
            layers.get(edge.to) === index,
        )
        .map((edge) =>
          edge.label === null ? 0 : edge.label.width + 2 * LABEL_MARGIN,
        ),
    )

  const positions = new Map<string, Point>()
  let x = 0
  columns.forEach((column, index) => {
    if (index > 0) x += gapBefore(index)
    const width = Math.max(...column.map((id) => sizeOf(id).width))
    const main =
      column.find((id) =>
        edges.some(
          (edge) => edge.from === id && layers.get(edge.to) === index + 1,
        ),
      ) ??
      column.find((id) => id === START_ID || reached.has(id)) ??
      column[0]
    const above = column.filter((id) => id !== main && reached.has(id))
    const below = column.filter((id) => id !== main && !reached.has(id))
    const place = (id: string, y: number) => positions.set(id, { x, y })

    const gapBetween = (one: string | undefined, other: string) =>
      Math.max(
        COLUMN_GAP,
        ...edges
          .filter(
            (edge) =>
              (edge.from === one && edge.to === other) ||
              (edge.from === other && edge.to === one),
          )
          .map((edge) =>
            edge.label === null ? 0 : edge.label.height + 2 * LABEL_MARGIN,
          ),
      )
    if (main) place(main, -sizeOf(main).height / 2)
    let top = main ? -sizeOf(main).height / 2 : 0
    let nearer = main
    for (const id of above.toReversed()) {
      top -= gapBetween(nearer, id) + sizeOf(id).height
      place(id, top)
      nearer = id
    }
    let bottom = main ? sizeOf(main).height / 2 : 0
    nearer = main
    for (const id of below) {
      const gap = gapBetween(nearer, id)
      place(id, bottom + gap)
      bottom += gap + sizeOf(id).height
      nearer = id
    }
    x += width
  })
  return positions
}

function routePageEdges(
  boxes: ReadonlyMap<string, NodeBox>,
  edges: readonly PageEdge[],
  layers: ReadonlyMap<string, number>,
): Map<string, EdgeRoute> {
  const onSide = (id: string, which: Side) =>
    edges.filter((edge) => {
      const from = boxes.get(edge.from)
      const to = boxes.get(edge.to)
      if (!from || !to) return false
      const [exit, entry] = facingSides(from, to)
      return (
        (edge.from === id && exit === which) ||
        (edge.to === id && entry === which)
      )
    }).length
  return new Map(
    edges.flatMap((edge) => {
      const from = boxes.get(edge.from)
      const to = boxes.get(edge.to)
      if (!from || !to) return []
      const span = (layers.get(edge.to) ?? 0) - (layers.get(edge.from) ?? 0)

      if (span < 0 || span > 1) {
        const left = Math.min(from.x, to.x)
        const right = Math.max(from.x + from.width, to.x + to.width)
        const floor = Math.max(
          ...[...boxes.values()]
            .filter((box) => box.x < right && box.x + box.width > left)
            .map((box) => box.y + box.height),
        )
        const drop = backDropOf(edge.label?.height ?? 0)
        const route = linkUnder(from, to, floor, 0, drop)

        return [[edge.id, { ...route, back: span < 0 }] as const]
      }
      const sides = facingSides(from, to)
      const hub = hubOf(onSide(edge.from, sides[0]), onSide(edge.to, sides[1]))
      return [[edge.id, orthogonal(from, to, { sides, hub })] as const]
    }),
  )
}

export function layoutGraph(
  open: ReadonlySet<string>,
  flow: Flow = 'across',
): GraphLayout {
  const down = flow === 'down'
  const { links, shared } = siblingEdges(down)
  const notes: FrameNotes = {
    down,
    arcs: new Map(),
    initials: new Map(),
    drops: new Set(),
  }
  const frames = new Map<string, Frame>(
    PAGES.map((page) => {
      const opened = open.has(page.id) && isExpandable(page.id)
      return [
        page.id,
        opened && childrenOf(page.id).length > 0
          ? layoutFrame(page, links, notes)
          : {
              ...turned(pageBoxSize(page, opened), down),
              nodes: new Map(),
              row: 0,
            },
      ]
    }),
  )
  const sizes = new Map<string, Size>([
    [START_ID, { width: START_SIZE, height: START_SIZE }],
    ...frames,
  ])
  const pageLinks = pageEdges(down)
  const layers = layersOf(pageLinks, down)
  const positions = placePages(sizes, pageLinks, layers)

  const nodes = new Map<string, NodeBox>()
  for (const [id, size] of sizes) {
    const origin = positions.get(id) ?? { x: 0, y: 0 }
    nodes.set(id, { ...origin, width: size.width, height: size.height })
    frames.get(id)?.nodes.forEach((box, child) => nodes.set(child, box))
  }
  const absoluteOf = (id: string): NodeBox | undefined => {
    const box = nodes.get(id)
    const node = BY_ID.get(id)
    if (!box || !node) return undefined
    const container = containerOf(node)
    const parent = container ? absoluteOf(container) : undefined
    return parent ? { ...box, x: box.x + parent.x, y: box.y + parent.y } : box
  }
  const absolute = new Map(
    [...nodes.keys()].flatMap((id) => {
      const box = absoluteOf(id)
      return box ? [[id, box] as const] : []
    }),
  )

  const drawnBy = new Set([...shared.values()].flatMap((ids) => ids.slice(1)))
  const laidEdges = routeInside(
    absolute,
    notes,
    routePageEdges(absolute, pageLinks, layers),
    drawnBy,
    shared,
  )

  const sizeOf = labelSizesOf(shared)
  const placed = down
    ? readDown(nodes, absolute, laidEdges, notes, sizeOf)
    : {
        nodes,
        absolute,
        edges: laidEdges,
        initials: notes.initials,
      }

  const labels = labelBoxesOf(placed.edges, sizeOf)
  return {
    ...placed,
    shared,
    labels,
    pageLinks: pageLinks.map(({ from, to }) => [from, to] as const),
    bounds: boundsOf(
      [...placed.absolute.values(), ...labels.values()],
      placed.edges,
    ),
  }
}

function labelBoxesOf(
  edges: ReadonlyMap<string, EdgeRoute>,
  sizeOf: (id: string) => Size | null,
): Map<string, NodeBox> {
  return new Map(
    [...edges].flatMap(([id, route]) => {
      const size = sizeOf(id)
      if (!size) return []
      const { width, height } = size
      const box = {
        x: route.label.x - width / 2,
        y: route.label.y - height / 2,
        width,
        height,
      }
      return [[id, box] as const]
    }),
  )
}

const labelSizesOf =
  (shared: ReadonlyMap<string, readonly string[]>) =>
  (id: string): Size | null => {
    const link = PAGE_LINKS.find((candidate) => linkIdOf(candidate) === id)
    if (link) return link.from === START_ID ? null : labelSizeOf(link.edge)
    return EDGE_BY_ID.has(id) ? labelOfIds(shared.get(id) ?? [id]) : null
  }

function readDown(
  nodes: ReadonlyMap<string, NodeBox>,
  absolute: ReadonlyMap<string, NodeBox>,
  edges: ReadonlyMap<string, EdgeRoute>,
  notes: FrameNotes,
  sizeOf: (id: string) => Size | null,
) {
  const placed = flipAll(absolute, flipBox)

  const frames = new Set(
    [...placed.keys()].flatMap((id) => {
      const node = BY_ID.get(id)
      const frame = node ? containerOf(node) : null
      return frame ? [frame] : []
    }),
  )
  const boxes = [...placed].flatMap(([id, box]) =>
    frames.has(id) ? [] : [box],
  )
  return {
    nodes: flipAll(nodes, flipBox),
    absolute: placed,
    edges: spreadLabels(flipAll(edges, flipRoute), sizeOf, boxes),
    initials: flipAll(notes.initials, flipPoint),
  }
}

function routeInside(
  absolute: ReadonlyMap<string, NodeBox>,
  { arcs, drops, down }: FrameNotes,
  pageRoutes: ReadonlyMap<string, EdgeRoute>,
  drawnBy: ReadonlySet<string>,
  shared: ReadonlyMap<string, readonly string[]>,
): Map<string, EdgeRoute> {
  const inside = DRAWN.flatMap((edge) => {
    if (drawnBy.has(edge.id)) return []
    const { container, source, target } = commonFrameOf(edge)
    const from = source && absolute.get(source)
    const to = target && absolute.get(target)
    if (!container || !source || !target || !from || !to) return []
    return [{ edge, container, source, target, from, to }]
  })
  const beside = placePorts(
    inside.flatMap((arrow) =>
      isLoop(arrow.edge) || arcs.has(arrow.edge.id) || drops.has(arrow.edge.id)
        ? []
        : [
            {
              ...arrow,
              id: arrow.edge.id,
              labelHeight: down
                ? LABEL_HEIGHT
                : labelOfIds(shared.get(arrow.edge.id) ?? [arrow.edge.id])
                    .height,
            },
          ],
    ),
  )

  const sideCounts = beside.reduce(
    (counts, { source, target, sides: [exit, entry] }) =>
      [`${source}:${exit}`, `${target}:${entry}`].reduce(
        (all, key) => new Map([...all, [key, (all.get(key) ?? 0) + 1]]),
        counts,
      ),
    new Map<string, number>(),
  )
  const busy = (id: string, which: Side) =>
    sideCounts.get(`${id}:${which}`) ?? 0
  const floorUnder = (container: string, from: NodeBox, to: NodeBox) => {
    const left = Math.min(from.x, to.x)
    const right = Math.max(from.x + from.width, to.x + to.width)
    return Math.max(
      ...[...absolute].flatMap(([id, box]) =>
        id !== container &&
        chainOf(id).includes(container) &&
        box.x < right &&
        box.x + box.width > left
          ? [box.y + box.height]
          : [],
      ),
    )
  }
  const under = inside.flatMap(({ edge, container, from, to }) => {
    if (isLoop(edge)) {
      if (down) return [[edge.id, loopAfter(from)] as const]
      const height = loopHeightOf(loopLabelOf(edge.source, down))
      return [[edge.id, loopOn(from, height)] as const]
    }
    if (drops.has(edge.id)) return [[edge.id, dropInto(from, to)] as const]
    const arc = arcs.get(edge.id)
    if (arc === undefined) return []
    const { level, drop, reach } = arc
    const floor = floorUnder(container, from, to) + drop

    const spread = Math.min(level * LEG_STEP, from.width / 4, to.width / 4)
    return [[edge.id, linkUnder(from, to, floor, spread, reach)] as const]
  })
  const routes = new Map<string, EdgeRoute>([
    ...under,
    ...beside.map(
      ({ edge, source, target, from, to, sides, ports, stagger }) =>
        [
          edge.id,
          orthogonal(from, to, {
            sides,
            ports,
            hub: hubOf(busy(source, sides[0]), busy(target, sides[1])),
            stagger,
          }),
        ] as const,
    ),
  ])

  return new Map([
    ...pageRoutes,
    ...inside.flatMap(({ edge }) => {
      const route = routes.get(edge.id)
      return route ? [[edge.id, route] as const] : []
    }),
  ])
}
