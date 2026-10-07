import type { AnyMachineSnapshot, InspectionEvent } from 'xstate'
import { activeNodeIds, edgeIdOf, machineOfId } from './graph'

/** One transition the running app took. */
export type SessionStep = {
  edge: string
  event: string
}

/** Everything the session did since page load. Nothing is persisted. */
export type Session = {
  steps: readonly SessionStep[]
  /** Every state node entered, by id. */
  visited: ReadonlySet<string>
}

export type SessionRecorder = {
  /** Pass as the root actor's `inspect` option. */
  inspect: (event: InspectionEvent) => void
  getSession: () => Session
  subscribe: (listener: () => void) => () => void
}

/** A state machine's snapshot, as opposed to a promise or callback actor's. */
export function isMachineSnapshot(
  snapshot: unknown,
): snapshot is AnyMachineSnapshot {
  return (
    typeof snapshot === 'object' && snapshot !== null && 'machine' in snapshot
  )
}

/** Records transitions and visited states of the journey and its checkout child. */
export function createSessionRecorder(): SessionRecorder {
  let session: Session = { steps: [], visited: new Set() }
  const listeners = new Set<() => void>()

  const publish = (next: Session) => {
    session = next
    listeners.forEach((listener) => listener())
  }

  const recordSteps = (steps: SessionStep[]) => {
    if (steps.length > 0) {
      publish({ ...session, steps: [...session.steps, ...steps] })
    }
  }

  const recordVisit = (snapshot: AnyMachineSnapshot) => {
    const ids = activeNodeIds(machineOfId(snapshot.machine.id), snapshot.value)
    if (ids.every((id) => session.visited.has(id))) return
    publish({ ...session, visited: new Set([...session.visited, ...ids]) })
  }

  return {
    inspect: (event) => {
      // `_transitions` is typed but underscore-prefixed: re-check it on XState upgrades.
      if (event.type === '@xstate.microstep') {
        recordSteps(
          event._transitions
            .filter((transition) => transition.eventType !== '')
            .map((transition) => ({
              edge: edgeIdOf(transition),
              event: transition.eventType,
            })),
        )
      }
      if (
        event.type === '@xstate.snapshot' &&
        isMachineSnapshot(event.snapshot)
      ) {
        recordVisit(event.snapshot)
      }
    },
    getSession: () => session,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
