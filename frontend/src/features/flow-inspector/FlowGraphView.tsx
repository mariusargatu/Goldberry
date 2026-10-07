import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  Position,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { cn, Icon, type IconName } from '../../design-system'
import type { FlowStatus } from '../../flows/analysis/classify'
import { ancestorsOf } from '../../flows/analysis/graph'
import type { NodeBox } from './edge-routes'
import { FlowEdgeView, type FlowEdgeType } from './FlowEdgeView'
import {
  GroupNodeView,
  PageNodeView,
  StartNodeView,
  StateNodeView,
  type GroupNodeType,
  type PageNodeType,
  type StartNodeType,
  type StateNodeType,
  ReadsDown,
} from './FlowNodes'
import type { FlowView } from './flow-probe'
import { followOf, overviewOf } from './camera'
import {
  BY_ID,
  containerOf,
  EDGE_BY_ID,
  GRAPH,
  PAGE_LINKS,
  START_ID,
  type PageLink,
} from './graph-model'
import { layoutGraph, linkIdOf, type GraphLayout } from './layout'
import { isExpandable, linesOf, moveOf, ownMovesOf, PAGES } from './model-boxes'
import { canvasHeights, sidebarWidth } from './model-size'
import type { Flow } from './layout-flow'
import {
  holdsStill,
  HoldsStill,
  MOVE_CURVE_CSS,
  MOVE_MS,
  moveEase,
  useMorph,
} from './model-motion'
import { isFastPace, landingOf, pageOf, pageProgressOf } from './step-model'
import { Tooltip } from './Tooltip'
import { useFlowView } from './useFlowView'

const NODE_TYPES = {
  start: StartNodeView,
  page: PageNodeView,
  group: GroupNodeView,
  state: StateNodeView,
}
const EDGE_TYPES = { flow: FlowEdgeView }

const ARIA_LABELS = {
  'node.a11yDescription.default': '',
  'edge.a11yDescription.default': '',
  'controls.ariaLabel': 'Zoom controls',
}

const GRID = { gap: 24, size: 1.5, wide: 0.6 }

function Grid() {
  const step = useStore((state) => {
    const zoom = state.transform[2]
    return zoom >= GRID.wide
      ? 1
      : 2 ** Math.ceil(Math.log2(GRID.wide / Math.max(zoom, 0.01)))
  })
  return (
    <Background
      variant={BackgroundVariant.Dots}
      gap={GRID.gap * step}
      size={GRID.size}
      color="var(--color-insp-grid)"
    />
  )
}

const glide = (still = holdsStill(false)) => ({
  duration: still ? 0 : MOVE_MS,
  ease: moveEase,
  interpolate: 'linear' as const,
})

const HOLD_MS = 150

type Statuses = {
  node: (id: string) => FlowStatus
  edge: (id: string) => FlowStatus
}

function statusesOf(view: FlowView): Statuses {
  const visited = new Set(view.tested)
  const reached = new Set(
    view.tested.flatMap((id) => {
      const edge = EDGE_BY_ID.get(id)
      if (!edge) return []
      const ends = [
        edge.source,
        ...(edge.target ? [landingOf(edge.target)] : []),
      ]
      return ends.flatMap((end) =>
        ancestorsOf(end, BY_ID).map((node) => node.id),
      )
    }),
  )
  const merge = (raw: FlowStatus | undefined, done: boolean): FlowStatus =>
    raw === 'active' ? raw : done ? 'executed' : (raw ?? 'unvisited')
  return {
    node: (id) => merge(view.classification?.nodes.get(id), reached.has(id)),
    edge: (id) => merge(view.classification?.edges.get(id), visited.has(id)),
  }
}

type PageControls = {
  open: ReadonlySet<string>
  toggle: (pageId: string) => void
}

const hasStates = (id: string) =>
  GRAPH.nodes.some((node) => node.parentId === id)

const STATUS_RANK: readonly FlowStatus[] = [
  'active',
  'executed',
  'unvisited',
  'impossible',
]

const strongest = (statuses: readonly FlowStatus[]): FlowStatus =>
  STATUS_RANK.find((status) => statuses.includes(status)) ?? 'unvisited'

function linkStatusOf(
  link: PageLink,
  status: Statuses,
  view: FlowView,
): FlowStatus {
  const raw = status.edge(link.edge.id)
  if (raw !== 'active' && raw !== 'executed') return raw
  const left = view.steps.at(-1)?.from
  if (raw === 'active' && left !== undefined && pageOf(left) === link.from) {
    return 'active'
  }
  const reached =
    link.from === START_ID ||
    ['active', 'executed'].includes(status.node(link.from))
  return reached ? 'executed' : 'unvisited'
}

