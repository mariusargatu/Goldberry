import type { ModelEvent } from './model.ts'

export const CHANNEL_KEY = '__bombadilModel'
export const BRIDGE = '__bombadilRunner'

export const EVENT_SOURCE = 'the event'

export interface Relied {
  readonly path: string
  readonly value: unknown
  readonly source: string
}

export interface Basis {
  readonly decisions: readonly {
    readonly guard: string
    readonly result: boolean
    readonly read: readonly Relied[]
  }[]

  readonly relied: readonly Relied[]

  readonly context: readonly Relied[]

  readonly page: Readonly<Record<string, unknown>> | null

  readonly journey: readonly string[]
}

export type Verdict =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly kind:
        'unexpected-state' | 'assertion' | 'handler' | 'unrecognised'
      readonly state: string
      readonly event?: ModelEvent
      readonly expected?: readonly string[]
      readonly observed?: string
      readonly message: string

      readonly basis?: Basis
    }

export interface ModelChannel {
  readonly seq: number
  readonly busy: string | null
  readonly state: string
  readonly enabled: readonly ModelEvent[]
  /** How often each enabled event was taken from this abstract state. */
  readonly taken: readonly number[]
  readonly verdict: Verdict
}
