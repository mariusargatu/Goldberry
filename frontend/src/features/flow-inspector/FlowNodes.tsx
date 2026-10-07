import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  Handle,
  Position,
  useStore,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { cn, Icon } from '../../design-system'
import type { FlowStatus } from '../../flows/analysis/classify'
import type { FlowNode } from '../../flows/analysis/graph'
import { descriptionOf, type TextBlock } from './descriptions'
import { DescriptionText } from './DescriptionText'
import { titleOf } from './flow-copy'
import type { Point } from './edge-routes'
import { INITIAL_ARM } from './layout'
import {
  countWords,
  GROUP_HEADER_HEIGHT,
  HEADER_HEIGHT,
  STATE_STRIP,
} from './model-boxes'
import { START_DROP, StartMark, StartMarkDown, StatusDot } from './StatusMarks'
import {
  BOX_CLASSES,
  FRAME_CLASSES,
  isException,
  NAME_CLASSES,
  STATUS_LABELS,
} from './status-styles'
import { Tooltip } from './Tooltip'

type PageMove = { id: string; label: string; status: FlowStatus }

type PageNodeData = {
  node: FlowNode
  status: FlowStatus
  visited: number
  total: number

  framed: boolean

  initial: Point | null

  moves: readonly PageMove[]

  toggle?: { open: boolean; onToggle: () => void }
}

type StateNodeData = { node: FlowNode; status: FlowStatus }

type GroupNodeData = StateNodeData & { initial: Point | null }

export type StartNodeType = Node<{ status: FlowStatus }, 'start'>
export type PageNodeType = Node<PageNodeData, 'page'>
export type GroupNodeType = Node<GroupNodeData, 'group'>
export type StateNodeType = Node<StateNodeData, 'state'>

function Handles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!border-0 !bg-transparent"
      />
    </>
  )
}

const HOVERABLE =
  'pointer-events-auto transition-colors duration-150 ease-out-expo hover:border-insp-hairline-strong'

const HEAD_CORNERS = 'rounded-t-[calc(var(--radius-model)-1px)]'

export function StartNodeView() {
  return (
    <div className="size-full rounded-full bg-insp-muted">
      <Handles />
    </div>
  )
}

export const ReadsDown = createContext(false)

function InitialMarker({ at }: { at: Point }) {
  const down = useContext(ReadsDown)
  const className = 'pointer-events-none absolute text-insp-muted'
  return down ? (
    <StartMarkDown
      arm={INITIAL_ARM}
      className={className}
      style={{ left: at.x - 5, top: at.y - 9 }}
    />
  ) : (
    <StartMark
      arm={INITIAL_ARM}
      className={className}
      style={{ left: at.x - 5, top: at.y - 5 - START_DROP }}
    />
  )
}

function ToggleButton({
  title,
  open,
  onToggle,
}: {
  title: string
  open: boolean
  onToggle: () => void
}) {
  const label = `${open ? 'Hide' : 'Show'} the ${title} steps`
  const zoom = useStore((state) => state.transform[2])
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      className="insp-tip-anchor nodrag nopan pointer-events-auto relative -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-insp text-insp-dim transition-colors duration-150 ease-out-expo hover:bg-insp-text/8 hover:text-insp-text active:bg-insp-text/12"
    >
      <Icon
        name="keyboard_arrow_down"
        size={18}
        className={cn(
          'transition-transform duration-(--model-move) ease-(--model-curve) motion-reduce:transition-none',
          open && 'rotate-180',
        )}
      />
      <Tooltip
        style={{
          transform: `scale(${1 / zoom})`,
          transformOrigin: 'bottom right',
        }}
      >
        {label}
      </Tooltip>
    </button>
  )
}

const HEADER_INSET = 13

const TOGGLE_ROOM = 38

function useTitleInView(
  left: number,
  width: number,
  reserved: number,

  words: string,
) {
  const title = useRef<HTMLSpanElement>(null)
  const [own, setOwn] = useState(0)
  useLayoutEffect(() => {
    setOwn(title.current?.offsetWidth ?? 0)
  }, [words])
  const slide = useSlide(left, width, own, reserved)
  return { title, slide }
}

