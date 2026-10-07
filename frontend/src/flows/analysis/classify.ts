import type {
  AnyMachineSnapshot,
  AnyStateMachine,
  EventObject,
  StateValue,
} from 'xstate'
import { checkoutMachine, type CheckoutContext } from '../checkout.machine'
import { CHECKOUT_SAMPLES, journeySamples } from '../event-samples'
import { journeyMachine, type JourneyContext } from '../journey.machine'
import {
  activeNodeIds,
  ancestorsOf,
  edgeIdOf,
  type FlowEdge,
  type FlowGraph,
  type FlowMachineId,
  type FlowNode,
} from './graph'
import type { Session } from './recorder'

/** Node and edge status, in priority order. */
export type FlowStatus = 'active' | 'executed' | 'impossible' | 'unvisited'

/** What the running app looks like right now. */
export type LiveFlow = {
  journey: { value: StateValue; context: JourneyContext }
  checkout: { value: StateValue; context: CheckoutContext } | null
}

export type FlowClassification = {
  nodes: ReadonlyMap<string, FlowStatus>
  edges: ReadonlyMap<string, FlowStatus>
}

/** A running machine as XState sees it, with the sample events to try on it. */
type LiveRun = {
  machine: AnyStateMachine
  snapshot: AnyMachineSnapshot
  samples: readonly EventObject[]
}

function liveRuns(live: LiveFlow): Record<FlowMachineId, LiveRun | null> {
  return {
    journey: {
      machine: journeyMachine,
      snapshot: journeyMachine.resolveState(live.journey),
      samples: journeySamples(live.journey.context.cart),
    },
    checkout: live.checkout && {
      machine: checkoutMachine,
      snapshot: checkoutMachine.resolveState(live.checkout),
      samples: CHECKOUT_SAMPLES,
    },
  }
}

/**
 * Whether XState would take `edge` for at least one sample of its event, from
 * the live state with the live data: its guard passes and no earlier branch wins.
 */
function canFire(edge: FlowEdge, run: LiveRun | null): boolean {
  if (!run) return false
  return run.samples.some(
    (event) =>
      event.type === edge.event &&
      run.machine
        .getTransitionData(run.snapshot, event)
        .some((transition) => edgeIdOf(transition) === edge.id),
  )
}

function activeIds(live: LiveFlow): Set<string> {
  return new Set([
    ...activeNodeIds('journey', live.journey.value),
    ...(live.checkout ? activeNodeIds('checkout', live.checkout.value) : []),
  ])
}

/**
 * Every state a transition to `id` activates: its ancestors, the state, then
 * its initial descendants.
 */
function enteredIds(id: string, byId: ReadonlyMap<string, FlowNode>): string[] {
  const descend = (node: FlowNode): FlowNode[] => {
    const initial = node.initialId ? byId.get(node.initialId) : undefined
    return initial ? [initial, ...descend(initial)] : []
  }
  const chain = ancestorsOf(id, byId)
  const target = chain.at(-1)
  return (target ? [...chain, ...descend(target)] : []).map((node) => node.id)
}

/** States reachable from the active ones without an impossible edge. */
function reachableIds(
  graph: FlowGraph,
  active: ReadonlySet<string>,
  impossible: ReadonlySet<string>,
): Set<string> {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const reached = new Set<string>()
  const queue = [...active]
  while (queue.length > 0) {
    const id = queue.pop()
    if (id === undefined || reached.has(id)) continue
    reached.add(id)
    for (const edge of graph.edges) {
      if (edge.source !== id || edge.target === null) continue
      if (impossible.has(edge.id)) continue
      queue.push(...enteredIds(edge.target, byId))
    }
  }
  return reached
}

/** The session's edge ids, oldest first, with repeats of the same edge in a row collapsed. */
function historyOf(session: Session): string[] {
  return session.steps
    .map((step) => step.edge)
    .filter((edge, index, edges) => edge !== edges[index - 1])
}

/**
 * Assigns every node and edge one status from the live state and the
 * session history. "Impossible" means: cannot happen from the current state
 * with the current data.
 */
export function classify(
  graph: FlowGraph,
  live: LiveFlow,
  session: Session,
): FlowClassification {
  const active = activeIds(live)
  const runs = liveRuns(live)
  const impossible = new Set(
    graph.edges
      .filter(
        (edge) => active.has(edge.source) && !canFire(edge, runs[edge.machine]),
      )
      .map((edge) => edge.id),
  )
  const reachable = reachableIds(graph, active, impossible)
  const history = historyOf(session)
  const executed = new Set(history)
  const lastEdge = history.at(-1)

  const nodeStatus = (id: string): FlowStatus => {
    if (active.has(id)) return 'active'
    if (session.visited.has(id)) return 'executed'
    return reachable.has(id) ? 'unvisited' : 'impossible'
  }
  const edgeStatus = (edge: FlowEdge): FlowStatus => {
    if (edge.id === lastEdge) return 'active'
    if (executed.has(edge.id)) return 'executed'
    if (impossible.has(edge.id) || !reachable.has(edge.source)) {
      return 'impossible'
    }
    return 'unvisited'
  }

  return {
    nodes: new Map(graph.nodes.map((node) => [node.id, nodeStatus(node.id)])),
    edges: new Map(graph.edges.map((edge) => [edge.id, edgeStatus(edge)])),
  }
}
