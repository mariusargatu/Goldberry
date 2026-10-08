import type { ModelEvent, PageFacts, Snapshot } from './model.ts'

export type StateCheck<S = Snapshot> = (snapshot: S) => Promise<void>

export type EventHandler<S = Snapshot, E extends ModelEvent = ModelEvent> = (
  event: E,
  snapshot: S,
) => Promise<void>

export interface Probe<F extends PageFacts = PageFacts, C = object> {
  matches(facts: F): boolean
  readContext?(facts: F): Partial<C>
}

export interface PageObject<S = Snapshot, E extends ModelEvent = ModelEvent> {
  readonly states: Readonly<Record<string, StateCheck<S>>>
  readonly events: Readonly<Partial<Record<string, EventHandler<S, E>>>>
}

export interface PageModule<
  F extends PageFacts = PageFacts,
  S = Snapshot,
  E extends ModelEvent = ModelEvent,
  C = object,
> extends PageObject<S, E> {
  readonly probes: Readonly<Record<string, Probe<F, C>>>
}

function mergeUnique<T>(
  what: string,
  maps: readonly Readonly<Record<string, T>>[],
): Readonly<Record<string, T>> {
  const entries = maps.flatMap((map) => Object.entries(map))
  const keys = entries.map(([key]) => key)
  const duplicate = keys.find((key, index) => keys.indexOf(key) !== index)
  if (duplicate !== undefined)
    throw new Error(`two page objects define ${what} "${duplicate}"`)
  return Object.freeze(Object.fromEntries(entries))
}

export function mergePages<F extends PageFacts, S, E extends ModelEvent, C>(
  objects: readonly PageObject<S, E>[],
  probes: Readonly<Record<string, Probe<F, C>>>,
): PageModule<F, S, E, C> {
  return {
    states: mergeUnique(
      'state',
      objects.map((object) => object.states),
    ),
    events: mergeUnique(
      'event',
      objects.map((object) => object.events),
    ) as PageObject<S, E>['events'],
    probes,
  }
}