type Slide = { by: number; gone: boolean }

function useSlide(
  left: number,
  width: number,
  own: number,
  reserved = 0,
): Slide {
  const room = Math.max(0, width - 2 * HEADER_INSET - own - reserved)
  const by = useStore((state) => {
    const [x, , zoom] = state.transform

    return Math.round(Math.min(Math.max(-x / zoom - left, 0), room + 1))
  })
  const cutAtRight = useStore((state) => {
    const [x, , zoom] = state.transform
    const shift = Math.min(Math.max(-x / zoom - left, 0), room)
    const end = (left + HEADER_INSET + shift + own) * zoom + x
    return width > 0 && state.width > 0 && end > state.width + 0.5
  })
  return {
    by: Math.min(by, room),
    gone: width > 0 && (by > room || cutAtRight),
  }
}

const slid = ({ by, gone }: Slide): CSSProperties | undefined =>
  by > 0 || gone
    ? { transform: `translateX(${by}px)`, opacity: gone ? 0 : undefined }
    : undefined

function Count({ visited, total }: { visited: number; total: number }) {
  return (
    <span
      className={cn(
        'text-model-label whitespace-nowrap tabular-nums',
        visited > 0 ? 'text-flow-visited' : 'text-insp-muted',
      )}
    >
      {countWords(visited, total)}
    </span>
  )
}

function ProgressLine({ visited, total }: { visited: number; total: number }) {
  if (visited <= 0 || total <= 0) return null
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-px left-0 h-0.5 bg-flow-visited"
      style={{ width: `${(100 * Math.min(visited, total)) / total}%` }}
    />
  )
}

function Meter({ visited, total }: { visited: number; total: number }) {
  const share = total > 0 ? Math.min(visited, total) / total : 0
  return (
    <span
      aria-hidden
      className="relative h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-insp-hairline"
    >
      {share > 0 && (
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-flow-visited"
          style={{ width: `${100 * share}%` }}
        />
      )}
    </span>
  )
}

function pageSurface(here: boolean, framed: boolean): string {
  if (framed) return here ? 'bg-insp-frame-here' : 'bg-insp-frame'
  return here ? 'bg-insp-node-here shadow-model' : 'bg-insp-node shadow-model'
}

