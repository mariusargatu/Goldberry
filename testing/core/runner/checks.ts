import { type Snapshot, stateKeys, toStateString } from '../model.ts'
import type { PageObject } from '../pages.ts'
import { describeFailure } from './failures.ts'
import { watchReads } from './reads.ts'

export interface FailedCheck {
  readonly failure: string
  /** The context values the failing check read, for the case file. */
  readonly read: Readonly<Record<string, unknown>>
}

/**
 * Runs the checks of the snapshot's state and of each state above it, and
 * returns the first failure with what that check read; null when all pass.
 */
export async function runChecks(
  states: PageObject['states'],
  snapshot: Snapshot,
): Promise<FailedCheck | null> {
  let read: Record<string, unknown> = {}
  const context = watchReads(snapshot.context as object, (path, value) => {
    read = { ...read, [path]: value }
  })
  const watched = new Proxy(snapshot, {
    get: (target, property, receiver) =>
      property === 'context'
        ? context
        : Reflect.get(target, property, receiver),
  })
  for (const key of stateKeys(toStateString(snapshot.value))) {
    read = {}
    try {
      await states[key]?.(watched)
    } catch (error) {
      return { failure: describeFailure(error), read }
    }
  }
  return null
}
