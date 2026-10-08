import type { AnyMachineSnapshot, AnyStateMachine, StateValue } from 'xstate'

export type Machine = AnyStateMachine
export type Snapshot = AnyMachineSnapshot

export interface ModelEvent {
  readonly type: string
  readonly data: unknown
}

export interface PageFacts {
  readonly url: string
}

export interface GuardArgs {
  readonly context: object
  readonly event: ModelEvent
}

export type GuardPredicate = (args: GuardArgs) => boolean

export type GuardWrapper = (
  name: string,
  guard: GuardPredicate,
) => GuardPredicate

export function wrapGuards<G extends Record<string, (args: never) => boolean>>(
  guards: G,
  wrap: GuardWrapper = (_name, guard) => guard,
): G {
  const entries = Object.entries(guards).map(([name, guard]) => [
    name,
    wrap(name, guard as unknown as GuardPredicate),
  ])
  return Object.fromEntries(entries) as G
}

export const describeEvent = (event: ModelEvent | undefined): string =>
  event === undefined
    ? 'the last step'
    : event.data === null
      ? event.type
      : `${event.type}(${JSON.stringify(event.data)})`

export function toStateString(value: StateValue): string {
  if (typeof value === 'string') return value
  const [key, child] = Object.entries(value)[0] ?? []
  if (key === undefined) return ''
  return child === undefined
    ? key
    : `${key}.${toStateString(child as StateValue)}`
}

export function toStateValue(path: string): StateValue {
  const parts = path.split('.')
  return parts
    .slice(0, -1)
    .reduceRight<StateValue>(
      (child, key) => ({ [key]: child }),
      parts.at(-1) ?? '',
    )
}

export function stateKeys(path: string): string[] {
  const parts = path.split('.')
  return parts.map((_, index) => parts.slice(0, index + 1).join('.'))
}
