import { initialTransition, transition } from 'xstate'
import {
  describeEvent,
  type Machine,
  type ModelEvent,
  type Snapshot,
  toStateString,
} from './model.ts'

export interface CoverageModel {
  readonly abstractState: (snapshot: Snapshot) => string
}

export interface ModelPath {
  readonly initial: Snapshot
  readonly steps: readonly {
    readonly event: ModelEvent
    readonly state: Snapshot
  }[]
}

/** The longest a path may be. */
const MAX_STEPS = 60
/** How far a walk may detour mid-path to reach an edge it has not taken. */
const MAX_DETOUR = 10

/** An edge of the abstract model: an event from an abstract state. */
export const edgeKey = (
  model: CoverageModel,
  snapshot: Snapshot,
  event: ModelEvent,
): string => `${model.abstractState(snapshot)} --${JSON.stringify(event)}`

const enabledIn = (events: readonly ModelEvent[]) => (snapshot: Snapshot) =>
  events.filter((event) => snapshot.can(event))

const next = (machine: Machine, state: Snapshot, event: ModelEvent) =>
  transition(machine, state, event)[0]

/** One snapshot per abstract state reachable from the start, nearest first. */
function reachableStates(
  machine: Machine,
  events: readonly ModelEvent[],
  model: CoverageModel,
): Snapshot[] {
  const enabled = enabledIn(events)
  const [initial] = initialTransition(machine)
  const seen = new Set([model.abstractState(initial)])
  const queue = [initial]
  for (const state of queue)
    for (const event of enabled(state)) {
      const target = next(machine, state, event)
      const key = model.abstractState(target)
      if (seen.has(key)) continue
      seen.add(key)
      queue.push(target)
    }
  return queue
}

/** Every edge of the abstract model that the start can reach. */
export function allAbstractEdges(
  machine: Machine,
  events: readonly ModelEvent[],
  model: CoverageModel,
): Set<string> {
  const enabled = enabledIn(events)
  return new Set(
    reachableStates(machine, events, model).flatMap((state) =>
      enabled(state).map((event) => edgeKey(model, state, event)),
    ),
  )
}

/** A path from the start: replays the events, failing on one the model refuses. */
function replay(machine: Machine, events: readonly ModelEvent[]): ModelPath {
  const [initial] = initialTransition(machine)
  const steps = events.reduce<{ event: ModelEvent; state: Snapshot }[]>(
    (done, event, index) => {
      const before = done.at(-1)?.state ?? initial
      if (!before.can(event))
        throw new Error(
          `step ${index + 1}: the model does not accept ${describeEvent(event)} in ${toStateString(before.value)}`,
        )
      return [...done, { event, state: next(machine, before, event) }]
    },
    [],
  )
  return { initial, steps }
}

/**
 * Paths that together take every reachable edge. A walk takes an untaken
 * edge where it stands; with none there, it detours to the nearest state
 * that has one; when the detour is missing or the walk would grow past
 * MAX_STEPS, a new walk starts from the beginning. An edge no walk can take
 * within MAX_STEPS makes it refuse, rather than plan around the gap.
 */
export function transitionCoveragePaths(
  machine: Machine,
  events: readonly ModelEvent[],
  model: CoverageModel,
): ModelPath[] {
  const enabled = enabledIn(events)
  const [initial] = initialTransition(machine)
  const untaken = allAbstractEdges(machine, events, model)
  const untakenFrom = (state: Snapshot) =>
    enabled(state).filter((event) => untaken.has(edgeKey(model, state, event)))

  /** The shortest route, at most maxDepth events, to a state with an untaken edge. */
  function detour(from: Snapshot, maxDepth: number): ModelEvent[] | null {
    const seen = new Set([model.abstractState(from)])
    let frontier = [{ state: from, route: [] as ModelEvent[] }]
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
      const further: typeof frontier = []
      for (const { state, route } of frontier)
        for (const event of enabled(state)) {
          const target = next(machine, state, event)
          const key = model.abstractState(target)
          if (seen.has(key)) continue
          seen.add(key)
          if (untakenFrom(target).length > 0) return [...route, event]
          further.push({ state: target, route: [...route, event] })
        }
      frontier = further
    }
    return null
  }

  /** The walk after following the route, its edges marked as taken. */
  function follow(walk: Walk, route: readonly ModelEvent[]): Walk {
    let at = walk.at
    for (const event of route) {
      untaken.delete(edgeKey(model, at, event))
      at = next(machine, at, event)
    }
    return { events: [...walk.events, ...route], at }
  }

  const fresh: Walk = { events: [], at: initial }
  const walks: (readonly ModelEvent[])[] = []
  let walk = fresh
  while (untaken.size > 0) {
    const atStart = walk.events.length === 0
    const [edge] = untakenFrom(walk.at)
    const route =
      edge !== undefined
        ? [edge]
        : detour(walk.at, atStart ? MAX_STEPS : MAX_DETOUR)
    const edgeAfterDetour = edge === undefined ? 1 : 0
    const fits =
      route !== null &&
      walk.events.length + route.length + edgeAfterDetour <= MAX_STEPS
    if (fits) {
      walk = follow(walk, route)
      continue
    }
    if (atStart) break
    walks.push(walk.events)
    walk = fresh
  }
  if (untaken.size > 0)
    throw new Error(`no path takes: ${[...untaken].join('; ')}`)
  if (walk.events.length > 0) walks.push(walk.events)
  return walks.map((sequence) => replay(machine, sequence))
}

interface Walk {
  readonly events: readonly ModelEvent[]
  readonly at: Snapshot
}
