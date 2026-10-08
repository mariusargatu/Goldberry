import {
  type Machine,
  type PageFacts,
  type Snapshot,
  toStateValue,
} from '../model.ts'
import type { Probe } from '../pages.ts'
import { isTransient, POLL_MS, recognize, sleep } from './recognizer.ts'

const UNRECOGNISED_RETRY_MS = 250

type Context = Readonly<Record<string, unknown>>

/** The machine resting in `node` with `context`, or null if that is a transient state. */
export function restingSnapshot(
  machine: Machine,
  node: string,
  context: Context,
): Snapshot | null {
  const resolved = machine.resolveState({ value: toStateValue(node), context })
  return resolved._nodes.some(isTransient) ? null : resolved
}

/**
 * Reads the page until it shows a resting state of the machine, the probes
 * disagree (ambiguous), or the settle window is over.
 */
export async function findRestingState<F extends PageFacts>(
  readFacts: () => Promise<F | null>,
  machine: Machine,
  probes: Readonly<Record<string, Probe<F>>>,
  context: Context,
  settleMs: number,
) {
  const until = Date.now() + settleMs
  for (;;) {
    const facts = await readFacts()
    const result = facts === null ? null : recognize(machine, probes, facts)
    const resting =
      result?.kind === 'state'
        ? restingSnapshot(machine, result.state, {
            ...context,
            ...result.context,
          })
        : null
    if (resting !== null || result?.kind === 'ambiguous' || Date.now() >= until)
      return { facts, result, resting }
    await sleep(
      result?.kind === 'unrecognised' ? UNRECOGNISED_RETRY_MS : POLL_MS,
    )
  }
}
