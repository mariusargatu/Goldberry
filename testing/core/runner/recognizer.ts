import type { AnyStateNode } from 'xstate'
import {
  type Machine,
  type PageFacts,
  type Snapshot,
  stateKeys,
  toStateString,
} from '../model.ts'
import type { Probe } from '../pages.ts'

type Probes<F extends PageFacts> = Readonly<Record<string, Probe<F>>>

type Recognition =
  | {
      readonly kind: 'state'
      readonly state: string
      readonly context: Readonly<Record<string, unknown>>
    }
  | { readonly kind: 'unrecognised' }
  | { readonly kind: 'ambiguous'; readonly candidates: readonly string[] }

export const POLL_MS = 100

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const isTransient = (node: AnyStateNode): boolean =>
  node.meta?.transient === true

const pathOf = (node: AnyStateNode): string => node.path.join('.')

export function recognize<F extends PageFacts>(
  machine: Machine,
  probes: Probes<F>,
  facts: F,
): Recognition {
  let node: AnyStateNode = machine.root
  let context: Readonly<Record<string, unknown>> = {}
  for (;;) {
    const matches = Object.values(node.states).filter(
      (child) =>
        !isTransient(child) && (probes[pathOf(child)]?.matches(facts) ?? false),
    )
    if (matches.length > 1)
      return { kind: 'ambiguous', candidates: matches.map(pathOf) }
    const [match] = matches
    if (match === undefined) break
    node = match
    context = { ...context, ...probes[pathOf(match)]?.readContext?.(facts) }
  }
  return node === machine.root
    ? { kind: 'unrecognised' }
    : { kind: 'state', state: pathOf(node), context }
}

export async function waitForExpected<F extends PageFacts>(
  readFacts: () => Promise<F | null>,
  probes: Probes<F>,
  expected: Snapshot,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const keys = stateKeys(toStateString(expected.value))
  for (;;) {
    const facts = await readFacts()
    if (
      facts !== null &&
      keys.every((key) => probes[key]?.matches(facts) ?? true)
    )
      return true
    if (Date.now() >= deadline) return false
    await sleep(POLL_MS)
  }
}
