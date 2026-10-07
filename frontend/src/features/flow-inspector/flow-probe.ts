import type { AnyActorRef, AnyMachineSnapshot, InspectionEvent } from 'xstate'
import {
  classify,
  type FlowClassification,
  type FlowStatus,
  type LiveFlow,
} from '../../flows/analysis/classify'
import { activeNodeIds, type FlowEdge } from '../../flows/analysis/graph'
import {
  isMachineSnapshot,
  type Session,
  type SessionRecorder,
  type SessionStep,
} from '../../flows/analysis/recorder'
import { stateValueToPath } from '../../flows/state-path'
import {
  expose,
  logModel,
  logRun,
  logStep,
  nextIdsOf,
  parseRun,
  type LiveState,
  type RunInput,
  type StepRecord,
} from './flow-api'
import { doneWords, eventLabel, serviceEventOf } from './flow-copy'
import { BY_ID, EDGE_BY_ID, GRAPH, START_ID } from './graph-model'
import {
  gateOf,
  landingOf,
  nextRowsOf,
  originOf,
  pageOf,
  type Exit,
  type NextRow,
} from './step-model'

export type NextSet = {
  waitingOn: string | null

  exits: readonly Exit[]
  rows: readonly NextRow[]
}

export type FlowView = {
  steps: readonly StepRecord[]

  classification: FlowClassification | null
  state: LiveState

  activeId: string
  pageId: string | null

  covered: readonly string[]
  impossible: readonly string[]

  run: readonly string[] | null

  tested: readonly string[]

  bagEmpty: boolean
  next: NextSet
}

export type FlowProbe = {
  inspect: (event: InspectionEvent) => void
  getView: () => FlowView
  subscribe: (listener: () => void) => () => void
}

const EMPTY_VIEW: FlowView = {
  steps: [],
  classification: null,
  state: { journey: null, checkout: null },
  activeId: START_ID,
  pageId: null,
  covered: [],
  impossible: [],
  run: null,
  tested: [],
  bagEmpty: true,
  next: { waitingOn: null, exits: [], rows: [] },
}

const NO_HISTORY: Session = { steps: [], visited: new Set() }

const exitEdgesOf = (chain: readonly string[]): FlowEdge[] =>
  chain
    .toReversed()
    .flatMap((id) =>
      GRAPH.edges.filter((edge) => edge.source === id && !edge.fromRoot),
    )

function nextSetOf(
  flow: LiveFlow,
  activeId: string,
  covered: ReadonlySet<string>,
): NextSet {
  const now = classify(GRAPH, flow, NO_HISTORY)
  const journeyIds = activeNodeIds('journey', flow.journey.value)
  const checkoutIds = flow.checkout
    ? activeNodeIds('checkout', flow.checkout.value)
    : []
  const exitOf = (edge: FlowEdge, shown: boolean): Exit => ({
    edgeId: edge.id,
    event: eventLabel(edge.event),
    gate: gateOf(edge),
    to: edge.target ? landingOf(edge.target) : activeId,
    status: now.edges.get(edge.id) === 'impossible' ? 'impossible' : 'possible',
    covered: covered.has(edge.id),
    shown,
  })

  const ownEdges = exitEdgesOf(flow.checkout ? checkoutIds : journeyIds)
  const rows = nextRowsOf(ownEdges.map((edge) => exitOf(edge, true)))
  const shownIds = new Set(
    rows.flatMap((row) => row.exits.map((exit) => exit.edgeId)),
  )
  const exits = [
    ...ownEdges.map((edge) => exitOf(edge, shownIds.has(edge.id))),
    ...exitEdgesOf(flow.checkout ? journeyIds : []).map((edge) =>
      exitOf(edge, false),
    ),
    ...GRAPH.edges
      .filter((edge) => edge.fromRoot)
      .map((edge) => exitOf(edge, false)),
  ]

  const waitingOn = BY_ID.get(activeId)?.invokes.length
    ? (ownEdges
        .filter((edge) => edge.source === activeId)
        .map((edge) => serviceEventOf(edge.event)?.invoke)
        .find((invoke) => invoke !== undefined) ?? null)
    : null
  return { waitingOn, exits, rows }
}

function testedOf(
  covered: readonly string[],
  run: readonly string[] | null,
): string[] {
  const tested = new Set([...covered, ...(run ?? [])])
  return GRAPH.edges.map((edge) => edge.id).filter((id) => tested.has(id))
}

const COVERED_STATUSES: ReadonlySet<FlowStatus | undefined> = new Set([
  'active',
  'executed',
])