export function PageNodeView({
  data,
  width = 0,
  positionAbsoluteX,
}: NodeProps<PageNodeType>) {
  const { node, status, visited, total, framed, initial, moves, toggle } = data
  const title = titleOf(node.id)
  const here = status === 'active'

  const inView = useTitleInView(
    positionAbsoluteX,
    framed ? width : 0,
    toggle ? TOGGLE_ROOM : 0,
    `${title} ${visited} ${total} ${framed} ${here}`,
  )
  return (
    <div
      className={cn(
        'relative flex size-full flex-col rounded-model border',
        HOVERABLE,
        pageSurface(here, framed),
        FRAME_CLASSES[status],

        !framed && status === 'impossible' && 'flow-impossible-hatch',
      )}
    >
      <Handles />
      {framed && initial && <InitialMarker at={initial} />}
      <div
        className={cn(
          'relative flex shrink-0 items-center gap-2 px-3',
          framed && [
            'border-b border-insp-hairline',
            HEAD_CORNERS,
            here ? 'bg-insp-frame-head-here' : 'bg-insp-frame-head',
          ],
        )}
        style={{ height: HEADER_HEIGHT }}
      >
        <span
          ref={inView.title}
          className="insp-tip-anchor relative flex shrink-0 items-center gap-2"
          style={slid(inView.slide)}
        >
          {here && (
            <span
              aria-hidden
              className="live-dot size-2 shrink-0 rounded-full bg-flow-now"
            />
          )}
          <span
            className={cn(
              'text-model-title font-medium whitespace-nowrap',
              NAME_CLASSES[status],
            )}
          >
            {title}
          </span>
          <span className="sr-only">, {STATUS_LABELS[status]}</span>
          {framed && (
            <span className="ml-1">
              <Count visited={visited} total={total} />
            </span>
          )}
          <Described id={node.id} />
        </span>
        {toggle && (
          <span className="ml-auto flex">
            <ToggleButton
              title={title}
              open={toggle.open}
              onToggle={toggle.onToggle}
            />
          </span>
        )}
        {framed && <ProgressLine visited={visited} total={total} />}
      </div>
      {!framed && (
        <div className="px-3 pb-3">
          <div className="flex h-5 items-center gap-2.5">
            <Count visited={visited} total={total} />
            <Meter visited={visited} total={total} />
          </div>
          {moves.length > 0 && (
            <ul className="pt-1">
              {moves.map((move) => (
                <li
                  key={move.id}
                  className="flex h-6 items-center gap-2 text-model-label whitespace-nowrap"
                >
                  <StatusDot
                    status={move.status}
                    drawnAs={
                      move.status === 'active' ? 'executed' : move.status
                    }
                  />
                  <span
                    className={
                      move.status === 'active'
                        ? 'text-flow-now'
                        : NAME_CLASSES[move.status]
                    }
                  >
                    {move.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function GroupNodeView({
  data,
  width = 0,
  positionAbsoluteX,
}: NodeProps<GroupNodeType>) {
  const status = data.status === 'active' ? 'executed' : data.status
  const inView = useTitleInView(
    positionAbsoluteX,
    width,
    0,
    titleOf(data.node.id),
  )
  return (
    <div
      className={cn(
        'relative flex size-full flex-col rounded-model border',
        HOVERABLE,
        FRAME_CLASSES[status],
      )}
    >
      <Handles />
      {data.initial && <InitialMarker at={data.initial} />}
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-insp-hairline bg-insp-frame-head px-3 text-model-label font-medium whitespace-nowrap text-insp-soft',
          HEAD_CORNERS,
        )}
        style={{ height: GROUP_HEADER_HEIGHT }}
      >
        <span
          ref={inView.title}
          className="insp-tip-anchor relative"
          style={slid(inView.slide)}
        >
          {titleOf(data.node.id)}
          <Described id={data.node.id} />
        </span>
      </div>
    </div>
  )
}

function StateName({ node, status }: StateNodeData) {
  return (
    <>
      <StatusDot status={status} />
      <span className="text-insp-md font-medium whitespace-nowrap">
        {titleOf(node.id)}
      </span>
      {isException(node.key) && (
        <span
          className={cn(
            'text-model-note whitespace-nowrap',
            status === 'impossible' ? 'text-insp-dim' : 'text-insp-muted',
          )}
        >
          error path
        </span>
      )}
    </>
  )
}

function DescriptionCard({ text }: { text: readonly TextBlock[] }) {
  const zoom = useStore((state) => state.transform[2])
  return (
    <Tooltip
      className="right-auto left-1/2"
      style={{
        transform: `translateX(-50%) scale(${1 / zoom})`,
        transformOrigin: 'bottom center',
      }}
    >
      <DescriptionText
        text={text}
        className="p-1 font-normal text-insp-soft"
        leadClass="text-insp-text"
      />
    </Tooltip>
  )
}

function Described({ id }: { id: string }) {
  const text = descriptionOf(id)
  if (!text) return null
  return (
    <>
      <span className="sr-only">
        {text.map((block) => block.text).join(' ')}
      </span>
      <DescriptionCard text={text} />
    </>
  )
}

export function StateNodeView({ data }: NodeProps<StateNodeType>) {
  const { node, status } = data
  return (
    <div
      className={cn(
        'insp-tip-anchor relative flex size-full flex-col rounded-model border',
        HOVERABLE,
        BOX_CLASSES[status],
      )}
    >
      <Handles />
      <div
        className="flex shrink-0 items-center gap-2 px-3"
        style={{ height: STATE_STRIP }}
      >
        <StateName node={node} status={status} />
      </div>
      <Described id={node.id} />
    </div>
  )
}