function toFlowElements(
  layout: GraphLayout,
  status: Statuses,
  pages: PageControls,
  view: FlowView,
): { nodes: Node[]; edges: FlowEdgeType[] } {
  const progress = new Map(
    pageProgressOf(new Set(view.tested), new Set(view.impossible)).map(
      (page) => [page.pageId, page],
    ),
  )

  const nodes = [...layout.nodes].flatMap(([id, box]): Node[] => {
    const node = BY_ID.get(id)
    if (!node) return []
    const container = containerOf(node)
    const common = {
      id,
      position: { x: box.x, y: box.y },
      width: box.width,
      height: box.height,

      measured: { width: box.width, height: box.height },

      handles: [
        {
          type: 'target' as const,
          position: Position.Top,
          x: box.width / 2,
          y: 0,
        },
        {
          type: 'source' as const,
          position: Position.Bottom,
          x: box.width / 2,
          y: box.height,
        },
      ],
      ...(container ? { parentId: container } : {}),
      draggable: false,
      selectable: false,

      domAttributes: { 'aria-roledescription': undefined },
    }
    if (id === START_ID) {
      return [
        {
          ...common,
          type: 'start',
          data: { status: status.node(id) },
        } satisfies StartNodeType,
      ]
    }
    if (container === null) {
      const open = pages.open.has(id) && isExpandable(id)
      const count = progress.get(id)
      return [
        {
          ...common,
          type: 'page',
          data: {
            node,
            status: status.node(id),
            visited: count?.tested ?? 0,
            total: count?.total ?? 0,
            framed: open && hasStates(id),
            initial: layout.initials.get(id) ?? null,
            moves: open
              ? ownMovesOf(id).map((edge) => ({
                  id: edge.id,
                  label: moveOf(edge),
                  status: status.edge(edge.id),
                }))
              : [],
            ...(isExpandable(id)
              ? { toggle: { open, onToggle: () => pages.toggle(id) } }
              : {}),
          },
        } satisfies PageNodeType,
      ]
    }
    const data = { node, status: status.node(id) }
    return [
      hasStates(id)
        ? ({
            ...common,
            type: 'group',
            data: { ...data, initial: layout.initials.get(id) ?? null },
          } satisfies GroupNodeType)
        : ({ ...common, type: 'state', data } satisfies StateNodeType),
    ]
  })

  const edges = [...layout.edges].flatMap(([id, route]): FlowEdgeType[] => {
    const link = PAGE_LINKS.find((candidate) => linkIdOf(candidate) === id)
    const edge = link?.edge ?? EDGE_BY_ID.get(id)
    if (!edge) return []
    const edgeStatus = link
      ? linkStatusOf(link, status, view)
      : strongest((layout.shared.get(id) ?? [id]).map(status.edge))
    return [
      {
        id,
        source: link?.from ?? edge.source,
        target: link?.to ?? edge.target ?? edge.source,
        type: 'flow',

        ariaLabel: 'Arrow',
        domAttributes: { 'aria-hidden': true },
        zIndex: edgeStatus === 'unvisited' ? 0 : 1,
        data: {
          route,
          lines:
            link?.from === START_ID
              ? []
              : linesOf(
                  link
                    ? [edge]
                    : (layout.shared.get(id) ?? [id]).flatMap(
                        (one) => EDGE_BY_ID.get(one) ?? [],
                      ),
                ),
          status: edgeStatus,
        },
      },
    ]
  })
  return { nodes, edges }
}

function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), settled ? delay : 0)
    return () => clearTimeout(timer)
  }, [value, delay, settled])
  return settled
}

type CameraProps = {
  ready: boolean
  layout: GraphLayout
  activeId: string
  pageId: string | null

  still: boolean

  onFramed: () => void
}

const sameView = (one: Viewport, other: Viewport) =>
  Math.abs(one.x - other.x) < 1 &&
  Math.abs(one.y - other.y) < 1 &&
  Math.abs(one.zoom - other.zoom) < 0.001

const resizedPageOf = (
  before: GraphLayout,
  after: GraphLayout,
): string | undefined =>
  PAGES.map((page) => page.id).find((id) => {
    const one = before.absolute.get(id)
    const other = after.absolute.get(id)
    return (
      one !== undefined &&
      other !== undefined &&
      (one.width !== other.width || one.height !== other.height)
    )
  })

