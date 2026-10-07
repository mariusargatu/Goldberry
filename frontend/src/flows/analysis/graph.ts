import type {
  AnyStateMachine,
  AnyStateNode,
  AnyTransitionDefinition,
  StateValue,
} from 'xstate'
import { journeyMachine } from '../journey.machine'
import { stateValueToPath } from '../state-path'

export type FlowMachineId = 'journey' | 'checkout'

export type FlowNodeKind = 'root' | 'compound' | 'atomic' | 'final'

/** A guard as the machines declare it: a name, or a name with params. */
export type GuardRef = string | { type: string; params?: unknown }

export type FlowNode = {
  /** State node id, e.g. `journey.home.ready` or `checkout.payment`. */
  id: string
  /** Dotted path inside its machine (`home.ready`); `''` for the root. */
  path: string
  key: string
  machine: FlowMachineId
  kind: FlowNodeKind
  /** Containing node; a nested machine's top-level states sit inside the invoking state. */
  parentId: string | null
  /** Child entered first (for the invoking state, the nested machine's initial state). */
  initialId: string | null
  /** Actors this state invokes, by source name. */
  invokes: readonly string[]
  /**
   * What the state is, in plain words for a viewer (the machines'
   * `description`, which the Stately editor shows too): sentences, and
   * lines starting `- ` for a list. Null when the state has none.
   */
  description: string | null
}

export type FlowEdge = {
  /** `<source id>#<event>#<branch index>`: stable across `machine.provide()`. */
  id: string
  machine: FlowMachineId
  source: string
  /** `null` when the transition stays in its source state (REMOVE_ITEM). */
  target: string | null
  event: string
  guard: GuardRef | null
  /** `isRoute(home)`, `canAddProduct`, or `null` when unguarded. */
  guardLabel: string | null
  /** Leaves the journey root: a NAVIGATE branch that works from every page. */
  fromRoot: boolean
}

export type FlowGraph = {
  nodes: readonly FlowNode[]
  edges: readonly FlowEdge[]
}

/** Identifies a transition by its source, event and position among that event's branches. */
export function edgeIdOf(transition: AnyTransitionDefinition): string {
  const branches = transition.source.transitions.get(transition.eventType) ?? []
  return `${transition.source.id}#${transition.eventType}#${branches.indexOf(transition)}`
}

/** The machine a node or edge id belongs to. */
export const machineOfId = (id: string): FlowMachineId =>
  id.startsWith('checkout') ? 'checkout' : 'journey'

function isGuardRef(guard: unknown): guard is GuardRef {
  return (
    typeof guard === 'string' ||
    (typeof guard === 'object' && guard !== null && 'type' in guard)
  )
}

/** `isRoute(home)` for static params, `isDeclined` otherwise. */
export function guardLabel(guard: unknown): string | null {
  if (!isGuardRef(guard)) return guard === undefined ? null : 'inline'
  if (typeof guard === 'string') return guard
  const params = guard.params
  if (typeof params !== 'object' || params === null) return guard.type
  return `${guard.type}(${Object.values(params).join(', ')})`
}

function kindOf(node: AnyStateNode): FlowNodeKind {
  if (!node.parent) return 'root'
  if (node.type === 'final') return 'final'
  // The state that runs a nested machine holds that machine's states.
  return node.type === 'compound' || nestedMachineOf(node)
    ? 'compound'
    : 'atomic'
}

function isMachine(logic: unknown): logic is AnyStateMachine {
  return typeof logic === 'object' && logic !== null && 'root' in logic
}

/** The machine a state invokes, if any (the journey's `checkout` state runs the checkout machine). */
function nestedMachineOf(node: AnyStateNode): AnyStateMachine | null {
  const actors: Record<string, unknown> = node.machine.implementations.actors
  for (const invoke of node.invoke) {
    const logic =
      typeof invoke.src === 'string' ? actors[invoke.src] : invoke.src
    if (isMachine(logic)) return logic
  }
  return null
}

function edgesOf(node: AnyStateNode): FlowEdge[] {
  return [...node.transitions.values()].flatMap((branches) =>
    branches.map((transition) => ({
      id: edgeIdOf(transition),
      machine: machineOfId(node.machine.id),
      source: node.id,
      target: transition.target?.[0]?.id ?? null,
      event: transition.eventType,
      guard: (transition.guard as GuardRef | undefined) ?? null,
      guardLabel: guardLabel(transition.guard),
      fromRoot: !node.parent,
    })),
  )
}

function walk(node: AnyStateNode, parentId: string | null): FlowGraph {
  const nested = nestedMachineOf(node)
  const initial = nested ? nested.root.initial : node.initial
  const self: FlowNode = {
    id: node.id,
    path: node.path.join('.'),
    key: node.key,
    machine: machineOfId(node.machine.id),
    kind: kindOf(node),
    parentId,
    initialId: initial?.target[0]?.id ?? null,
    invokes: node.invoke.map((invoke) =>
      typeof invoke.src === 'string' ? invoke.src : invoke.id,
    ),
    description: node.description ?? null,
  }
  const parts = [
    ...Object.values(node.states),
    ...Object.values(nested?.root.states ?? {}),
  ].map((child) => walk(child, node.id))
  return {
    nodes: [self, ...parts.flatMap((part) => part.nodes)],
    edges: [...edgesOf(node), ...parts.flatMap((part) => part.edges)],
  }
}

/**
 * Every state and transition of the journey, with the checkout machine's
 * states nested inside the journey's `checkout` state.
 */
export function buildGraph(
  machine: AnyStateMachine = journeyMachine,
): FlowGraph {
  return walk(machine.root, null)
}

/** Node ids for a machine's current state value, outermost first (the journey root included). */
export function activeNodeIds(
  machine: FlowMachineId,
  value: StateValue,
): string[] {
  const keys = stateValueToPath(value).split('.')
  const ids = keys.map((_, index) =>
    [machine, ...keys.slice(0, index + 1)].join('.'),
  )
  // The checkout machine's root is not a graph node: its states sit inside journey.checkout.
  return machine === 'journey' ? ['journey', ...ids] : ids
}

/** A node's chain from the root down to the node itself. */
export function ancestorsOf(
  id: string,
  byId: ReadonlyMap<string, FlowNode>,
): FlowNode[] {
  const node = byId.get(id)
  if (!node) return []
  return [...(node.parentId ? ancestorsOf(node.parentId, byId) : []), node]
}