function analyse(
  flow: LiveFlow,
  session: Session,
  steps: readonly StepRecord[],
  run: readonly string[] | null,
): FlowView {
  const classification = classify(GRAPH, flow, session)
  const statusOf = (edge: FlowEdge) => classification.edges.get(edge.id)
  const covered = GRAPH.edges
    .filter((edge) => COVERED_STATUSES.has(statusOf(edge)))
    .map((edge) => edge.id)
  const journey = stateValueToPath(flow.journey.value)
  const checkout = flow.checkout ? stateValueToPath(flow.checkout.value) : null

  const activeId = checkout ? `checkout.${checkout}` : `journey.${journey}`
  return {
    steps,
    classification,
    state: { journey, checkout },
    activeId,
    pageId: pageOf(activeId),
    covered,
    impossible: GRAPH.edges
      .filter((edge) => statusOf(edge) === 'impossible')
      .map((edge) => edge.id),
    run,
    tested: testedOf(covered, run),
    bagEmpty: flow.journey.context.cart.length === 0,
    next: nextSetOf(flow, activeId, new Set(covered)),
  }
}

function recordOf(
  step: SessionStep,
  before: FlowView,
  product: string | null,
): StepRecord {
  const edge = EDGE_BY_ID.get(step.edge)
  const from = before.steps.at(-1)?.to ?? START_ID
  const predicted = nextIdsOf(before.next.exits)
  return {
    seq: before.steps.length + 1,
    event: eventLabel(step.event),
    words: doneWords(step.edge, product),
    edgeId: step.edge,
    from,

    to: edge?.target ? landingOf(edge.target) : from,
    gate: edge ? gateOf(edge) : null,
    origin: originOf(step.event),
    invoke: serviceEventOf(step.event)?.invoke ?? null,
    newlyCovered: !before.covered.includes(step.edge),
    predicted,
    wasPredicted: predicted.possible.includes(step.edge),
    wasShown: predicted.shown.includes(step.edge),
    at: Math.round(performance.now()),
  }
}

export function createFlowProbe(recorder: SessionRecorder): FlowProbe {
  let view = EMPTY_VIEW
  let run: readonly string[] | null = null
  let started = false
  let broken = false
  let journey: AnyMachineSnapshot | null = null

  const latest = new WeakMap<object, AnyMachineSnapshot>()
  const listeners = new Set<() => void>()
  let notifyQueued = false

  const notify = () => {
    if (notifyQueued) return
    notifyQueued = true
    queueMicrotask(() => {
      notifyQueued = false
      listeners.forEach((listener) => listener())
    })
  }

  const observe = (event: InspectionEvent) => {
    if (event.type !== '@xstate.microstep' && event.type !== '@xstate.snapshot')
      return
    const { snapshot } = event
    if (!isMachineSnapshot(snapshot)) return

    if (snapshot.status !== 'active' && snapshot.status !== 'done') return
    latest.set(event.actorRef, snapshot)
    if (snapshot.machine.id === 'journey') journey = snapshot
  }

  const liveFlow = (): LiveFlow | null => {
    if (!journey) return null
    const child: AnyActorRef | undefined = journey.children.checkout
    const checkout: AnyMachineSnapshot | undefined = child
      ? (latest.get(child) ?? child.getSnapshot())
      : undefined
    return {
      journey: { value: journey.value, context: journey.context },
      checkout: checkout
        ? { value: checkout.value, context: checkout.context }
        : null,
    }
  }

  const catchUp = () => {
    const session = recorder.getSession()
    if (started && view.steps.length === session.steps.length) return
    const flow = liveFlow()
    if (!flow) return
    if (!started) {
      started = true
      view = analyse(flow, { ...session, steps: [] }, [], run)
    }
    const product = flow.journey.context.product?.name ?? null
    for (const step of session.steps.slice(view.steps.length)) {
      const record = recordOf(step, view, product)
      view = analyse(
        flow,
        { ...session, steps: session.steps.slice(0, record.seq) },
        [...view.steps, record],
        run,
      )
      logStep(record, view)
    }
    notify()
  }

  const setRun = (input: RunInput | null) => {
    run = input?.ids ?? null
    view = { ...view, run, tested: testedOf(view.covered, run) }
    logRun(input, view)
    notify()
  }

  const safely = (run: () => void) => {
    if (broken) return
    try {
      run()
    } catch (error) {
      broken = true
      console.error('The flow probe stopped:', error)
    }
  }

  expose(() => view, setRun)
  logModel()

  const preset = parseRun(window.goldberryRun)
  if (preset === 'invalid') {
    console.warn(
      'window.goldberryRun ignored: expected an array of transition ids.',
    )
  } else if (preset) {
    setRun(preset)
  }

  return {
    inspect: (event) => {
      safely(() => observe(event))
      recorder.inspect(event)
      safely(catchUp)
    },
    getView: () => view,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