function Camera({
  ready,
  layout,
  activeId,
  pageId,
  still,
  onFramed,
}: CameraProps) {
  const flow = useReactFlow()
  const canvas = useStore((state) =>
    state.width && state.height ? `${state.width}x${state.height}` : '',
  )

  const size = useSettled(canvas, 150)

  const resting = useSettled(activeId, HOLD_MS) === activeId
  const last = useRef<{
    page: string | null
    active: string
    size: string
    layout: GraphLayout
  }>(null)

  const overview = useRef<{ view: Viewport; until: number }>(null)

  useEffect(
    () => () => {
      last.current = null
      overview.current = null
    },
    [],
  )

  useEffect(() => {
    if (!ready || !size) return
    const [width = 0, height = 0] = size.split('x').map(Number)
    const previous = last.current
    const newView =
      !previous || previous.page !== pageId || previous.size !== size

    const active =
      newView || resting ? activeId : (previous?.active ?? activeId)
    last.current = { page: pageId, active, size, layout }

    const heldZoom = () => {
      const set = overview.current
      return set && performance.now() < set.until
        ? set.view.zoom
        : flow.getViewport().zoom
    }
    const frameAs = (view: Viewport, move: { duration: number }) => {
      void flow.setViewport(view, move)
      overview.current = {
        view,
        until: performance.now() + move.duration + 100,
      }
    }
    if (newView) {
      const view = overviewOf(
        layout,
        [width, height],
        activeId,
        pageId,
        previous ? heldZoom() : undefined,
      )
      frameAs(view, glide(still || !previous))
      onFramed()
      return
    }
    const moved = previous.active !== active
    const toggled = moved ? undefined : resizedPageOf(previous.layout, layout)
    if (!moved && toggled === undefined) return
    if (toggled !== undefined && toggled !== pageId) {
      const before = previous.layout.absolute.get(toggled)
      const after = layout.absolute.get(toggled)
      if (!before || !after) return
      const { x, y, zoom } = flow.getViewport()
      void flow.setViewport(
        {
          x: x + (before.x - after.x) * zoom,
          y: y + (before.y - after.y) * zoom,
          zoom,
        },
        glide(still),
      )
      return
    }
    const set = overview.current
    const untouched =
      set !== null &&
      (sameView(flow.getViewport(), set.view) || performance.now() < set.until)
    if (untouched) {
      const view = overviewOf(
        layout,
        [width, height],
        activeId,
        pageId,
        set.view.zoom,
      )
      if (!sameView(view, set.view)) frameAs(view, glide(still))
      return
    }
    const view = followOf(
      layout,
      [width, height],
      flow.getViewport(),
      activeId,
      pageId,
    )
    if (view) void flow.setViewport(view, glide(still))
  }, [flow, ready, size, layout, pageId, activeId, resting, still, onFramed])
  return null
}

function revealFocused(target: EventTarget, flow: ReactFlowInstance | null) {
  if (!flow || !(target instanceof Element)) return
  if (!target.matches(':focus-visible')) return
  const canvas = target.closest('.react-flow')
  if (!canvas) return
  canvas.scrollTo(0, 0)
  const view = canvas.getBoundingClientRect()
  const box = target.getBoundingClientRect()
  const inView =
    box.left >= view.left &&
    box.right <= view.right &&
    box.top >= view.top &&
    box.bottom <= view.bottom
  if (inView) return
  const centre = flow.screenToFlowPosition({
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  })
  void flow.setCenter(centre.x, centre.y, {
    zoom: flow.getZoom(),
    ...glide(),
  })
}

function useOpenPages(currentPage: string | null): PageControls {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(
    new Map(),
  )
  const openKey = useMemo(
    () =>
      GRAPH.nodes
        .map((node) => node.id)
        .filter((id) => overrides.get(id) ?? id === currentPage)
        .join('|'),
    [overrides, currentPage],
  )

  const open = useMemo(
    () => new Set(openKey ? openKey.split('|') : []),
    [openKey],
  )
  return useMemo<PageControls>(
    () => ({
      open,
      toggle: (pageId) =>
        setOverrides(
          (current) => new Map([...current, [pageId, !open.has(pageId)]]),
        ),
    }),
    [open],
  )
}

