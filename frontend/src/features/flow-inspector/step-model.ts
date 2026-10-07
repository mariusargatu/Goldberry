import { ancestorsOf, type FlowEdge } from '../../flows/analysis/graph'
import { serviceEventOf } from './flow-copy'
import { BY_ID, GRAPH } from './graph-model'

export function landingOf(id: string): string {
  const initial = BY_ID.get(id)?.initialId
  return initial ? landingOf(initial) : id
}

export function pageOf(id: string): string | null {
  return ancestorsOf(id, BY_ID)[1]?.id ?? null
}

const branchOf = (edgeId: string) => Number(edgeId.split('#').at(-1))

function fallbackGateOf(edge: FlowEdge): string | null {
  const guards = GRAPH.edges
    .filter(
      (other) =>
        other.source === edge.source &&
        other.event === edge.event &&
        branchOf(other.id) < branchOf(edge.id),
    )
    .flatMap((other) => (other.guardLabel ? [other.guardLabel] : []))

  if (guards.length === 0) return null
  return guards.length === 1 ? `not ${guards[0]}` : 'otherwise'
}

const GATES: ReadonlyMap<string, string | null> = new Map(
  GRAPH.edges.map((edge) => [edge.id, edge.guardLabel ?? fallbackGateOf(edge)]),
)

export const gateOf = (edge: FlowEdge): string | null =>
  GATES.get(edge.id) ?? null

export type StepOrigin = 'ui' | 'done' | 'error'

export function originOf(event: string): StepOrigin {
  return serviceEventOf(event)?.result ?? 'ui'
}

type PageGroup = { pageId: string; edges: readonly FlowEdge[] }

export const edgePageOf = (edge: FlowEdge): string | null =>
  pageOf(edge.fromRoot && edge.target ? edge.target : edge.source)

const PAGES: readonly PageGroup[] = GRAPH.nodes
  .filter((node) => node.parentId !== null && pageOf(node.id) === node.id)
  .map((page) => ({
    pageId: page.id,
    edges: GRAPH.edges.filter((edge) => edgePageOf(edge) === page.id),
  }))
  .filter((group) => group.edges.length > 0)

export type PageProgress = {
  pageId: string
  tested: number
  total: number

  blockedBy: FlowEdge | null
}

export function pageProgressOf(
  tested: ReadonlySet<string>,
  impossible: ReadonlySet<string>,
): PageProgress[] {
  return PAGES.map(({ pageId, edges }) => {
    const untested = edges.filter((edge) => !tested.has(edge.id))
    const blocked =
      untested.length > 0 && untested.every((edge) => impossible.has(edge.id))
    const wayIn = edges.find((edge) => edge.fromRoot)
    const shut = wayIn && impossible.has(wayIn.id) ? wayIn : undefined
    return {
      pageId,
      tested: edges.length - untested.length,
      total: edges.length,
      blockedBy: blocked ? (shut ?? untested[0] ?? null) : null,
    }
  })
}

export type Exit = {
  edgeId: string

  event: string
  gate: string | null

  to: string

  status: 'possible' | 'impossible'
  covered: boolean

  shown: boolean
}

export type NextRow = { event: string; exits: readonly Exit[] }

const MAX_ROWS = 4

const FOLD_AT = 3

export function nextRowsOf(exits: readonly Exit[]): NextRow[] {
  const events = [...new Set(exits.map((exit) => exit.event))]
  return events
    .flatMap((event) => {
      const branches = exits.filter((exit) => exit.event === event)
      return branches.length >= FOLD_AT
        ? [{ event, exits: branches }]
        : branches.map((exit) => ({ event, exits: [exit] }))
    })
    .slice(0, MAX_ROWS)
}

const FAST_WINDOW_MS = 600
const FAST_STEPS = 3

const QUIET_MS = 1000

const SAME_BEAT_MS = 16

type Timed = { at: number }

const sameBeat = (a: Timed, b: Timed): boolean =>
  Math.abs(a.at - b.at) <= SAME_BEAT_MS

export function isFastPace(steps: readonly Timed[]): boolean {
  const beats = steps.filter((step, index) => {
    const previous = steps[index - 1]
    return previous === undefined || !sameBeat(previous, step)
  })
  return beats.reduce<boolean>((fast, beat, index) => {
    const third = beats[index - (FAST_STEPS - 1)]
    const previous = beats[index - 1]
    return (
      (third !== undefined && beat.at - third.at <= FAST_WINDOW_MS) ||
      (fast && previous !== undefined && beat.at - previous.at < QUIET_MS)
    )
  }, false)
}
