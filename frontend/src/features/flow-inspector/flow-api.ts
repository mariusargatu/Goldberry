import { eventLabel } from './flow-copy'
import type { FlowView } from './flow-probe'
import { GRAPH } from './graph-model'
import {
  edgePageOf,
  gateOf,
  landingOf,
  type Exit,
  type StepOrigin,
} from './step-model'

export const FLOW_LOG_PREFIX = 'goldberry-flow'

export const MODEL = {
  states: GRAPH.nodes.length,
  transitions: GRAPH.edges.length,
  tests: GRAPH.edges.length,
} as const

export type NextIds = {
  possible: readonly string[]
  impossible: readonly string[]

  shown: readonly string[]
}

export type StepRecord = {
  seq: number

  event: string

  words: string
  edgeId: string

  from: string

  to: string

  gate: string | null
  origin: StepOrigin

  invoke: string | null

  newlyCovered: boolean

  predicted: NextIds

  wasPredicted: boolean

  wasShown: boolean

  at: number
}

export type LiveState = { journey: string | null; checkout: string | null }

type TransitionInfo = {
  id: string
  event: string
  gate: string | null
  from: string

  to: string | null

  page: string | null
}

export type FlowSnapshot = {
  model: typeof MODEL & { transitionIds: string[] }
  state: LiveState
  steps: StepRecord[]
  covered: string[]
  impossible: string[]

  run: string[] | null

  tested: string[]
  counts: { covered: number; impossible: number; toGo: number; tested: number }
  next: { waitingOn: string | null; exits: Exit[] }
}

export type GoldberryFlowApi = {
  readonly prefix: typeof FLOW_LOG_PREFIX
  snapshot: () => FlowSnapshot

  setRunCoverage: (ids: readonly string[] | null) => void
}

declare global {
  interface Window {
    readonly goldberryFlow?: GoldberryFlowApi

    goldberryRun?: readonly string[]
  }
}

export type RunInput = { ids: readonly string[]; ignored: readonly string[] }

const TRANSITION_IDS: ReadonlySet<string> = new Set(
  GRAPH.edges.map((edge) => edge.id),
)

export function parseRun(value: unknown): RunInput | null | 'invalid' {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    return 'invalid'
  }
  const given = new Set<string>(value)
  return {
    ids: GRAPH.edges.map((edge) => edge.id).filter((id) => given.has(id)),
    ignored: [...given].filter((id) => !TRANSITION_IDS.has(id)),
  }
}

export const nextIdsOf = (exits: readonly Exit[]): NextIds => ({
  possible: exits
    .filter((exit) => exit.status === 'possible')
    .map((exit) => exit.edgeId),
  impossible: exits
    .filter((exit) => exit.status === 'impossible')
    .map((exit) => exit.edgeId),
  shown: exits.filter((exit) => exit.shown).map((exit) => exit.edgeId),
})

function log(line: object): void {
  console.debug(FLOW_LOG_PREFIX, JSON.stringify(line))
}

export function logModel(): void {
  const transitions: TransitionInfo[] = GRAPH.edges.map((edge) => ({
    id: edge.id,
    event: eventLabel(edge.event),
    gate: gateOf(edge),
    from: edge.source,
    to: edge.target ? landingOf(edge.target) : null,
    page: edgePageOf(edge),
  }))
  log({ type: 'ready', model: MODEL, transitions })
}

export function logStep(record: StepRecord, view: FlowView): void {
  log({
    type: 'step',
    step: record,
    state: view.state,
    covered: view.covered,
    impossible: view.impossible,
    next: nextIdsOf(view.next.exits),
  })
}

export function logRun(run: RunInput | null, view: FlowView): void {
  log({
    type: 'run',
    run: run?.ids ?? null,
    ignored: run?.ignored ?? [],
    tested: view.tested.length,
  })
}

function snapshotOf(view: FlowView): FlowSnapshot {
  return structuredClone({
    model: { ...MODEL, transitionIds: GRAPH.edges.map((edge) => edge.id) },
    state: view.state,
    steps: view.steps as StepRecord[],
    covered: view.covered as string[],
    impossible: view.impossible as string[],
    run: view.run as string[] | null,
    tested: view.tested as string[],
    counts: {
      covered: view.covered.length,
      impossible: view.impossible.length,
      toGo: MODEL.transitions - view.covered.length - view.impossible.length,
      tested: view.tested.length,
    },
    next: { waitingOn: view.next.waitingOn, exits: view.next.exits as Exit[] },
  })
}

export function expose(
  getView: () => FlowView,
  setRun: (run: RunInput | null) => void,
): void {
  const api: GoldberryFlowApi = Object.freeze({
    prefix: FLOW_LOG_PREFIX,
    snapshot: () => snapshotOf(getView()),
    setRunCoverage: (ids: unknown) => {
      const run = parseRun(ids)
      if (run === 'invalid') {
        throw new TypeError(
          'goldberryFlow.setRunCoverage takes an array of transition ids, or null',
        )
      }
      setRun(run)
    },
  })
  Object.defineProperty(window, 'goldberryFlow', {
    value: api,
    configurable: true,
    enumerable: true,
    writable: false,
  })
}
