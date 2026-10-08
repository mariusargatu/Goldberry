import type { PageFacts, Snapshot } from '../model.ts'
import type { Probe } from '../pages.ts'
import { POLL_MS, sleep, waitForExpected } from './recognizer.ts'

const SETTLE_MS = 2_000

/** A step's time budget: the settle window, then whatever is left of it. */
export function createStepClock(budgetMs: number) {
  let deadline = Date.now() + budgetMs
  const left = () => Math.max(0, deadline - Date.now())
  return {
    restart(): void {
      deadline = Date.now() + budgetMs
    },
    settleMs: (): number => Math.min(SETTLE_MS, left()),
    restMs: left,
  }
}

export type StepClock = ReturnType<typeof createStepClock>

/**
 * Whether the page shows the prediction within the settle window ('on time'),
 * only later but within the step's budget ('late': the model says nothing
 * about time, so it is noted, not judged), or not at all.
 */
export async function arrival<F extends PageFacts>(
  readFacts: () => Promise<F | null>,
  probes: Readonly<Record<string, Probe<F>>>,
  next: Snapshot,
  clock: StepClock,
): Promise<'on time' | 'late' | 'never'> {
  if (await waitForExpected(readFacts, probes, next, clock.settleMs()))
    return 'on time'
  return (await waitForExpected(readFacts, probes, next, clock.restMs()))
    ? 'late'
    : 'never'
}

/** Facts that read the same twice in a row: the page has settled. */
export async function settledFacts<F extends PageFacts>(
  readFacts: () => Promise<F | null>,
  clock: StepClock,
): Promise<F | null> {
  const until = Date.now() + clock.settleMs()
  let previous = ''
  for (;;) {
    const facts = await readFacts()
    const current = facts === null ? '' : JSON.stringify(facts)
    if (current !== '' && current === previous) return facts
    if (Date.now() >= until) return facts
    previous = current
    await sleep(POLL_MS)
  }
}