function ZoomControls({
  coarse,
  bounds,
}: {
  coarse: boolean

  bounds: NodeBox
}) {
  const flow = useReactFlow()
  const buttons: readonly {
    icon: IconName
    label: string
    onClick: () => void
  }[] = [
    ...(coarse
      ? []
      : [
          {
            icon: 'add' as const,
            label: 'Zoom in',
            onClick: () => void flow.zoomIn(glide()),
          },
          {
            icon: 'remove' as const,
            label: 'Zoom out',
            onClick: () => void flow.zoomOut(glide()),
          },
        ]),
    {
      icon: 'fullscreen',
      label: 'Fit the model to the view',
      onClick: () => void flow.fitBounds(bounds, { padding: 0.05, ...glide() }),
    },
  ]
  return (
    <Controls
      showZoom={false}
      showFitView={false}
      showInteractive={false}

      className="rounded-[calc(var(--radius-insp)+3px)] border border-insp-border bg-insp-bar"
    >
      {buttons.map(({ icon, label, onClick }) => (
        <ControlButton
          key={icon}
          onClick={onClick}
          aria-label={label}
          className="insp-tip-anchor relative"
        >
          <Icon name={icon} size={18} />
          <Tooltip className="right-auto left-0">{label}</Tooltip>
        </ControlButton>
      ))}
    </Controls>
  )
}

export default function FlowGraphView({
  reading = 'across',
}: {
  reading?: Flow
}) {
  const view = useFlowView()
  const { activeId, pageId } = view
  const pages = useOpenPages(pageId)
  const layout = useMemo(
    () => layoutGraph(pages.open, reading),
    [pages.open, reading],
  )
  const down = reading === 'down'
  const still = holdsStill(isFastPace(view.steps))
  const morph = useMorph(layout, still)
  const elements = useMemo(() => {
    const status = statusesOf(view)
    const { nodes, edges } = toFlowElements(layout, status, pages, view)

    const before = morph.previous
      ? toFlowElements(morph.previous, status, pages, view)
      : null
    const leaving = before
      ? before.nodes
          .filter((node) => !layout.nodes.has(node.id))
          .map((node) => ({ ...node, className: 'node-exit' }))
      : []

    const leavingEdges = before
      ? before.edges
          .filter((edge) => !layout.edges.has(edge.id))
          .map((edge) => ({
            ...edge,
            className: 'edge-exit',
            data: edge.data && { ...edge.data, fade: 'out' as const },
          }))
      : []
    return {
      nodes: [
        ...nodes.map((node) =>
          morph.entering.has(node.id)
            ? { ...node, className: 'node-enter' }
            : node,
        ),
        ...leaving,
      ],

      edges: morph.previous
        ? [
            ...edges.map((edge) =>
              morph.previous?.edges.has(edge.id)
                ? edge
                : {
                    ...edge,
                    className: 'edge-enter',
                    data: edge.data && { ...edge.data, fade: 'in' as const },
                  },
            ),
            ...leavingEdges,
          ]
        : edges,
    }
  }, [layout, pages, view, morph.entering, morph.previous])

  const [flow, setFlow] = useState<ReactFlowInstance | null>(null)
  const [framed, setFramed] = useState(false)
  const onFramed = useCallback(() => setFramed(true), [])

  const [coarse] = useState(() => matchMedia('(pointer: coarse)').matches)

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col"

      style={down ? { width: `min(${sidebarWidth()}px, 50vw)` } : undefined}
    >
      <div
        className={cn(
          'relative min-h-0',
          down
            ? 'flex-1'
            : 'h-(--model-canvas) shrink max-sm:h-(--model-canvas-narrow)',
          !framed && 'invisible',
        )}
        onFocus={(event) => revealFocused(event.target, flow)}
        data-morph={morph.moving || undefined}
        style={
          {
            '--model-move': `${MOVE_MS}ms`,
            '--model-curve': MOVE_CURVE_CSS,
            ...(down ? {} : canvasHeights()),
          } as CSSProperties
        }
      >
        <ReadsDown value={down}>
          <HoldsStill value={still}>
            <ReactFlow
              nodes={elements.nodes}
              edges={elements.edges as Edge[]}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              colorMode="dark"
              minZoom={0.1}
              maxZoom={2}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}

              nodesFocusable={false}
              edgesFocusable={false}
              disableKeyboardA11y
              ariaLabelConfig={ARIA_LABELS}
              zoomOnDoubleClick={false}
              aria-label="The whole model"

              proOptions={{ hideAttribution: true }}
              onInit={setFlow}
            >
              <Camera
                ready={flow !== null}
                layout={layout}
                activeId={activeId}
                pageId={pageId}
                still={still}
                onFramed={onFramed}
              />
              <Grid />
              <ZoomControls coarse={coarse} bounds={layout.bounds} />
            </ReactFlow>
          </HoldsStill>
        </ReadsDown>
      </div>
    </div>
  )
}
