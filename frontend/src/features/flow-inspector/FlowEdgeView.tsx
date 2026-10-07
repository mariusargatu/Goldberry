import { useState } from 'react'
import {
  EdgeLabelRenderer,
  useStore,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'
import { cn } from '../../design-system'
import type { FlowStatus } from '../../flows/analysis/classify'
import type { EdgeRoute, Point } from './edge-routes'
import type { MoveLine } from './model-boxes'
import { useGlidingRoute } from './model-motion'
import {
  CONDITION_CLASSES,
  EDGE_HOVER_STROKES,
  EDGE_LABEL_CLASSES,
  EDGE_LABEL_HOVER_CLASSES,
  EDGE_STROKES,
} from './status-styles'

type FlowEdgeData = {
  route: EdgeRoute

  lines: readonly MoveLine[]
  status: FlowStatus

  fade?: 'in' | 'out'
}

export type FlowEdgeType = Edge<FlowEdgeData, 'flow'>

const HEAD_LENGTH = 7
const ARROW = `M0,0 L-${HEAD_LENGTH},-3.75 L-${HEAD_LENGTH},3.75 Z`

const STROKE_WIDTH = 1.5

const CORNER = 10

const HOVER_WIDTH = 12

const QUIET_LABEL_ZOOM = 0.5

const at = (point: Point) => `${point.x},${point.y}`

function toward(from: Point, to: Point, r: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  return {
    x: from.x + ((to.x - from.x) / length) * r,
    y: from.y + ((to.y - from.y) / length) * r,
  }
}

function pathOf(points: readonly Point[]): string {
  const elbows = points.slice(1, -1).map((point, index) => {
    const before = points[index] ?? point
    const after = points[index + 2] ?? point
    const r = Math.min(
      CORNER,
      Math.hypot(point.x - before.x, point.y - before.y) / 2,
      Math.hypot(after.x - point.x, after.y - point.y) / 2,
    )
    return `L${at(toward(point, before, r))} Q${at(point)} ${at(toward(point, after, r))}`
  })
  const [first] = points
  const last = points.at(-1)
  return first && last ? `M${at(first)} ${elbows.join(' ')} L${at(last)}` : ''
}

function underHead(points: readonly Point[]): readonly Point[] {
  const [before, end] = points.slice(-2)
  if (!before || !end) return points
  const run = Math.hypot(end.x - before.x, end.y - before.y)
  return [
    ...points.slice(0, -1),
    toward(end, before, Math.min(HEAD_LENGTH - 1, run / 2)),
  ]
}

function arrowAngle(points: readonly Point[]): number {
  const [before, end] = points.slice(-2)
  if (!before || !end) return 0
  return (Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI
}

function dashesOf(
  status: FlowStatus,
  back: boolean,
): string | number | undefined {
  if (status === 'active') return 1
  if (status === 'impossible') return '0.01 3.5'
  return back ? '4 3' : undefined
}

export function FlowEdgeView({ id, data }: EdgeProps<FlowEdgeType>) {
  return data ? <FlowEdgeDrawn id={id} data={data} /> : null
}

function FlowEdgeDrawn({ id, data }: { id: string; data: FlowEdgeData }) {
  const zoomedIn = useStore((state) => state.transform[2] >= QUIET_LABEL_ZOOM)
  const [hovered, setHovered] = useState(false)
  const route = useGlidingRoute(data.route)
  const { lines, status, fade } = data
  const showLabel = lines.length > 0 && (status !== 'unvisited' || zoomedIn)

  const card = lines.length > 1 || lines.some((line) => line.condition)
  const end = route.points.at(-1) ?? { x: 0, y: 0 }
  const stroke = (hovered ? EDGE_HOVER_STROKES : EDGE_STROKES)[status]
  const active = status === 'active'
  const d = pathOf(underHead(route.points))
  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        pathLength={active ? 1 : undefined}
        strokeLinecap={status === 'impossible' ? 'round' : 'butt'}
        className={cn(
          'react-flow__edge-path model-edge',
          active && 'edge-draw',
        )}
        style={{
          stroke,
          strokeWidth: STROKE_WIDTH,
          strokeDasharray: dashesOf(status, route.back ?? false),
        }}
      />
      <path
        d={ARROW}
        transform={`translate(${end.x},${end.y}) rotate(${arrowAngle(route.points)})`}
        className="model-edge"
        style={{ fill: stroke }}
      />

      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={HOVER_WIDTH}
        style={{ pointerEvents: 'stroke' }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan pointer-events-none absolute flex flex-col border px-2.5 whitespace-nowrap transition-colors duration-150 ease-out-expo',
              fade === 'in' && 'edge-enter',
              fade === 'out' && 'edge-exit',
              card
                ? 'items-start rounded-insp-card py-[3px]'
                : 'items-center rounded-full py-px',
              (hovered ? EDGE_LABEL_HOVER_CLASSES : EDGE_LABEL_CLASSES)[status],
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${route.label.x}px, ${route.label.y}px)`,
            }}
          >
            {lines.map((line) => (
              <span key={line.words} className="flex flex-col">
                <span className="text-model-label leading-[1.125rem]">
                  {line.words}
                </span>
                {line.condition && (
                  <span
                    className={cn(
                      'text-model-note leading-4',
                      CONDITION_CLASSES[status],
                    )}
                  >
                    {line.condition}
                  </span>
                )}
              </span>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
